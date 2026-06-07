import { describe, expect, it } from 'vitest';
import { getPublicConfig, normalizeSupabaseProjectUrl } from './config.js';

describe('public runtime config', () => {
  it('returns only public Supabase configuration', () => {
    const config = getPublicConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
      IPINFO_TOKEN: 'server-ipinfo-token'
    });

    expect(config).toMatchObject({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      authEnabled: true
    });
    expect(JSON.stringify(config)).not.toContain('server-only-key');
    expect(JSON.stringify(config)).not.toContain('server-ipinfo-token');
  });

  it('keeps backwards compatibility with older unprefixed Supabase environment keys', () => {
    expect(getPublicConfig({
      SUPABASE_URL: 'https://legacy.supabase.co',
      SUPABASE_ANON_KEY: 'legacy-public-key'
    })).toMatchObject({
      supabaseUrl: 'https://legacy.supabase.co',
      supabaseAnonKey: 'legacy-public-key',
      authEnabled: true
    });
  });

  it('normalizes copied Supabase API URLs down to the project origin', () => {
    expect(normalizeSupabaseProjectUrl('https://project.supabase.co/auth/v1')).toEqual({
      url: 'https://project.supabase.co',
      path: '/auth/v1',
      valid: true,
      hadPath: true
    });

    expect(getPublicConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co/rest/v1',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key'
    })).toMatchObject({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      authEnabled: true,
      debug: {
        supabaseUrlPath: '/rest/v1',
        supabaseUrlHadPath: true
      }
    });
  });

  it('marks auth disabled when Supabase env vars are missing', () => {
    expect(getPublicConfig({})).toMatchObject({
      supabaseUrl: '',
      supabaseAnonKey: '',
      authEnabled: false
    });
  });
});
