import { Currency, getProvider, Interval } from '../_shared/payments/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface AuthUser {
  id: string;
  email: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireUser(supabaseUrl: string, authApiKey: string, req: Request): Promise<AuthUser> {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Authorization Bearer token required');
  }

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey': authApiKey,
      'Authorization': authHeader,
    },
  });

  if (!userResp.ok) {
    throw new HttpError(401, 'INVALID_SESSION', 'Invalid or expired session');
  }

  const user = await userResp.json();
  if (!user?.id || !user?.email) {
    throw new HttpError(401, 'INVALID_SESSION', 'Session has no billable user email');
  }

  return { id: String(user.id), email: String(user.email) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(
      { error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required' } },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authApiKey =
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('VITE_SUPABASE_ANON_KEY') ?? serviceRoleKey;
    const siteUrl = Deno.env.get('SITE_URL');

    if (!supabaseUrl || !serviceRoleKey || !authApiKey) {
      throw new Error('Supabase env is not configured');
    }
    if (!siteUrl) throw new Error('SITE_URL is not configured');

    const user = await requireUser(supabaseUrl, authApiKey, req);
    const { provider, planKey, currency, interval, merchantId } = await req.json();

    if (!provider || !planKey || !currency) {
      throw new HttpError(400, 'INVALID_REQUEST', 'provider, planKey and currency are required');
    }

    const impl = getProvider(String(provider));
    if (!impl) {
      throw new HttpError(400, 'UNKNOWN_PROVIDER', `Unknown payment provider: ${provider}`);
    }

    const normalizedCurrency = String(currency).toUpperCase() as Currency;
    if (!impl.supportedCurrencies.includes(normalizedCurrency)) {
      throw new HttpError(
        400,
        'UNSUPPORTED_CURRENCY',
        `${impl.key} does not support ${normalizedCurrency}`,
      );
    }
    const normalizedInterval = (interval === 'year' ? 'year' : 'month') as Interval;

    const restHeaders = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    };

    let verifiedMerchantId: string | undefined;
    if (merchantId) {
      const merchantResp = await fetch(
        `${supabaseUrl}/rest/v1/merchants?id=eq.${encodeURIComponent(String(merchantId))}` +
          '&select=id,owner_user_id,status',
        { headers: restHeaders },
      );
      if (!merchantResp.ok) throw new Error(`Failed to validate merchant: ${merchantResp.status}`);

      const [merchant] = await merchantResp.json();
      if (!merchant || merchant.owner_user_id !== user.id || merchant.status !== 'approved') {
        throw new HttpError(403, 'MERCHANT_FORBIDDEN', 'Merchant is not available for this user');
      }
      verifiedMerchantId = String(merchant.id);
    }

    const planResp = await fetch(
      `${supabaseUrl}/rest/v1/plans?key=eq.${encodeURIComponent(String(planKey))}` +
        '&active=eq.true&select=key,name',
      { headers: restHeaders },
    );
    if (!planResp.ok) throw new Error(`Failed to load plan: ${planResp.status}`);

    const [plan] = await planResp.json();
    if (!plan) throw new HttpError(400, 'UNKNOWN_PLAN', `Unknown plan: ${planKey}`);

    const priceResp = await fetch(
      `${supabaseUrl}/rest/v1/plan_prices?plan_key=eq.${encodeURIComponent(String(planKey))}` +
        `&currency=eq.${normalizedCurrency}&interval=eq.${normalizedInterval}&select=amount_minor`,
      { headers: restHeaders },
    );
    if (!priceResp.ok) throw new Error(`Failed to load price: ${priceResp.status}`);

    const [price] = await priceResp.json();
    if (!price) {
      throw new HttpError(
        400,
        'PRICE_NOT_CONFIGURED',
        `No price configured for ${planKey}/${normalizedCurrency}/${normalizedInterval}`,
      );
    }

    const successUrl = new URL('/profile?success=true', siteUrl).toString();
    const cancelUrl = new URL('/payment', siteUrl);
    cancelUrl.searchParams.set('plan', String(planKey));
    cancelUrl.searchParams.set('interval', normalizedInterval);
    cancelUrl.searchParams.set('currency', normalizedCurrency);
    cancelUrl.searchParams.set('subscription', 'cancelled');

    const result = await impl.createCheckout({
      planKey: plan.key,
      planName: plan.name,
      currency: normalizedCurrency,
      interval: normalizedInterval,
      amountMinor: price.amount_minor,
      customerEmail: user.email,
      userId: user.id,
      merchantId: verifiedMerchantId,
      siteUrl,
      successUrl,
      cancelUrl: cancelUrl.toString(),
      webhookUrl: `${supabaseUrl}/functions/v1/payments-webhook?provider=${impl.key}`,
    });

    return jsonResponse({
      data: {
        checkoutUrl: result.checkoutUrl,
        providerRef: result.providerRef,
        provider: impl.key,
      },
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    const status = error instanceof HttpError ? error.status : 500;
    const code = error instanceof HttpError ? error.code : 'PAYMENT_FAILED';

    return jsonResponse(
      {
        error: {
          code,
          message: error instanceof Error ? error.message : 'Payment creation failed',
        },
      },
      status,
    );
  }
});
