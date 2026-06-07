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
  const config = normalizePublicConfig({
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
    authEnabled: Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
  });
  console.info('[Sovereign Eye auth config] import.meta.env', {
    VITE_SUPABASE_URL_loaded: Boolean(env.VITE_SUPABASE_URL),
    VITE_SUPABASE_ANON_KEY_loaded: Boolean(env.VITE_SUPABASE_ANON_KEY),
    authEnabled: config.authEnabled
  });
  return config;
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

    const backendConfig = normalizePublicConfig(body);
    console.info('[Sovereign Eye auth config] /api/config', {
      VITE_SUPABASE_URL_loaded: Boolean(backendConfig.supabaseUrl),
      VITE_SUPABASE_ANON_KEY_loaded: Boolean(backendConfig.supabaseAnonKey),
      authEnabled: backendConfig.authEnabled
    });
    return backendConfig;
  } catch (error) {
    console.warn('[Sovereign Eye auth config] /api/config failed', {
      message: error.message,
      VITE_SUPABASE_URL_loaded: Boolean(viteConfig.supabaseUrl),
      VITE_SUPABASE_ANON_KEY_loaded: Boolean(viteConfig.supabaseAnonKey),
      authEnabled: viteConfig.authEnabled
    });
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
