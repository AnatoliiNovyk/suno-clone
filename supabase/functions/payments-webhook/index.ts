import { getProvider } from '../_shared/payments/index.ts';

// Unified, signature-verified webhook for all payment providers.
// Route: /payments-webhook?provider=stripe|liqpay
//
// Two invariants:
//   1. Idempotency — each provider event is claimed in `payment_events`
//      (UNIQUE per provider+event_id) BEFORE any work happens. A retry of an
//      already-processed event returns 200 without touching credits. If
//      processing fails the claim is released, so the provider's next retry
//      genuinely re-processes instead of being swallowed as a duplicate.
//   2. Credits are ADDED, never overwritten — apply_plan_purchase() does the
//      plan change, the credit grant, the ledger row and the subscription
//      upsert in a single database transaction.
//
// Status codes matter to the provider: 4xx = permanent (bad signature, unknown
// plan — retrying will never help), 5xx = transient (DB/config — please retry).

class WebhookError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  let supabaseUrl = '';
  let restHeaders: Record<string, string> | null = null;
  let claim: { provider: string; eventId: string } | null = null;

  try {
    const providerKey = new URL(req.url).searchParams.get('provider') ?? '';
    const impl = getProvider(providerKey);
    if (!impl) throw new WebhookError(400, `Unknown provider: ${providerKey}`);

    // Unverified events never reach the DB. A bad signature never becomes
    // valid, so this is a permanent 400 rather than a retryable failure.
    let event;
    try {
      event = await impl.verifyWebhook(req);
    } catch (error) {
      throw new WebhookError(
        400,
        error instanceof Error ? error.message : 'Signature verification failed',
      );
    }

    if (event.type === 'ignored') {
      console.log(`[payments-webhook] ignored: ${event.reason}`);
      return jsonResponse({ received: true, ignored: true });
    }

    supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      throw new WebhookError(500, 'Supabase env is not configured');
    }

    restHeaders = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };

    // --- 1. Claim the event (idempotency gate) ------------------------------
    if (!event.eventId) {
      throw new WebhookError(400, `${providerKey} event carries no id — cannot deduplicate`);
    }

    const claimResp = await fetch(`${supabaseUrl}/rest/v1/payment_events`, {
      method: 'POST',
      headers: restHeaders,
      body: JSON.stringify({
        provider: providerKey,
        event_id: event.eventId,
        event_type: event.type,
        user_id: event.type === 'payment_completed' ? (event.userId ?? null) : null,
      }),
    });

    if (claimResp.status === 409) {
      console.log(
        `[payments-webhook] duplicate ${providerKey}/${event.eventId} — already processed`,
      );
      return jsonResponse({ received: true, duplicate: true });
    }
    if (!claimResp.ok) {
      throw new WebhookError(
        500,
        `Failed to record payment event: ${claimResp.status} ${await claimResp.text()}`,
      );
    }
    claim = { provider: providerKey, eventId: event.eventId };

    // --- 2. Process ---------------------------------------------------------
    if (event.type === 'payment_completed') {
      const profileId = await resolveProfileId(supabaseUrl, restHeaders, event.userId, event.email);

      // One transaction: plan + credits (added to the balance) + ledger row +
      // subscription upsert. Credits come from plans.monthly_credits.
      const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/apply_plan_purchase`, {
        method: 'POST',
        headers: restHeaders,
        body: JSON.stringify({
          p_user_id: profileId,
          p_plan: event.planKey,
          p_provider: providerKey,
          p_currency: event.currency,
          p_amount_minor: event.amountMinor,
          p_interval: event.interval,
          p_provider_customer_id: event.providerCustomerId ?? null,
          p_provider_subscription_id: event.providerSubscriptionId ?? null,
        }),
      });

      if (!rpcResp.ok) {
        const detail = await rpcResp.text();
        if (detail.includes('unknown_plan')) {
          // Misconfiguration, not a transient fault — retrying cannot fix it.
          throw new WebhookError(400, `Unknown plan in webhook: ${event.planKey}`);
        }
        throw new WebhookError(500, `apply_plan_purchase failed: ${rpcResp.status} ${detail}`);
      }

      const [result] = await rpcResp.json().then((r: unknown) => (Array.isArray(r) ? r : [r]));
      console.log(
        `[payments-webhook] ${providerKey}/${event.eventId}: ${event.planKey} for ${profileId}, ` +
          `+${result?.credits_granted ?? '?'} credits → ${result?.new_balance ?? '?'}`,
      );
    } else if (event.type === 'subscription_renewed') {
      // A renewal invoice carries no user metadata: our own subscriptions row
      // is the only link from the provider's subscription id back to an owner.
      const subResp = await fetch(
        `${supabaseUrl}/rest/v1/subscriptions` +
          `?provider=eq.${encodeURIComponent(providerKey)}` +
          `&provider_subscription_id=eq.${encodeURIComponent(event.providerSubscriptionId)}` +
          '&select=user_id,plan,interval&limit=1',
        { headers: restHeaders },
      );
      if (!subResp.ok) {
        throw new WebhookError(500, `Failed to load subscription: ${subResp.status}`);
      }
      const [subscription] = await subResp.json();
      if (!subscription) {
        throw new WebhookError(
          400,
          `Renewal for unknown subscription ${event.providerSubscriptionId}`,
        );
      }

      const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/apply_plan_purchase`, {
        method: 'POST',
        headers: restHeaders,
        body: JSON.stringify({
          p_user_id: subscription.user_id,
          p_plan: subscription.plan,
          p_provider: providerKey,
          p_currency: event.currency,
          p_amount_minor: event.amountMinor,
          p_interval: event.interval ?? subscription.interval ?? 'month',
          p_provider_subscription_id: event.providerSubscriptionId,
        }),
      });
      if (!rpcResp.ok) {
        const detail = await rpcResp.text();
        if (detail.includes('unknown_plan')) {
          throw new WebhookError(400, `Unknown plan on renewal: ${subscription.plan}`);
        }
        throw new WebhookError(500, `apply_plan_purchase failed: ${rpcResp.status} ${detail}`);
      }

      const [result] = await rpcResp.json().then((r: unknown) => (Array.isArray(r) ? r : [r]));
      console.log(
        `[payments-webhook] ${providerKey}/${event.eventId}: renewed ${subscription.plan} for ` +
          `${subscription.user_id}, +${result?.credits_granted ?? '?'} credits`,
      );
    } else if (event.type === 'subscription_cancelled') {
      if (event.providerSubscriptionId) {
        const cancelResp = await fetch(
          `${supabaseUrl}/rest/v1/subscriptions` +
            `?provider=eq.${encodeURIComponent(providerKey)}` +
            `&provider_subscription_id=eq.${encodeURIComponent(event.providerSubscriptionId)}`,
          {
            method: 'PATCH',
            headers: restHeaders,
            body: JSON.stringify({ status: 'cancelled' }),
          },
        );
        if (!cancelResp.ok) {
          throw new WebhookError(500, `Failed to cancel subscription: ${cancelResp.status}`);
        }
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    const status = error instanceof WebhookError ? error.status : 500;
    console.error('Webhook error:', error);

    // Release the claim so the provider's next retry re-processes this event
    // instead of being short-circuited as a duplicate.
    if (claim && restHeaders) {
      try {
        await fetch(
          `${supabaseUrl}/rest/v1/payment_events` +
            `?provider=eq.${encodeURIComponent(claim.provider)}` +
            `&event_id=eq.${encodeURIComponent(claim.eventId)}`,
          { method: 'DELETE', headers: restHeaders },
        );
      } catch (cleanupError) {
        console.error('Failed to release payment_events claim:', cleanupError);
      }
    }

    return jsonResponse(
      { error: { message: error instanceof Error ? error.message : 'Webhook failed' } },
      status,
    );
  }
});

/** Resolves the profile the payment belongs to: signed user_id metadata first,
 *  customer email only as a legacy fallback for pre-metadata checkouts. */
async function resolveProfileId(
  supabaseUrl: string,
  restHeaders: Record<string, string>,
  userId?: string,
  email?: string,
): Promise<string> {
  const filter = userId
    ? `id=eq.${encodeURIComponent(userId)}`
    : email
    ? `email=eq.${encodeURIComponent(email)}`
    : null;

  if (!filter) {
    throw new WebhookError(400, 'Webhook event has no user_id or customer email');
  }

  const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?${filter}&select=id`, {
    headers: restHeaders,
  });
  if (!resp.ok) throw new WebhookError(500, `Failed to load profile: ${resp.status}`);

  const [profile] = await resp.json();
  if (!profile) {
    // The signup trigger creates the profile, so this is normally a race:
    // ask the provider to retry rather than dropping a paid order.
    throw new WebhookError(500, `No profile for ${userId ? `user_id ${userId}` : `email ${email}`}`);
  }
  return String(profile.id);
}
