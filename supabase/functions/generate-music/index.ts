
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
    const { prompt, lyrics, genre } = await req.json();

    if (!prompt && !lyrics) {
      throw new Error('Prompt or lyrics required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Python Service URL (Default to localhost for hybrid dev)
    const pythonServiceUrl = Deno.env.get('PYTHON_SERVICE_URL') || 'http://127.0.0.1:8000';

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

    const trackId = crypto.randomUUID();
    const title = prompt?.slice(0, 50) || 'Generated Track';

    // 1. Deduct credits first
    const newCredits = profile.credits - 10;
    const creditUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ credits: newCredits })
    });

    if (!creditUpdateResponse.ok) {
        throw new Error('Failed to deduct credits');
    }

    // 2. Create pending track record
    const pendingTrackData = {
      id: trackId,
      user_id: userId,
      title: title,
      prompt: prompt || '',
      lyrics: lyrics || '',
      genre: genre || 'pop',
      status: 'pending',
      is_public: false,
      duration: 0
    };

    const trackInsertResponse = await fetch(`${supabaseUrl}/rest/v1/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(pendingTrackData)
    });

    if (!trackInsertResponse.ok) {
      // Refund credits if track creation fails
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ credits: profile.credits })
      });
      throw new Error('Failed to create track record');
    }

    const trackData = await trackInsertResponse.json();

    // 3. Call Python Proxy Service
    try {
        console.log(`Forwarding request to Python Service at ${pythonServiceUrl}`);
        const proxyResponse = await fetch(`${pythonServiceUrl}/generate-music`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                genre: genre || 'pop',
                track_id: trackId,
                user_id: userId
            })
        });

        if (!proxyResponse.ok) {
             const errText = await proxyResponse.text();
             console.error('Python proxy error:', errText);
             throw new Error('Music generation service failed to accept job');
        }

    } catch (err) {
        console.error('Failed to call python proxy:', err);
        
        // Refund credits
        await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ credits: profile.credits }) 
        });
        
        // Set track to failed
        await fetch(`${supabaseUrl}/rest/v1/tracks?id=eq.${trackId}`, {
             method: 'PATCH',
             headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey, 'Content-Type': 'application/json' },
             body: JSON.stringify({ status: 'failed' })
        });

        throw new Error('Generation service unavailable. Credits have been refunded.');
    }

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

    return new Response(JSON.stringify({
      data: {
        track: trackData[0],
        credits_remaining: newCredits,
        message: "Generation started"
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
