export function normalizePublicConfig(config = {}) {
  const supabaseUrl = typeof config.supabaseUrl === 'string' ? config.supabaseUrl : '';
  const supabaseAnonKey = typeof config.supabaseAnonKey === 'string' ? config.supabaseAnonKey : '';

  return {
    supabaseUrl,
    supabaseAnonKey,
    authEnabled: Boolean(config.authEnabled && supabaseUrl && supabaseAnonKey)
  };
}

export function getRuntimeEnvConfig(env = import.meta.env || {}) {
  return normalizePublicConfig({
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
    authEnabled: Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
  });
}

export async function loadPublicConfig(fetchImpl = fetch, env = import.meta.env || {}) {
  const viteConfig = getRuntimeEnvConfig(env);
  if (isSupabaseConfigured(viteConfig)) {
    return viteConfig;
  }

  try {
    const response = await fetchImpl('/api/config', {
      headers: { accept: 'application/json' }
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || 'Unable to load deployment configuration');
    }

    return normalizePublicConfig(body);
  } catch (error) {
    if (isSupabaseConfigured(viteConfig)) return viteConfig;
    throw error;
  }
}

export function isSupabaseConfigured(config = {}) {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

export function shouldUseSeedData() {
  return false;
}
