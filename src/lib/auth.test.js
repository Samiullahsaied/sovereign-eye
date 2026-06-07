import { describe, expect, it, vi } from 'vitest';
import {
  fetchUserProfile,
  getAuthRedirectUrl,
  getCurrentSessionUser,
  isMissingUserProfilesTable,
  normalizeUserProfile,
  resetPasswordWithSupabase,
  signInWithSupabase,
  signUpWithSupabase,
  updatePasswordWithSupabase
} from './auth.js';
import { getRoleLabel } from './roles.js';

function mockProfileQuery(profile) {
  const single = vi.fn().mockResolvedValue({ data: profile, error: null });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, single };
}

describe('Supabase authentication helpers', () => {
  it('builds a stable auth redirect URL from the current site origin', () => {
    const originalLocation = globalThis.location;
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'https://sovereign-eye.pages.dev' },
      configurable: true
    });

    expect(getAuthRedirectUrl()).toBe('https://sovereign-eye.pages.dev');

    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      configurable: true
    });
  });

  it('normalizes database roles into app roles', () => {
    const user = normalizeUserProfile({
      id: 'user-1',
      email: 'officer@example.com',
      display_name: 'Officer One',
      status: 'active',
      roles: { slug: 'operations_officer', label_en: 'Operations Officer', label_ps: 'عملیاتي مسئول' }
    });

    expect(user.roleSlug).toBe('operations_officer');
    expect(user.roleLabel).toBe(getRoleLabel('operations_officer'));
  });

  it('signs in with Supabase Auth and then reads the database profile', async () => {
    const profileQuery = mockProfileQuery({
      id: 'user-1',
      email: 'admin@example.com',
      display_name: 'Admin',
      status: 'active',
      roles: { slug: 'admin', label_en: 'System Administrator', label_ps: 'سیستم اډمین' }
    });
    const client = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'admin@example.com' }, session: { access_token: 'token' } },
          error: null
        })
      },
      from: vi.fn(() => profileQuery)
    };

    const result = await signInWithSupabase(client, { email: 'admin@example.com', password: 'strong-password' });

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'strong-password'
    });
    expect(client.from).toHaveBeenCalledWith('user_profiles');
    expect(result.user.roleSlug).toBe('admin');
  });

  it('restores the current persisted Supabase session profile', async () => {
    const profileQuery = mockProfileQuery({
      id: 'user-1',
      email: 'admin@example.com',
      display_name: 'Admin',
      status: 'active',
      roles: { slug: 'admin', label_en: 'System Administrator', label_ps: 'سیستم اډمین' }
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-1', email: 'admin@example.com' } } },
          error: null
        })
      },
      from: vi.fn(() => profileQuery)
    };

    const user = await getCurrentSessionUser(client);

    expect(client.auth.getSession).toHaveBeenCalled();
    expect(client.from).toHaveBeenCalledWith('user_profiles');
    expect(user.email).toBe('admin@example.com');
  });

  it('returns null when no Supabase session is persisted', async () => {
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
      }
    };

    await expect(getCurrentSessionUser(client)).resolves.toBeNull();
  });

  it('explains the required migration when user_profiles is missing from schema cache', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.user_profiles' in the schema cache"
      }
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ select })) };

    expect(isMissingUserProfilesTable({ code: 'PGRST205', message: 'schema cache user_profiles' })).toBe(true);
    await expect(fetchUserProfile(client, 'user-1')).rejects.toThrow('Run supabase/migrations/20260604000001_supabase_auth_profiles.sql');
  });

  it('registers a Supabase Auth user and reads the created profile when a session is returned', async () => {
    const originalLocation = globalThis.location;
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'https://sovereign-eye.pages.dev' },
      configurable: true
    });
    const profileQuery = mockProfileQuery({
      id: 'user-2',
      email: 'first@example.com',
      display_name: 'First User',
      status: 'active',
      roles: { slug: 'super_admin', label_en: 'Super Admin', label_ps: 'ستر اډمین' }
    });
    const client = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-2', email: 'first@example.com' }, session: { access_token: 'token' } },
          error: null
        })
      },
      from: vi.fn(() => profileQuery)
    };

    try {
      const result = await signUpWithSupabase(client, {
        displayName: 'First User',
        email: 'FIRST@example.com',
        password: 'strong-password'
      });

      expect(client.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
        email: 'first@example.com',
        password: 'strong-password',
        options: expect.objectContaining({
          data: { display_name: 'First User' },
          emailRedirectTo: 'https://sovereign-eye.pages.dev'
        })
      }));
      expect(client.from).toHaveBeenCalledWith('user_profiles');
      expect(result.user.roleSlug).toBe('super_admin');
      expect(result.needsEmailConfirmation).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'location', {
        value: originalLocation,
        configurable: true
      });
    }
  });

  it('returns an email confirmation state when sign up has no active session', async () => {
    const client = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'pending-user', email: 'pending@example.com' }, session: null },
          error: null
        })
      }
    };

    const result = await signUpWithSupabase(client, {
      displayName: 'Pending User',
      email: 'pending@example.com',
      password: 'strong-password'
    });

    expect(result.needsEmailConfirmation).toBe(true);
    expect(result.user).toBeNull();
  });

  it('requests password reset through Supabase Auth', async () => {
    const client = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null })
      }
    };

    await expect(resetPasswordWithSupabase(client, 'ADMIN@example.com', 'https://app.example.com')).resolves.toBe(true);
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('admin@example.com', {
      redirectTo: 'https://app.example.com'
    });
  });

  it('updates password during Supabase recovery flow', async () => {
    const client = {
      auth: {
        updateUser: vi.fn().mockResolvedValue({ data: {}, error: null })
      }
    };

    await expect(updatePasswordWithSupabase(client, 'new-strong-password')).resolves.toBe(true);
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-strong-password' });
  });
});
