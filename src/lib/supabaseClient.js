import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './runtimeConfig.js';

export function createSupabaseBrowserClient(config) {
  if (!isSupabaseConfigured(config)) {
    return null;
  }

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
}
