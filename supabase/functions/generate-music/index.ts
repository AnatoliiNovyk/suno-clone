Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { prompt, lyrics, genre, instrumental } = await req.json();

    if (!prompt && !lyrics) {
      throw new Error('Prompt or lyrics required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey
      }
    });

    if (!userResponse.ok) {
      throw new Error('Invalid token');
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Check user credits
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=credits`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      }
    );

    const profiles = await profileResponse.json();
    const profile = profiles[0];

    if (!profile || profile.credits < 10) {
      throw new Error('Insufficient credits. You need at least 10 credits to generate music.');
    }

    // Generate a mock track (in production, this would call an AI API)
    const trackId = crypto.randomUUID();
    const title = prompt?.slice(0, 50) || 'Generated Track';
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create track record
    const trackData = {
      id: trackId,
      user_id: userId,
      title: title,
      prompt: prompt || '',
      lyrics: lyrics || '',
      genre: genre || 'pop',
      audio_url: `https://mwsigocoyiuywrrrgjcv.supabase.co/storage/v1/object/public/audio/samples/demo-${Math.floor(Math.random() * 5) + 1}.mp3`,
      cover_url: `https://mwsigocoyiuywrrrgjcv.supabase.co/storage/v1/object/public/audio/covers/cover-${Math.floor(Math.random() * 3) + 1}.jpg`,
      duration: Math.floor(Math.random() * 120) + 60,
      status: 'completed',
      is_public: false
    };

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(trackData)
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      throw new Error(`Failed to save track: ${errorText}`);
    }

    // Deduct credits
    const newCredits = profile.credits - 10;
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ credits: newCredits })
    });

    // Log credit transaction
    await fetch(`${supabaseUrl}/rest/v1/credit_transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        amount: -10,
        type: 'generation',
        description: `Generated: ${title}`
      })
    });

    const track = await insertResponse.json();

    return new Response(JSON.stringify({
      data: {
        track: track[0],
        credits_remaining: newCredits
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Music generation error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'GENERATION_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
