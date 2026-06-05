import { getRoleLabel, ROLE_SLUGS } from './roles.js';

const PROFILE_SELECT = 'id,email,display_name,status,roles:role_id(slug,label_en,label_ps)';
const MISSING_PROFILE_TABLE_MESSAGE = 'Supabase table public.user_profiles is missing. Run supabase/migrations/20260604000001_supabase_auth_profiles.sql in the Supabase SQL Editor, then run NOTIFY pgrst, \'reload schema\'.';

function normalizeRole(roleRecord) {
  const role = Array.isArray(roleRecord) ? roleRecord[0] : roleRecord;
  const slug = role?.slug || ROLE_SLUGS.VIEWER;

  return {
    slug,
    label: role?.label_en && role?.label_ps ? `${role.label_en} / ${role.label_ps}` : getRoleLabel(slug)
  };
}

function wait(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export function isMissingUserProfilesTable(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return error?.code === 'PGRST205' || (
    message.includes('user_profiles') &&
    message.includes('schema cache')
  );
}

export function normalizeUserProfile(profile, authUser = {}) {
  const role = normalizeRole(profile?.roles);
  const metadataName = authUser.user_metadata?.display_name;

  return {
    id: profile?.id || authUser.id,
    email: profile?.email || authUser.email || '',
    name: profile?.display_name || metadataName || authUser.email || 'Authenticated user',
    status: profile?.status || 'active',
    roleSlug: role.slug,
    roleLabel: role.label
  };
}

export async function fetchUserProfile(client, userId, authUser = {}) {
  const { data, error } = await client
    .from('user_profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .single();

  if (error) {
    if (isMissingUserProfilesTable(error)) {
      throw new Error(MISSING_PROFILE_TABLE_MESSAGE);
    }
    throw new Error(error.message || 'User profile was not found.');
  }

  if (data.status !== 'active') {
    throw new Error('This user account is not active.');
  }

  return normalizeUserProfile(data, authUser);
}

export async function fetchUserProfileWithRetry(client, authUser) {
  let lastError;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetchUserProfile(client, authUser.id, authUser);
    } catch (error) {
      lastError = error;
      if (error.message === MISSING_PROFILE_TABLE_MESSAGE) {
        throw error;
      }
      await wait(250);
    }
  }

  throw lastError;
}

export async function getCurrentSessionUser(client) {
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(error.message || 'Unable to read the current Supabase session.');
  }

  if (!data.session?.user) {
    return null;
  }

  return fetchUserProfileWithRetry(client, data.session.user);
}

export async function signInWithSupabase(client, credentials) {
  if (!client) {
    throw new Error('Supabase Auth is not configured.');
  }

  const email = credentials.email?.trim().toLowerCase();
  const password = credentials.password || '';

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message || 'Login failed.');
  }

  if (!data.user) {
    throw new Error('Supabase did not return an authenticated user.');
  }

  const user = await fetchUserProfileWithRetry(client, data.user);
  return {
    session: data.session,
    user
  };
}

export async function signUpWithSupabase(client, payload) {
  if (!client) {
    throw new Error('Supabase Auth is not configured.');
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password || '';
  const displayName = payload.displayName?.trim() || email?.split('@')[0] || '';
  const redirectTo = payload.redirectTo || globalThis.location?.origin;

  if (!email || !password || !displayName) {
    throw new Error('Name, email, and password are required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: redirectTo
    }
  });

  if (error) {
    throw new Error(error.message || 'Registration failed.');
  }

  if (!data.session || !data.user) {
    return {
      session: data.session,
      user: null,
      needsEmailConfirmation: true
    };
  }

  const user = await fetchUserProfileWithRetry(client, data.user);
  return {
    session: data.session,
    user,
    needsEmailConfirmation: false
  };
}

export async function resetPasswordWithSupabase(client, email, redirectTo = globalThis.location?.origin) {
  if (!client) {
    throw new Error('Supabase Auth is not configured.');
  }

  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Email is required.');
  }

  const { error } = await client.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
  if (error) {
    throw new Error(error.message || 'Password reset request failed.');
  }

  return true;
}

export async function updatePasswordWithSupabase(client, password) {
  if (!client) {
    throw new Error('Supabase Auth is not configured.');
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const { error } = await client.auth.updateUser({ password });
  if (error) {
    throw new Error(error.message || 'Password update failed.');
  }

  return true;
}

export async function signOutOfSupabase(client) {
  if (client) {
    await client.auth.signOut();
  }
}
