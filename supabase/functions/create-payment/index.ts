import { Currency, getProvider, Interval } from '../_shared/payments/index.ts';

// Provider-agnostic checkout: { provider, planKey, currency, interval, customerEmail, userId? }
// Prices come from the plan_prices table (single source of truth), never from the client.
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { provider, planKey, currency, interval, customerEmail, userId, merchantId } =
      await req.json();

    if (!provider || !planKey || !currency || !customerEmail) {
      throw new Error('provider, planKey, currency and customerEmail are required');
    }

    const impl = getProvider(String(provider));
    if (!impl) throw new Error(`Unknown payment provider: ${provider}`);

    const normalizedCurrency = String(currency).toUpperCase() as Currency;
    if (!impl.supportedCurrencies.includes(normalizedCurrency)) {
      throw new Error(`${impl.key} does not support ${normalizedCurrency}`);
    }
    const normalizedInterval = (interval === 'year' ? 'year' : 'month') as Interval;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const siteUrl = Deno.env.get('SITE_URL');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase env is not configured');
    if (!siteUrl) throw new Error('SITE_URL is not configured');

    const restHeaders = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    };

    // Look up the plan and its fixed price for the requested currency/interval.
    const planResp = await fetch(
      `${supabaseUrl}/rest/v1/plans?key=eq.${encodeURIComponent(planKey)}&active=eq.true&select=key,name`,
      { headers: restHeaders },
    );
    const [plan] = await planResp.json();
    if (!plan) throw new Error(`Unknown plan: ${planKey}`);

    const priceResp = await fetch(
      `${supabaseUrl}/rest/v1/plan_prices?plan_key=eq.${encodeURIComponent(planKey)}` +
        `&currency=eq.${normalizedCurrency}&interval=eq.${normalizedInterval}&select=amount_minor`,
      { headers: restHeaders },
    );
    const [price] = await priceResp.json();
    if (!price) {
      throw new Error(`No price configured for ${planKey}/${normalizedCurrency}/${normalizedInterval}`);
    }

    const result = await impl.createCheckout({
      planKey: plan.key,
      planName: plan.name,
      currency: normalizedCurrency,
      interval: normalizedInterval,
      amountMinor: price.amount_minor,
      customerEmail,
      userId,
      merchantId,
      siteUrl,
      webhookUrl: `${supabaseUrl}/functions/v1/payments-webhook?provider=${impl.key}`,
    });

    return new Response(
      JSON.stringify({
        data: {
          checkoutUrl: result.checkoutUrl,
          providerRef: result.providerRef,
          provider: impl.key,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Payment creation error:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'PAYMENT_FAILED',
          message: error instanceof Error ? error.message : 'Payment creation failed',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
