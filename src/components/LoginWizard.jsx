import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SUPPORTED_LANGUAGES, useT } from '../i18n/index.jsx';
import {
  fetchUserProfileWithRetry,
  getCurrentSessionUser,
  resetPasswordWithSupabase,
  signInWithSupabase,
  signUpWithSupabase,
  updatePasswordWithSupabase
} from '../lib/auth.js';
import {
  WARRANT_DURATION_OPTIONS,
  makeWarrantFromDuration,
  toDateInputValue,
  validateWarrantAccess
} from '../lib/warrant.js';

const AUTH_MODES = [
  { id: 'login', labelKey: 'auth.login' },
  { id: 'register', labelKey: 'auth.register' },
  { id: 'reset', labelKey: 'auth.reset' }
];

export function LoginWizard({ supabaseClient, configLoading, configError, lang = 'ps', onLangChange, onComplete }) {
  const t = useT();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('login');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [registration, setRegistration] = useState({ displayName: '', email: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [warrant, setWarrant] = useState(() => {
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
      warrantNumber: '',
      courtOrderFile: null,
      courtOrderFileName: '',
      accessStartTime: toDateInputValue(start),
      accessEndTime: toDateInputValue(end),
      durationMode: '1h',
      approvedBy: '',
      legalBasisNote: ''
    };
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const updateCredentials = (field, value) => setCredentials((current) => ({ ...current, [field]: value }));
  const updateRegistration = (field, value) => setRegistration((current) => ({ ...current, [field]: value }));
  const updateWarrant = (field, value) => setWarrant((current) => ({ ...current, [field]: value }));
  const updateDuration = (durationMode) => setWarrant((current) => makeWarrantFromDuration(current, durationMode));

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
        if (!cancelled) setError(err.message || t('auth.restoreFailed'));
      }
    };

    restoreSession();

    const { data } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep(1);
        setMode('updatePassword');
        setError('');
        setSuccess(t('auth.recoveryPrompt'));
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [supabaseClient, t]);

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
          if (!cancelled) setError(err.message || t('auth.profileLoadFailed'));
        });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [mode, supabaseClient, t]);

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
      setError(err.message || t('auth.loginFailed'));
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
      setSuccess(t('auth.registrationReceived'));
      setMode('login');
      setCredentials((current) => ({ ...current, email: registration.email, password: '' }));
    } catch (err) {
      setError(err.message || t('auth.registrationFailed'));
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
      setSuccess(t('auth.resetSent'));
    } catch (err) {
      setError(err.message || t('auth.resetFailed'));
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
      setSuccess(t('auth.passwordUpdated'));
      setMode('login');
    } catch (err) {
      setError(err.message || t('auth.passwordUpdateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitWarrant = async (event) => {
    event.preventDefault();
    const result = validateWarrantAccess(warrant);
    if (!result.ok) {
      setError(result.code ? t(`warrant.errors.${result.code}`) : result.message);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await onComplete({ user: pendingUser, warrant: result.warrant });
    } catch (err) {
      setError(err.message || t('auth.completeEntryFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const setupMessage = !configLoading && (configError || !supabaseClient) ? t('auth.secureUnavailable') : '';

  return (
    <main className="lock-screen">
      <section className="lock-card" aria-label={t('auth.secureLogin')}>
        <div className="lock-eye"><Eye aria-hidden="true" /></div>
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
        <div className="segmented auth-tabs" aria-label={t('common.language')}>
          {SUPPORTED_LANGUAGES.map((item) => (
            <button key={item} type="button" className={lang === item ? 'active' : ''} onClick={() => onLangChange?.(item)}>
              {t(`lang.${item}`)}
            </button>
          ))}
        </div>
        <div className="step-dots" aria-label={t('auth.stepLabel', { step })}>
          {[1, 2].map((value) => (
            <span key={value} className={value < step ? 'done' : value === step ? 'active' : ''} />
          ))}
        </div>

        {setupMessage && <p className="form-error">{setupMessage}</p>}
        {success && <p className="notice">{success}</p>}

        {step === 1 && mode !== 'updatePassword' && (
          <div className="segmented auth-tabs" aria-label={t('auth.authMode')}>
            {AUTH_MODES.map((item) => (
              <button key={item.id} type="button" className={mode === item.id ? 'active' : ''} onClick={() => changeMode(item.id)}>
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        )}

        {step === 1 && mode === 'login' && (
          <form onSubmit={submitLogin} className="form-grid">
            <label><span>{t('common.email')}</span><input value={credentials.email} onChange={(event) => updateCredentials('email', event.target.value)} placeholder={t('auth.officialEmail')} type="email" autoComplete="email" disabled={submitting} /></label>
            <label><span>{t('common.password')}</span><input value={credentials.password} onChange={(event) => updateCredentials('password', event.target.value)} placeholder={t('auth.accountPassword')} type="password" autoComplete="current-password" disabled={submitting} /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>{submitting ? t('auth.signingIn') : t('auth.signIn')}</button>
          </form>
        )}

        {step === 1 && mode === 'register' && (
          <form onSubmit={submitRegister} className="form-grid">
            <label><span>{t('common.fullName')}</span><input value={registration.displayName} onChange={(event) => updateRegistration('displayName', event.target.value)} placeholder={t('auth.fullLegalName')} autoComplete="name" disabled={submitting} /></label>
            <label><span>{t('common.email')}</span><input value={registration.email} onChange={(event) => updateRegistration('email', event.target.value)} placeholder={t('auth.officialEmail')} type="email" autoComplete="email" disabled={submitting} /></label>
            <label><span>{t('common.password')}</span><input value={registration.password} onChange={(event) => updateRegistration('password', event.target.value)} placeholder={t('auth.newSecurePassword')} type="password" autoComplete="new-password" disabled={submitting} /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>{submitting ? t('auth.creatingAccount') : t('auth.createAccount')}</button>
          </form>
        )}

        {step === 1 && mode === 'reset' && (
          <form onSubmit={submitReset} className="form-grid">
            <label><span>{t('common.email')}</span><input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder={t('auth.officialEmail')} type="email" autoComplete="email" disabled={submitting} /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>{submitting ? t('auth.sending') : t('auth.sendResetEmail')}</button>
          </form>
        )}

        {step === 1 && mode === 'updatePassword' && (
          <form onSubmit={submitNewPassword} className="form-grid">
            <label><span>{t('auth.newPassword')}</span><input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t('auth.newSecurePassword')} type="password" autoComplete="new-password" disabled={submitting} /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>{submitting ? t('auth.updating') : t('auth.updatePassword')}</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitWarrant} className="form-grid">
            <div className="notice">{pendingUser?.name} - {pendingUser?.roleLabel}</div>
            <label><span>{t('warrant.number')}</span><input value={warrant.warrantNumber} onChange={(event) => updateWarrant('warrantNumber', event.target.value)} placeholder={t('warrant.numberPlaceholder')} disabled={submitting} required /></label>
            <label>
              <span>{t('warrant.file')}</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setWarrant((current) => ({ ...current, courtOrderFile: file, courtOrderFileName: file?.name || '' }));
                }}
                disabled={submitting}
                required
              />
            </label>
            <label>
              <span>{t('warrant.duration')}</span>
              <select value={warrant.durationMode} onChange={(event) => updateDuration(event.target.value)} disabled={submitting}>
                {WARRANT_DURATION_OPTIONS.map((option) => <option key={option.id} value={option.id}>{t(`warrant.durations.${option.id}`)}</option>)}
              </select>
            </label>
            <label><span>{t('warrant.start')}</span><input value={warrant.accessStartTime} onChange={(event) => setWarrant((current) => makeWarrantFromDuration({ ...current, accessStartTime: event.target.value }, current.durationMode))} type="datetime-local" disabled={submitting} required /></label>
            <label><span>{t('warrant.end')}</span><input value={warrant.accessEndTime} onChange={(event) => updateWarrant('accessEndTime', event.target.value)} type="datetime-local" disabled={submitting || warrant.durationMode !== 'custom'} required /></label>
            <label><span>{t('warrant.approvedBy')}</span><input value={warrant.approvedBy} onChange={(event) => updateWarrant('approvedBy', event.target.value)} placeholder={t('warrant.approvingAuthority')} disabled={submitting} required /></label>
            <label><span>{t('warrant.legalBasis')}</span><textarea value={warrant.legalBasisNote} onChange={(event) => updateWarrant('legalBasisNote', event.target.value)} placeholder={t('warrant.legalBasisPlaceholder')} rows={3} disabled={submitting} required /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={submitting}>{submitting ? t('common.loading') : t('auth.enterOperations')}</button>
          </form>
        )}
      </section>
    </main>
  );
}
