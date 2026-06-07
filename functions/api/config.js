function publicConfig(env = {}) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    supabaseUrl,
    supabaseAnonKey,
    authEnabled: Boolean(supabaseUrl && supabaseAnonKey)
  };
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...init.headers
    }
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  return json(publicConfig(env));
}
