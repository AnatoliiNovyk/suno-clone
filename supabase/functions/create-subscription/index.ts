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
    const { planType, customerEmail } = await req.json();

    if (!planType || !customerEmail) {
      throw new Error('Plan type and customer email are required');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      throw new Error('Stripe is not configured. Please contact support.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    // Plan configuration
    const plans: Record<string, { priceId: string; amount: number }> = {
      pro: { priceId: 'price_pro_monthly', amount: 800 },
      premier: { priceId: 'price_premier_monthly', amount: 2400 }
    };

    const plan = plans[planType];
    if (!plan) {
      throw new Error('Invalid plan type');
    }

    // Create Stripe Checkout Session
    const checkoutSession = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'customer_email': customerEmail,
        'success_url': `${supabaseUrl?.replace('.supabase.co', '')}/profile?subscription=success`,
        'cancel_url': `${supabaseUrl?.replace('.supabase.co', '')}/pricing?subscription=cancelled`,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `Suno ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`,
        'line_items[0][price_data][unit_amount]': plan.amount.toString(),
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][quantity]': '1',
        'metadata[plan_type]': planType,
      }).toString()
    });

    if (!checkoutSession.ok) {
      const error = await checkoutSession.text();
      throw new Error(`Stripe error: ${error}`);
    }

    const session = await checkoutSession.json();

    return new Response(JSON.stringify({
      data: {
        checkoutUrl: session.url,
        sessionId: session.id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Subscription error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'SUBSCRIPTION_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
