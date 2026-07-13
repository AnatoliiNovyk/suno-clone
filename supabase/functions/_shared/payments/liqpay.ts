import {
  base64ToUtf8,
  CheckoutParams,
  CheckoutResult,
  PaymentProvider,
  sha1Base64,
  timingSafeEqual,
  utf8ToBase64,
  WebhookEvent,
} from './provider.ts';

// LiqPay (PrivatBank) — primary gateway for UAH; also supports USD/EUR.
// Protocol: params → base64(JSON) `data`, `signature` = base64(sha1(private + data + private)).
// Docs: https://www.liqpay.ua/documentation/api/aquiring/checkout/doc

function liqpayKeys(): { publicKey: string; privateKey: string } {
  const publicKey = Deno.env.get('LIQPAY_PUBLIC_KEY');
  const privateKey = Deno.env.get('LIQPAY_PRIVATE_KEY');
  if (!publicKey || !privateKey) {
    throw new Error('LIQPAY_PUBLIC_KEY / LIQPAY_PRIVATE_KEY are not configured');
  }
  return { publicKey, privateKey };
}

async function sign(privateKey: string, data: string): Promise<string> {
  return await sha1Base64(privateKey + data + privateKey);
}

export const liqpayProvider: PaymentProvider = {
  key: 'liqpay',
  supportedCurrencies: ['UAH', 'USD', 'EUR'],

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const { publicKey, privateKey } = liqpayKeys();
    const orderId = crypto.randomUUID();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const startDate =
      `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ` +
      `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;

    const payload = {
      version: '3',
      public_key: publicKey,
      action: 'subscribe',
      amount: (params.amountMinor / 100).toFixed(2),
      currency: params.currency,
      description: `Suno ${params.planName} Plan (${params.interval})`,
      order_id: orderId,
      subscribe: '1',
      subscribe_date_start: startDate,
      subscribe_periodicity: params.interval, // 'month' | 'year'
      result_url: params.successUrl,
      server_url: params.webhookUrl,
      language: 'uk',
      // Passed back verbatim in the server callback — carries our own context.
      info: JSON.stringify({
        plan_key: params.planKey,
        currency: params.currency,
        interval: params.interval,
        email: params.customerEmail,
        user_id: params.userId ?? null,
      }),
    };

    const data = utf8ToBase64(JSON.stringify(payload));
    const signature = await sign(privateKey, data);
    const checkoutUrl =
      `https://www.liqpay.ua/api/3/checkout?data=${encodeURIComponent(data)}` +
      `&signature=${encodeURIComponent(signature)}`;

    return { checkoutUrl, providerRef: orderId };
  },

  async verifyWebhook(req: Request): Promise<WebhookEvent> {
    const { privateKey } = liqpayKeys();

    // LiqPay posts application/x-www-form-urlencoded with `data` and `signature`.
    const form = await req.formData();
    const data = String(form.get('data') ?? '');
    const signature = String(form.get('signature') ?? '');
    if (!data || !signature) throw new Error('Missing LiqPay data/signature');

    const expected = await sign(privateKey, data);
    if (!timingSafeEqual(expected, signature)) {
      throw new Error('Invalid LiqPay webhook signature');
    }

    const callback = JSON.parse(base64ToUtf8(data));
    let info: Record<string, unknown> = {};
    try {
      info = callback.info ? JSON.parse(String(callback.info)) : {};
    } catch {
      info = {};
    }

    const status = String(callback.status ?? '');
    const completedStatuses = ['success', 'subscribed', 'active', 'sandbox'];
    const cancelledStatuses = ['unsubscribed', 'canceled', 'cancelled'];

    if (completedStatuses.includes(status)) {
      return {
        type: 'payment_completed',
        userId: info.user_id ? String(info.user_id) : undefined,
        email: String(info.email ?? callback.sender_email ?? ''),
        planKey: String(info.plan_key ?? 'pro'),
        currency: String(callback.currency ?? info.currency ?? 'UAH').toUpperCase(),
        amountMinor: Math.round(Number(callback.amount ?? 0) * 100),
        interval: String(info.interval ?? 'month'),
        providerCustomerId: callback.sender_email || undefined,
        providerSubscriptionId: String(callback.order_id ?? ''),
      };
    }
    if (cancelledStatuses.includes(status)) {
      return {
        type: 'subscription_cancelled',
        providerSubscriptionId: String(callback.order_id ?? ''),
      };
    }
    return { type: 'ignored', reason: `Unhandled LiqPay status: ${status}` };
  },
};
