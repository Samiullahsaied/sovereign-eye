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
    authEnabled: Boolean(config.authEnabled && supabaseProjectUrl.url && supabaseAnonKey)
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

    const contentType = response.headers?.get?.('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error('/api/config returned a non-JSON response.');
    }

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || 'Unable to load deployment configuration');
    }

    const backendConfig = normalizePublicConfig(body);
    return backendConfig;
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
