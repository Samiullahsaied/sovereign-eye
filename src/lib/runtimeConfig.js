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

export function normalizePublicConfig(config = {}) {
  const rawSupabaseUrl = typeof config.supabaseUrl === 'string' ? config.supabaseUrl : '';
  const supabaseProjectUrl = normalizeSupabaseProjectUrl(rawSupabaseUrl);
  const supabaseAnonKey = typeof config.supabaseAnonKey === 'string' ? config.supabaseAnonKey : '';

  return {
    supabaseUrl: supabaseProjectUrl.url,
    supabaseAnonKey,
    authEnabled: Boolean(config.authEnabled && supabaseProjectUrl.url && supabaseAnonKey),
    debug: {
      supabaseUrlLoaded: Boolean(rawSupabaseUrl),
      supabaseAnonKeyLoaded: Boolean(supabaseAnonKey),
      supabaseUrlValid: supabaseProjectUrl.valid,
      supabaseUrlPath: supabaseProjectUrl.path,
      supabaseUrlHadPath: supabaseProjectUrl.hadPath
    }
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
    authEnabled: config.authEnabled,
    supabaseUrlPath: config.debug.supabaseUrlPath,
    supabaseUrlHadPath: config.debug.supabaseUrlHadPath
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
      authEnabled: backendConfig.authEnabled,
      supabaseUrlPath: backendConfig.debug.supabaseUrlPath,
      supabaseUrlHadPath: backendConfig.debug.supabaseUrlHadPath
    });
    return backendConfig;
  } catch (error) {
    console.warn('[Sovereign Eye auth config] /api/config failed', {
      message: error.message,
      VITE_SUPABASE_URL_loaded: Boolean(viteConfig.supabaseUrl),
      VITE_SUPABASE_ANON_KEY_loaded: Boolean(viteConfig.supabaseAnonKey),
      authEnabled: viteConfig.authEnabled,
      supabaseUrlPath: viteConfig.debug.supabaseUrlPath,
      supabaseUrlHadPath: viteConfig.debug.supabaseUrlHadPath
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
