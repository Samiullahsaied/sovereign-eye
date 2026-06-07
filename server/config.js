export function normalizeSupabaseProjectUrl(value = '') {
  if (typeof value !== 'string' || !value.trim()) {
    return { url: '', path: '', valid: false, hadPath: false };
  }

  try {
    const parsed = new URL(value.trim());
    const path = parsed.pathname || '/';
    parsed.pathname = '/';
    parsed.search = '';
    parsed.hash = '';

    return {
      url: parsed.origin,
      path,
      valid: parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co'),
      hadPath: path !== '/'
    };
  } catch {
    return { url: '', path: 'invalid-url', valid: false, hadPath: false };
  }
}

export function getPublicConfig(env = process.env) {
  const rawSupabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseProjectUrl = normalizeSupabaseProjectUrl(rawSupabaseUrl);
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    supabaseUrl: supabaseProjectUrl.url,
    supabaseAnonKey,
    authEnabled: Boolean(supabaseProjectUrl.url && supabaseAnonKey),
    debug: {
      supabaseUrlLoaded: Boolean(rawSupabaseUrl),
      supabaseAnonKeyLoaded: Boolean(supabaseAnonKey),
      supabaseUrlValid: supabaseProjectUrl.valid,
      supabaseUrlPath: supabaseProjectUrl.path,
      supabaseUrlHadPath: supabaseProjectUrl.hadPath
    }
  };
}

export async function handleConfigRequest({ env = process.env }) {
  return {
    ok: true,
    status: 200,
    body: getPublicConfig(env)
  };
}
