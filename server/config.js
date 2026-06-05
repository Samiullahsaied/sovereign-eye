export function getPublicConfig(env = process.env) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    supabaseUrl,
    supabaseAnonKey,
    authEnabled: Boolean(supabaseUrl && supabaseAnonKey)
  };
}

export async function handleConfigRequest({ env = process.env }) {
  return {
    ok: true,
    status: 200,
    body: getPublicConfig(env)
  };
}
