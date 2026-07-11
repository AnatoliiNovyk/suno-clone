import { getProvider } from '../_shared/payments/index.ts';

// Unified, signature-verified webhook for all payment providers.
// Route: /payments-webhook?provider=stripe|liqpay
Deno.serve(async (req) => {
  try {
    const providerKey = new URL(req.url).searchParams.get('provider') ?? '';
    const impl = getProvider(providerKey);
    if (!impl) {
      return new Response(JSON.stringify({ error: `Unknown provider: ${providerKey}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Throws on a missing/invalid signature — unverified events never reach the DB.
    const event = await impl.verifyWebhook(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase env is not configured');

    const restHeaders = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };

    if (event.type === 'payment_completed') {
      let profileId = event.userId;

      if (profileId) {
        const profileResp = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}&select=id`,
          { headers: restHeaders },
        );
        if (!profileResp.ok) throw new Error(`Failed to load profile: ${profileResp.status}`);

        const [profile] = await profileResp.json();
        if (!profile) throw new Error(`No profile for user_id ${profileId}`);
        profileId = profile.id;
      } else {
        if (!event.email) throw new Error('Webhook event has no user_id or customer email');

        // Legacy fallback for old checkout sessions created before user_id metadata.
        const profileResp = await fetch(
          `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(event.email)}&select=id`,
          { headers: restHeaders },
        );
        if (!profileResp.ok) throw new Error(`Failed to load profile: ${profileResp.status}`);

        const [profile] = await profileResp.json();
        if (!profile) throw new Error(`No profile for email ${event.email}`);
        profileId = profile.id;
      }

      // Credits come from the plans table — single source of truth.
      const planResp = await fetch(
        `${supabaseUrl}/rest/v1/plans?key=eq.${encodeURIComponent(event.planKey)}&select=monthly_credits`,
        { headers: restHeaders },
      );
      const [plan] = await planResp.json();
      if (!plan) throw new Error(`Unknown plan in webhook: ${event.planKey}`);

      const patchResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profileId}`, {
        method: 'PATCH',
        headers: restHeaders,
        body: JSON.stringify({ plan: event.planKey, credits: plan.monthly_credits }),
      });
      if (!patchResp.ok) throw new Error(`Failed to update profile: ${patchResp.status}`);

      const insertResp = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
        method: 'POST',
        headers: restHeaders,
        body: JSON.stringify({
          user_id: profileId,
          plan: event.planKey,
          provider: providerKey,
          currency: event.currency,
          amount_minor: event.amountMinor,
          interval: event.interval,
          provider_customer_id: event.providerCustomerId ?? null,
          provider_subscription_id: event.providerSubscriptionId ?? null,
          merchant_id: event.merchantId ?? null,
          status: 'active',
        }),
      });
      if (!insertResp.ok) throw new Error(`Failed to insert subscription: ${insertResp.status}`);
    } else if (event.type === 'subscription_cancelled') {
      if (event.providerSubscriptionId) {
        const cancelResp = await fetch(
          `${supabaseUrl}/rest/v1/subscriptions?provider_subscription_id=eq.${encodeURIComponent(event.providerSubscriptionId)}`,
          {
            method: 'PATCH',
            headers: restHeaders,
            body: JSON.stringify({ status: 'cancelled' }),
          },
        );
        if (!cancelResp.ok) throw new Error(`Failed to cancel subscription: ${cancelResp.status}`);
      }
    } else {
      console.log(`[payments-webhook] ignored: ${event.reason}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({
        error: { message: error instanceof Error ? error.message : 'Webhook failed' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
