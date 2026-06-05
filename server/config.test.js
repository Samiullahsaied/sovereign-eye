import { describe, expect, it } from 'vitest';
import { getPublicConfig } from './config.js';

describe('public runtime config', () => {
  it('returns only public Supabase configuration', () => {
    const config = getPublicConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
      IPINFO_TOKEN: 'server-ipinfo-token'
    });

    expect(config).toEqual({
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
    })).toEqual({
      supabaseUrl: 'https://legacy.supabase.co',
      supabaseAnonKey: 'legacy-public-key',
      authEnabled: true
    });
  });

  it('marks auth disabled when Supabase env vars are missing', () => {
    expect(getPublicConfig({})).toEqual({
      supabaseUrl: '',
      supabaseAnonKey: '',
      authEnabled: false
    });
  });
});
