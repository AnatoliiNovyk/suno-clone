const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonResponse(
      { error: { code: 'AUTH_REQUIRED', message: 'Authorization Bearer token required' } },
      401,
    );
  }

  const pythonServiceUrl = (Deno.env.get('PYTHON_SERVICE_URL') || 'http://127.0.0.1:8000')
    .replace(/\/+$/, '');

  try {
    const rawBody = await req.text();
    const proxyResponse = await fetch(`${pythonServiceUrl}/generate-music`, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('content-type') || 'application/json',
        'Authorization': authHeader,
      },
      body: rawBody || '{}',
    });

    const responseBody = await proxyResponse.text();
    return new Response(responseBody, {
      status: proxyResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': proxyResponse.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Python generation proxy error:', error);
    return jsonResponse(
      {
        error: {
          code: 'GENERATION_PROXY_UNAVAILABLE',
          message: 'Music generation service is unavailable',
        },
      },
      503,
    );
  }
});
