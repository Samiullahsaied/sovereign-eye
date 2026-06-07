import { describe, expect, it } from 'vitest';
import {
  getRuntimeEnvConfig,
  isSupabaseConfigured,
  loadPublicConfig,
  normalizePublicConfig,
  normalizeSupabaseProjectUrl,
  shouldUseSeedData
} from './runtimeConfig.js';

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

    expect(config).toMatchObject({
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
        headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
        json: async () => ({
          supabaseUrl: 'https://example.supabase.co',
          supabaseAnonKey: 'public-anon-key',
          authEnabled: true
        })
      };
    });

    expect(config.authEnabled).toBe(true);
  });

  it('rejects non-JSON backend config responses before parsing', async () => {
    await expect(loadPublicConfig(async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: async () => '<!doctype html>'
    }), {})).rejects.toThrow('non-JSON response');
  });

  it('prefers Vite public Supabase environment variables when present', async () => {
    const config = await loadPublicConfig(async () => {
      throw new Error('backend should not be called');
    }, {
      VITE_SUPABASE_URL: 'https://vite.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'vite-public-key'
    });

    expect(config).toMatchObject({
      supabaseUrl: 'https://vite.supabase.co',
      supabaseAnonKey: 'vite-public-key',
      authEnabled: true
    });
  });

  it('strips invalid Supabase API paths from copied project URLs', () => {
    expect(normalizeSupabaseProjectUrl('https://project.supabase.co/rest/v1')).toEqual({
      url: 'https://project.supabase.co',
      path: '/rest/v1',
      valid: true,
      hadPath: true
    });

    expect(normalizePublicConfig({
      supabaseUrl: 'https://project.supabase.co/auth/v1',
      supabaseAnonKey: 'public-key',
      authEnabled: true
    })).toMatchObject({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      authEnabled: true,
      debug: {
        supabaseUrlPath: '/auth/v1',
        supabaseUrlHadPath: true
      }
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
