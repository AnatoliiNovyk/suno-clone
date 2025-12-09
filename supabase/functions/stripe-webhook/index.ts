Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error('Stripe configuration missing');
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw new Error('No signature');
    }

    // Parse the event (in production, verify signature with crypto)
    const event = JSON.parse(body);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const planType = session.metadata?.plan_type || 'pro';

        // Get customer email
        const customerEmail = session.customer_details?.email;

        if (customerEmail && supabaseUrl && serviceRoleKey) {
          // Find user by email
          const userResponse = await fetch(
            `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(customerEmail)}&select=id`,
            {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
              }
            }
          );

          const users = await userResponse.json();
          if (users && users.length > 0) {
            const userId = users[0].id;

            // Update user plan and credits
            const credits = planType === 'premier' ? 10000 : 2500;
            await fetch(
              `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  plan: planType,
                  credits: credits
                })
              }
            );

            // Create subscription record
            await fetch(
              `${supabaseUrl}/rest/v1/subscriptions`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  user_id: userId,
                  plan: planType,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  status: 'active'
                })
              }
            );
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        if (supabaseUrl && serviceRoleKey) {
          // Find and update subscription
          await fetch(
            `${supabaseUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subscriptionId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status: 'cancelled' })
            }
          );
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
