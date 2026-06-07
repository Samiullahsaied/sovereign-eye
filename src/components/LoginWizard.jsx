import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  fetchUserProfileWithRetry,
  getCurrentSessionUser,
  resetPasswordWithSupabase,
  signInWithSupabase,
  signUpWithSupabase,
  updatePasswordWithSupabase
} from '../lib/auth.js';
import { validateWarrant } from '../lib/validation.js';

const AUTH_MODES = [
  { id: 'login', label: 'Login' },
  { id: 'register', label: 'Register' },
  { id: 'reset', label: 'Password reset' }
];

export function LoginWizard({ supabaseClient, configLoading, configError, onComplete }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('login');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [registration, setRegistration] = useState({ displayName: '', email: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [warrant, setWarrant] = useState({ number: '', expiresAt: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const updateCredentials = (field, value) => setCredentials((current) => ({ ...current, [field]: value }));
  const updateRegistration = (field, value) => setRegistration((current) => ({ ...current, [field]: value }));
  const updateWarrant = (field, value) => setWarrant((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!supabaseClient) return undefined;
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const user = await getCurrentSessionUser(supabaseClient);
        if (!cancelled && user) {
          setPendingUser(user);
          setStep(2);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to restore the current session.');
        }
      }
    };

    restoreSession();

    const { data } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep(1);
        setMode('updatePassword');
        setError('');
        setSuccess('Enter a new password to finish account recovery.');
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [supabaseClient]);

  useEffect(() => {
    if (!supabaseClient) return undefined;
    let cancelled = false;

    const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user || mode === 'updatePassword') return;

      fetchUserProfileWithRetry(supabaseClient, session.user)
        .then((user) => {
          if (!cancelled) {
            setPendingUser(user);
            setStep(2);
            setError('');
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message || 'Unable to load the signed-in user profile.');
          }
        });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [mode, supabaseClient]);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const result = await signInWithSupabase(supabaseClient, credentials);
      setPendingUser(result.user);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const result = await signUpWithSupabase(supabaseClient, registration);
      if (result.user) {
        setPendingUser(result.user);
        setStep(2);
        return;
      }
      setSuccess('Registration received. Check your email to confirm the account, then log in.');
      setMode('login');
      setCredentials((current) => ({ ...current, email: registration.email, password: '' }));
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await resetPasswordWithSupabase(supabaseClient, resetEmail);
      setSuccess('Password reset email sent. Open the link from Supabase to set a new password.');
    } catch (err) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitNewPassword = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await updatePasswordWithSupabase(supabaseClient, newPassword);
      setNewPassword('');
      setSuccess('Password updated. Please log in with the new password.');
      setMode('login');
    } catch (err) {
      setError(err.message || 'Password update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitWarrant = async (event) => {
    event.preventDefault();
    const result = validateWarrant(warrant);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await onComplete({ user: pendingUser, warrant: result.warrant });
    } catch (err) {
      setError(err.message || 'Unable to complete secure entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const setupMessage = !configLoading && (configError || !supabaseClient)
    ? 'Secure access is temporarily unavailable. Please contact the system administrator.'
    : '';

  return (
    <main className="lock-screen">
      <section className="lock-card" aria-label="Secure login">
        <div className="lock-eye">
          <Eye aria-hidden="true" />
        </div>
        <h1>Sovereign Eye</h1>
        <p>قانوني عملياتي مرکز</p>
        <div className="step-dots" aria-label={`Step ${step} of 2`}>
          {[1, 2].map((value) => (
            <span key={value} className={value < step ? 'done' : value === step ? 'active' : ''} />
          ))}
        </div>

        {setupMessage && <p className="form-error">{setupMessage}</p>}
        {success && <p className="notice">{success}</p>}

        {step === 1 && mode !== 'updatePassword' && (
          <div className="segmented auth-tabs" aria-label="Authentication mode">
            {AUTH_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? 'active' : ''}
                onClick={() => changeMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {step === 1 && mode === 'login' && (
          <form onSubmit={submitLogin} className="form-grid">
            <label>
              <span>Email</span>
              <input
                value={credentials.email}
                onChange={(event) => updateCredentials('email', event.target.value)}
                placeholder="Official email"
                type="email"
                autoComplete="email"
                disabled={submitting}
              />
            </label>
            <label>
              <span>پټ نوم</span>
              <input
                value={credentials.password}
                onChange={(event) => updateCredentials('password', event.target.value)}
                placeholder="Account password"
                type="password"
                autoComplete="current-password"
                disabled={submitting}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'ننوتل'}
            </button>
          </form>
        )}

        {step === 1 && mode === 'register' && (
          <form onSubmit={submitRegister} className="form-grid">
            <label>
              <span>Full name</span>
              <input
                value={registration.displayName}
                onChange={(event) => updateRegistration('displayName', event.target.value)}
                placeholder="Full legal name"
                autoComplete="name"
                disabled={submitting}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                value={registration.email}
                onChange={(event) => updateRegistration('email', event.target.value)}
                placeholder="Official email"
                type="email"
                autoComplete="email"
                disabled={submitting}
              />
            </label>
            <label>
              <span>پټ نوم</span>
              <input
                value={registration.password}
                onChange={(event) => updateRegistration('password', event.target.value)}
                placeholder="Create a secure password"
                type="password"
                autoComplete="new-password"
                disabled={submitting}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}

        {step === 1 && mode === 'reset' && (
          <form onSubmit={submitReset} className="form-grid">
            <label>
              <span>Email</span>
              <input
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder="Official email"
                type="email"
                autoComplete="email"
                disabled={submitting}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send reset email'}
            </button>
          </form>
        )}

        {step === 1 && mode === 'updatePassword' && (
          <form onSubmit={submitNewPassword} className="form-grid">
            <label>
              <span>New password</span>
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New secure password"
                type="password"
                autoComplete="new-password"
                disabled={submitting}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitWarrant} className="form-grid">
            <div className="notice">
              {pendingUser?.name} · {pendingUser?.roleLabel}
            </div>
            <label>
              <span>حکم نمبر</span>
              <input value={warrant.number} onChange={(event) => updateWarrant('number', event.target.value)} placeholder="W-2026-001" disabled={submitting} />
            </label>
            <label>
              <span>د پای نېټه</span>
              <input
                value={warrant.expiresAt}
                onChange={(event) => updateWarrant('expiresAt', event.target.value)}
                placeholder="2026-12-31"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                disabled={submitting}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? 'Loading...' : 'عملیاتي مرکز ته ننوتل'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
