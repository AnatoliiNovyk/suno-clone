import {
  CheckoutParams,
  CheckoutResult,
  hmacSha256Hex,
  PaymentProvider,
  timingSafeEqual,
  WebhookEvent,
} from './provider.ts';

// Stripe Checkout via raw REST (no SDK), with real webhook signature verification.
export const stripeProvider: PaymentProvider = {
  key: 'stripe',
  supportedCurrencies: ['USD', 'EUR'],

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');

    const body = new URLSearchParams({
      'mode': 'subscription',
      'customer_email': params.customerEmail,
      'success_url': params.successUrl,
      'cancel_url': params.cancelUrl,
      'line_items[0][price_data][currency]': params.currency.toLowerCase(),
      'line_items[0][price_data][product_data][name]': `Suno ${params.planName} Plan`,
      'line_items[0][price_data][unit_amount]': String(params.amountMinor),
      'line_items[0][price_data][recurring][interval]': params.interval,
      'line_items[0][quantity]': '1',
      'metadata[plan_key]': params.planKey,
      'metadata[currency]': params.currency,
      'metadata[interval]': params.interval,
      'metadata[user_id]': params.userId,
    });

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const session = await resp.json();
    if (!resp.ok || session.error) {
      throw new Error(session.error?.message || `Stripe error (${resp.status})`);
    }
    return { checkoutUrl: session.url, providerRef: session.id };
  },

  async verifyWebhook(req: Request): Promise<WebhookEvent> {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');

    const payload = await req.text();
    const header = req.headers.get('stripe-signature') || '';
    const parts = new Map(
      header.split(',').map((kv) => kv.split('=', 2) as [string, string]),
    );
    const timestamp = parts.get('t');
    const signature = parts.get('v1');
    if (!timestamp || !signature) throw new Error('Missing Stripe signature header');

    const expected = await hmacSha256Hex(webhookSecret, `${timestamp}.${payload}`);
    if (!timingSafeEqual(expected, signature)) {
      throw new Error('Invalid Stripe webhook signature');
    }

    // Reject events older than 5 minutes to limit replay.
    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
      throw new Error('Stale Stripe webhook timestamp');
    }

    const event = JSON.parse(payload);
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object ?? {};
      const metadata = session.metadata ?? {};
      return {
        type: 'payment_completed',
        userId: metadata.user_id || undefined,
        email: session.customer_details?.email || session.customer_email || '',
        planKey: metadata.plan_key || metadata.plan_type || 'pro',
        currency: (metadata.currency || session.currency || 'USD').toUpperCase(),
        amountMinor: session.amount_total ?? 0,
        interval: metadata.interval || 'month',
        providerCustomerId: session.customer || undefined,
        providerSubscriptionId: session.subscription || undefined,
      };
    }
    if (event.type === 'customer.subscription.deleted') {
      return {
        type: 'subscription_cancelled',
        providerSubscriptionId: event.data?.object?.id || '',
      };
    }
    return { type: 'ignored', reason: `Unhandled Stripe event: ${event.type}` };
  },
};
