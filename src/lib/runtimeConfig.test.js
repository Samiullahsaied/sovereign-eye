import { describe, expect, it } from 'vitest';
import { getRuntimeEnvConfig, isSupabaseConfigured, loadPublicConfig, normalizePublicConfig, shouldUseSeedData } from './runtimeConfig.js';

describe('runtime deployment config', () => {
  it('does not enable seeded data in production mode', () => {
    expect(shouldUseSeedData()).toBe(false);
  });

  it('detects when Supabase public connection settings are configured', () => {
    const config = {
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      authEnabled: true
    };

    expect(isSupabaseConfigured(config)).toBe(true);
  });

  it('normalizes public config without secret fields', () => {
    const config = normalizePublicConfig({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      authEnabled: true,
      IPINFO_TOKEN: 'secret'
    });

    expect(config).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      authEnabled: true
    });
  });

  it('loads public config from the backend endpoint', async () => {
    const config = await loadPublicConfig(async (url) => {
      expect(url).toBe('/api/config');
      return {
        ok: true,
        json: async () => ({
          supabaseUrl: 'https://example.supabase.co',
          supabaseAnonKey: 'public-anon-key',
          authEnabled: true
        })
      };
    });

    expect(config.authEnabled).toBe(true);
  });

  it('prefers Vite public Supabase environment variables when present', async () => {
    const config = await loadPublicConfig(async () => {
      throw new Error('backend should not be called');
    }, {
      VITE_SUPABASE_URL: 'https://vite.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'vite-public-key'
    });

    expect(config).toEqual({
      supabaseUrl: 'https://vite.supabase.co',
      supabaseAnonKey: 'vite-public-key',
      authEnabled: true
    });
  });

  it('normalizes Vite environment config without backend-only secrets', () => {
    const config = getRuntimeEnvConfig({
      VITE_SUPABASE_URL: 'https://vite.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'vite-public-key',
      IPINFO_TOKEN: 'server-secret'
    });

    expect(JSON.stringify(config)).not.toContain('server-secret');
    expect(config.authEnabled).toBe(true);
  });
});
