import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { LoginWizard } from './components/LoginWizard.jsx';
import { Modal } from './components/Modal.jsx';
import { Shell } from './components/Shell.jsx';
import { ToastStack } from './components/Toast.jsx';
import { NAV_ITEMS } from './data/appConstants.js';
import { signOutOfSupabase } from './lib/auth.js';
import { lookupIpInfo } from './lib/ipinfo.js';
import { canAccessPage, filterPagesForRole } from './lib/roles.js';
import { loadPublicConfig } from './lib/runtimeConfig.js';
import { createSupabaseBrowserClient } from './lib/supabaseClient.js';
import { getWarrantStatus, isWarrantActive, WARRANT_STATUS } from './lib/warrant.js';
import {
  deleteOrder,
  acknowledgeAlert,
  endUserSession,
  insertAlert,
  insertAuditLog,
  insertEvidence,
  insertOrder,
  insertTrafficRecord,
  insertUserSession,
  loadOperationalData,
  upsertSetting
} from './lib/supabaseData.js';
import { readString, writeString, clearAppStorage } from './lib/storage.js';
import { sanitizeText } from './lib/validation.js';

const Analytics = lazy(() => import('./pages/Analytics.jsx').then((module) => ({ default: module.Analytics })));
const Audit = lazy(() => import('./pages/Audit.jsx').then((module) => ({ default: module.Audit })));
const Cases = lazy(() => import('./pages/Cases.jsx').then((module) => ({ default: module.Cases })));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx').then((module) => ({ default: module.Dashboard })));
const Evidence = lazy(() => import('./pages/Evidence.jsx').then((module) => ({ default: module.Evidence })));
const Health = lazy(() => import('./pages/Health.jsx').then((module) => ({ default: module.Health })));
const Keystroke = lazy(() => import('./pages/Keystroke.jsx').then((module) => ({ default: module.Keystroke })));
const MapPage = lazy(() => import('./pages/MapPage.jsx').then((module) => ({ default: module.MapPage })));
const NetworkPage = lazy(() => import('./pages/Network.jsx').then((module) => ({ default: module.NetworkPage })));
const PhonePage = lazy(() => import('./pages/Phone.jsx').then((module) => ({ default: module.PhonePage })));
const Privacy = lazy(() => import('./pages/Privacy.jsx').then((module) => ({ default: module.Privacy })));
const SettingsPage = lazy(() => import('./pages/Settings.jsx').then((module) => ({ default: module.SettingsPage })));
const Social = lazy(() => import('./pages/Social.jsx').then((module) => ({ default: module.Social })));
const UsersPage = lazy(() => import('./pages/Users.jsx').then((module) => ({ default: module.UsersPage })));
const Warrants = lazy(() => import('./pages/Warrants.jsx').then((module) => ({ default: module.Warrants })));
const Assistant = lazy(() => import('./pages/Assistant.jsx').then((module) => ({ default: module.Assistant })));
const BehavioralIdentityGraph = lazy(() => import('./pages/BehavioralIdentityGraph.jsx').then((module) => ({ default: module.BehavioralIdentityGraph })));

const SESSION_LENGTH = 1800;
const IDLE_LENGTH = 900;
const SENSITIVE_PAGES = new Set(['cases', 'map', 'analytics', 'network', 'warrants', 'phone', 'social', 'keyboard', 'evidence', 'audit', 'behavioral-identity', 'assistant']);

function makeId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`;
}

function nowLabel() {
  return new Date().toLocaleString();
}

function localAuditRow(user, action, detail) {
  return {
    id: makeId('audit'),
    time: nowLabel(),
    user: user?.name || user?.email || 'System',
    action: sanitizeText(action),
    detail: sanitizeText(detail)
  };
}

function localEvidenceRow(action, detail) {
  return {
    id: makeId('evidence'),
    time: nowLabel(),
    action: sanitizeText(action),
    detail: sanitizeText(detail)
  };
}

export default function App() {
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [warrant, setWarrant] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState(() => readString('se_lang', 'ps'));
  const [theme, setTheme] = useState(() => readString('se_theme', 'dark'));
  const [query, setQuery] = useState('');
  const [ipLookup, setIpLookup] = useState({ loading: false, error: '', result: null });
  const [sessionSeconds, setSessionSeconds] = useState(SESSION_LENGTH);
  const [toasts, setToasts] = useState([]);
  const [faceResult, setFaceResult] = useState('');
  const [cases, setCases] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [targets, setTargets] = useState([]);
  const [warrants, setWarrants] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusRows, setStatusRows] = useState([]);
  const [settingsRows, setSettingsRows] = useState([]);
  const [typingFingerprint, setTypingFingerprint] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [trafficData, setTrafficData] = useState([]);
  const [dashboardStats, setDashboardStats] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [expiryLoggedFor, setExpiryLoggedFor] = useState('');

  const navItems = useMemo(() => (
    currentUser ? filterPagesForRole(NAV_ITEMS, currentUser.roleSlug) : []
  ), [currentUser]);

  useEffect(() => {
    let alive = true;

    loadPublicConfig()
      .then((config) => {
        if (!alive) return;
        const client = createSupabaseBrowserClient(config);
        setSupabaseClient(client);
        setConfigError('');
      })
      .catch((err) => {
        if (!alive) return;
        setConfigError(err.message || 'Unable to load secure access.');
        setSupabaseClient(null);
      })
      .finally(() => {
        if (alive) setConfigLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => writeString('se_lang', lang), [lang]);
  useEffect(() => writeString('se_theme', theme), [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'ps';
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.classList.toggle('light', theme === 'light');
  }, [lang, theme]);

  useEffect(() => {
    if (!currentUser || canAccessPage(currentUser.roleSlug, activePage)) return;
    setActivePage(navItems[0]?.id || 'dashboard');
  }, [activePage, currentUser, navItems]);

  const showToast = useCallback((message, type = 'ok') => {
    const id = makeId('toast');
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, []);

  const refreshData = useCallback(async () => {
    if (!supabaseClient || !currentUser) return;
    setDataLoading(true);
    try {
      const data = await loadOperationalData(supabaseClient);
      setCases(data.cases);
      setWarrants(data.warrants);
      setTargets(data.targets);
      setAuditLog(data.auditLog);
      setEvidence(data.evidence);
      setStatusRows(data.statusRows);
      setSettingsRows(data.settings);
      setUsers(data.users);
      setTrafficData(data.trafficRecords);
      setAlerts(data.alerts);
      setDashboardStats(data.dashboardStats);
    } finally {
      setDataLoading(false);
    }
  }, [currentUser, supabaseClient]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const recordAudit = useCallback(async (action, detail, userOverride = currentUser) => {
    if (!userOverride) return;
    const localRow = localAuditRow(userOverride, action, detail);
    setAuditLog((items) => [localRow, ...items].slice(0, 500));

    if (!supabaseClient) return;
    try {
      const { error } = await insertAuditLog(supabaseClient, userOverride.id, action, detail);
      if (error) throw error;
    } catch {
      showToast('Audit log write failed. Check Supabase table policies.', 'warn');
    }
  }, [currentUser, showToast, supabaseClient]);

  const requireActiveWarrant = useCallback(async (actionLabel) => {
    if (isWarrantActive(warrant)) return true;
    const status = getWarrantStatus(warrant);
    const detail = `${actionLabel} blocked. Access status: ${status}.`;
    showToast('Access window is not active. Sensitive action blocked.', 'warn');
    await recordAudit('user attempted access after expiry', detail);
    return false;
  }, [recordAudit, showToast, warrant]);

  const recordEvidence = useCallback(async (action, detail, userOverride = currentUser) => {
    const localRow = localEvidenceRow(action, detail);
    setEvidence((items) => [localRow, ...items].slice(0, 200));

    if (!supabaseClient || !userOverride) return;
    try {
      const { error } = await insertEvidence(supabaseClient, userOverride.id, action, detail);
      if (error) throw error;
    } catch {
      showToast('Evidence write failed. Check Supabase table policies.', 'warn');
    }
  }, [currentUser, showToast, supabaseClient]);

  const pushAlert = useCallback((message) => {
    const clean = sanitizeText(message);
    const localId = makeId('alert');
    setAlerts((items) => [{ id: localId, message: clean }, ...items].slice(0, 10));
    recordAudit('خبرتیا', clean);
    if (supabaseClient && currentUser) {
      insertAlert(supabaseClient, currentUser.id, clean)
        .then(({ data, error }) => {
          if (error) throw error;
          if (data?.id) {
            setAlerts((items) => items.map((item) => (item.id === localId ? {
              ...item,
              id: data.id,
              level: data.level,
              status: data.status,
              createdAtISO: data.created_at
            } : item)));
          }
        })
        .catch(() => {
          showToast('Alert write failed. Check Supabase table policies.', 'warn');
        });
    }
  }, [currentUser, recordAudit, showToast, supabaseClient]);

  const runDashboardSearch = useCallback(async () => {
    if (!await requireActiveWarrant('IPinfo lookup')) return;
    const ip = sanitizeText(query);
    if (!ip) {
      setIpLookup({ loading: false, error: 'Enter an IP address to search.', result: null });
      showToast('Enter an IP address to search.', 'warn');
      return;
    }

    setIpLookup((state) => ({ ...state, loading: true, error: '' }));
    try {
      const result = await lookupIpInfo(ip);
      setIpLookup({ loading: false, error: '', result });
      showToast(`IPinfo lookup completed for ${result.ip || ip}.`);
      await recordAudit('IPinfo lookup', result.ip || ip);
      if (supabaseClient && currentUser && result.ip) {
        const { error } = await insertTrafficRecord(supabaseClient, currentUser.id, {
          ...result,
          source: 'ipinfo_lookup',
          metadata: { lookupQuery: ip }
        });
        if (error) {
          showToast(error.message || 'Traffic record write failed.', 'warn');
        } else {
          await refreshData();
        }
      }
    } catch (error) {
      const message = error.message || 'IPinfo lookup failed.';
      setIpLookup({ loading: false, error: message, result: null });
      showToast(message, 'warn');
      await recordAudit('IPinfo lookup failed', `${ip}: ${message}`);
    }
  }, [currentUser, query, recordAudit, refreshData, requireActiveWarrant, showToast, supabaseClient]);

  const logout = useCallback(async () => {
    if (supabaseClient && currentSessionId) {
      await endUserSession(supabaseClient, currentSessionId).catch(() => {});
    }
    await signOutOfSupabase(supabaseClient);
    setCurrentUser(null);
    setWarrant(null);
    setSessionSeconds(SESSION_LENGTH);
    setActivePage('dashboard');
    setSidebarOpen(false);
    setCases([]);
    setAuditLog([]);
    setEvidence([]);
    setTargets([]);
    setWarrants([]);
    setUsers([]);
    setStatusRows([]);
    setSettingsRows([]);
    setTrafficData([]);
    setDashboardStats([]);
    setCurrentSessionId(null);
    setExpiryLoggedFor('');
  }, [currentSessionId, supabaseClient]);

  useEffect(() => {
    if (!currentUser) return undefined;
    const timer = window.setInterval(() => setSessionSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && sessionSeconds === 0) {
      showToast('د غونډې وخت ختم شو.', 'warn');
      logout();
    }
  }, [currentUser, logout, sessionSeconds, showToast]);

  useEffect(() => {
    if (!currentUser) return undefined;
    let idleTimer;
    const resetIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        showToast('د بې کارۍ له امله سیستم وتړل شو.', 'warn');
        logout();
      }, IDLE_LENGTH * 1000);
    };
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach((eventName) => document.addEventListener(eventName, resetIdle));
    resetIdle();
    return () => {
      window.clearTimeout(idleTimer);
      ['mousemove', 'keydown', 'click', 'touchstart'].forEach((eventName) => document.removeEventListener(eventName, resetIdle));
    };
  }, [currentUser, logout, showToast]);

  const completeLogin = async ({ user, warrant: legalWarrant }) => {
    setCurrentUser(user);
    setWarrant(legalWarrant);
    setSessionSeconds(SESSION_LENGTH);
    setExpiryLoggedFor('');
    showToast('ننوتل بریالي شول.');

    if (supabaseClient) {
      try {
        const { data, error } = await insertUserSession(supabaseClient, user.id, null, {
          event: 'login_complete',
          warrantNumber: legalWarrant.number,
          accessStartTime: legalWarrant.accessStartTime,
          accessEndTime: legalWarrant.accessEndTime,
          accessStatus: legalWarrant.status
        });
        if (!error) setCurrentSessionId(data.id);
      } catch {
        showToast('User session write failed. Check Supabase table policies.', 'warn');
      }
    }

    if (supabaseClient) {
      try {
        const { error } = await insertOrder(supabaseClient, user.id, 'warrant', {
          orderNumber: legalWarrant.number,
          title: 'Active legal order',
          courtOrderFileName: legalWarrant.courtOrderFileName,
          accessStartTime: legalWarrant.accessStartTime,
          accessEndTime: legalWarrant.accessEndTime,
          approvedBy: legalWarrant.approvedBy,
          legalBasisNote: legalWarrant.legalBasisNote,
          status: legalWarrant.status.toLowerCase(),
          expiresAt: legalWarrant.expiresAt,
          priority: 'High'
        });
        if (error) throw error;
      } catch {
        showToast('Legal order already exists or could not be stored.', 'warn');
      }
    }

    await recordAudit('warrant uploaded', legalWarrant.courtOrderFileName, user);
    await recordAudit('warrant approved', `${legalWarrant.number} · ${legalWarrant.approvedBy}`, user);
    await recordAudit('access started', legalWarrant.number, user);
    await recordAudit('ننوتل', legalWarrant.number, user);
    await recordEvidence('قانوني ننوتل', `${user.name} · ${legalWarrant.number}`, user);
  };

  const navigate = async (pageId) => {
    if (currentUser && !canAccessPage(currentUser.roleSlug, pageId)) {
      showToast('ستاسو رول دې برخې ته اجازه نه لري.', 'warn');
      return;
    }
    if (currentUser && SENSITIVE_PAGES.has(pageId) && !await requireActiveWarrant(`open ${pageId}`)) {
      return;
    }
    setActivePage(pageId);
    setSidebarOpen(false);
  };

  const addOrderBackedItem = async (type, payload, successMessage) => {
    if (!await requireActiveWarrant(`create ${type}`)) return false;
    if (!supabaseClient || !currentUser) {
      showToast('Supabase connection is required for this action.', 'warn');
      return false;
    }

    const { error } = await insertOrder(supabaseClient, currentUser.id, type, payload);
    if (error) {
      showToast(error.message || 'Supabase write failed.', 'warn');
      return false;
    }

    await refreshData();
    showToast(successMessage);
    return true;
  };

  const removeOrderBackedItem = async (id, auditAction) => {
    if (!await requireActiveWarrant(auditAction)) return false;
    if (!supabaseClient) {
      showToast('Supabase connection is required for this action.', 'warn');
      return false;
    }
    const { error } = await deleteOrder(supabaseClient, id);
    if (error) {
      showToast(error.message || 'Supabase delete failed.', 'warn');
      return false;
    }
    await recordAudit(auditAction, id);
    await refreshData();
    return true;
  };

  const changeLang = async (value) => {
    setLang(value);
    if (supabaseClient && currentUser) {
      await upsertSetting(supabaseClient, 'ui.language', { value }, currentUser.id);
    }
  };

  const changeTheme = async (value) => {
    setTheme(value);
    if (supabaseClient && currentUser) {
      await upsertSetting(supabaseClient, 'ui.theme', { value }, currentUser.id);
    }
  };

  const revokeAccess = useCallback(async () => {
    if (!warrant) return;
    setWarrant({ ...warrant, status: WARRANT_STATUS.REVOKED });
    showToast('Legal access has been revoked.', 'warn');
    await recordAudit('access revoked', warrant.number);
  }, [recordAudit, showToast, warrant]);

  useEffect(() => {
    if (!currentUser || !warrant) return;

    const status = getWarrantStatus(warrant);
    if (status !== WARRANT_STATUS.EXPIRED || expiryLoggedFor === warrant.number) return;

    setWarrant((current) => (current ? { ...current, status: WARRANT_STATUS.EXPIRED } : current));
    setExpiryLoggedFor(warrant.number);
    showToast('Legal access window expired. Sensitive actions are blocked.', 'warn');
    recordAudit('access expired', warrant.number);
  }, [currentUser, expiryLoggedFor, recordAudit, showToast, warrant]);

  const healthRows = useMemo(() => (
    statusRows.length > 0 ? statusRows : [
      { id: 'auth', name: 'Supabase Auth', status: supabaseClient ? 'Configured' : 'Missing backend environment', tone: supabaseClient ? 'ok' : 'warn' },
      { id: 'ipinfo', name: 'IPinfo backend', status: 'Backend endpoint only', tone: 'ok' },
      { id: 'tables', name: 'Supabase tables', status: dataLoading ? 'Loading' : 'Awaiting live rows', tone: dataLoading ? 'gold' : 'warn' }
    ]
  ), [dataLoading, statusRows, supabaseClient]);

  const page = useMemo(() => {
    const commonQuery = query.trim();
    const pages = {
      dashboard: (
        <Dashboard
          cases={cases}
          trafficData={trafficData}
          alerts={alerts}
          dataLoading={dataLoading}
          ipLookup={ipLookup}
          dashboardStats={dashboardStats}
          onDismissAlert={async (id) => {
            setAlerts((items) => items.filter((item) => item.id !== id));
            if (supabaseClient && currentUser && /^[0-9a-f-]{36}$/i.test(id)) {
              const { error } = await acknowledgeAlert(supabaseClient, id, currentUser.id);
              if (error) showToast(error.message || 'Alert acknowledgement failed.', 'warn');
            }
          }}
          onFaceCheck={() => {
            const text = 'Biometric review is available only through an approved secure provider.';
            setFaceResult(text);
            recordAudit('مخ پیژندنه', text);
          }}
        />
      ),
      cases: <Cases cases={cases} query={commonQuery} onAddCase={async (item) => {
        const ok = await addOrderBackedItem('case', item, 'قضیه ثبت شوه.');
        if (ok) await recordAudit('نوی قضیه', item.title);
        return ok;
      }} onRemoveCase={(id) => removeOrderBackedItem(id, 'قضیه لرې شوه')} />,
      map: <MapPage points={trafficData} onProvinceSelect={(province) => recordAudit('Province selected', province)} />,
      analytics: <Analytics cases={cases} trafficData={trafficData} />,
      network: <NetworkPage trafficData={trafficData} query={commonQuery} />,
      warrants: <Warrants warrants={warrants} onAddWarrantFile={async (file) => {
        if (!file) return false;
        const item = {
          orderNumber: `FILE-${Date.now()}`,
          name: sanitizeText(file.name),
          fileName: sanitizeText(file.name),
          sizeLabel: `${Math.ceil(file.size / 1024)} KB`,
          title: sanitizeText(file.name),
          country: 'Afghanistan'
        };
        const ok = await addOrderBackedItem('warrant', item, 'د حکم metadata ثبت شوه.');
        if (ok) await recordAudit('حکم ثبت', item.name);
        return ok;
      }} onRemoveWarrant={(id) => removeOrderBackedItem(id, 'حکم لرې شو')} />,
      phone: <PhonePage warrant={warrant} onBeforeClassify={() => requireActiveWarrant('phone classification')} onClassify={(phone, result) => {
        recordAudit('تلیفون طبقه بندي', `${phone} (${result.country})`);
        recordEvidence('تلیفون workflow', `${result.normalized} -> ${result.country}`);
      }} />,
      social: <Social targets={targets} query={commonQuery} onAddTarget={async (item) => {
        const ok = await addOrderBackedItem('social_target', {
          ...item,
          title: `${item.platform}: ${item.target}`,
          orderNumber: `SOC-${Date.now()}`
        }, 'هدف ثبت شو.');
        if (ok) await recordAudit('هدف اضافه', `${item.platform}: ${item.target}`);
        return ok;
      }} onRemoveTarget={(id) => removeOrderBackedItem(id, 'هدف لرې شو')} />,
      keyboard: <Keystroke storedFingerprint={typingFingerprint} onSaveFingerprint={async (fingerprint) => {
        if (!await requireActiveWarrant('typing fingerprint capture')) return false;
        setTypingFingerprint(fingerprint);
        recordAudit('typing fingerprint captured', 'Typing fingerprint captured for this session');
        showToast('Typing sample saved for this session.');
        return true;
      }} onHighSimilarity={async (score) => {
        if (!await requireActiveWarrant('typing similarity alert')) return;
        pushAlert(`Typing similarity ${score}%`);
      }} />,
      privacy: <Privacy />,
      evidence: <Evidence evidence={evidence} />,
      audit: <Audit auditLog={auditLog} onClearAudit={async () => {
        if (!await requireActiveWarrant('clear audit view')) return;
        setAuditLog([]);
        recordAudit('Audit view cleared', 'Visible audit rows were cleared locally; Supabase records remain retained.');
        showToast('Visible audit rows cleared locally.', 'warn');
      }} />,
      users: <UsersPage users={users} />,
      health: <Health statusRows={healthRows} />,
      'behavioral-identity': <BehavioralIdentityGraph
        onAudit={(action, detail) => recordAudit(action, detail)}
        onEvidenceNote={(title, detail) => recordEvidence(title, detail)}
      />,
      assistant: <Assistant
        alerts={alerts}
        auditLog={auditLog}
        statusRows={healthRows}
        warrant={warrant}
        onApprovalRequest={(result) => recordAudit('AI approval requested', `${result.action} - ${result.riskLevel}`)}
      />,
      settings: <SettingsPage lang={lang} theme={theme} settingsRows={settingsRows} onLangChange={changeLang} onThemeChange={changeTheme} onReset={() => {
        clearAppStorage();
        setTypingFingerprint(null);
        showToast('Local UI cache reset شو.', 'warn');
      }} />
    };
    return pages[activePage] ?? pages.dashboard;
  }, [
    activePage,
    alerts,
    auditLog,
    cases,
    currentUser,
    dataLoading,
    evidence,
    healthRows,
    lang,
    pushAlert,
    query,
    recordAudit,
    recordEvidence,
    refreshData,
    requireActiveWarrant,
    settingsRows,
    showToast,
    supabaseClient,
    targets,
    theme,
    trafficData,
    typingFingerprint,
    users,
    warrant,
    warrants
  ]);

  if (!currentUser) {
    return (
      <>
        <LoginWizard
          configLoading={configLoading}
          configError={configError}
          supabaseClient={supabaseClient}
          onComplete={completeLogin}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  return (
    <>
      <Shell
        activePage={activePage}
        lang={lang}
        theme={theme}
        query={query}
        sidebarOpen={sidebarOpen}
        navItems={navItems}
        user={currentUser}
        warrant={warrant}
        sessionSeconds={sessionSeconds}
        onNavigate={navigate}
        onLogout={logout}
        onLangChange={changeLang}
        onThemeToggle={() => changeTheme(theme === 'light' ? 'dark' : 'light')}
        onQueryChange={setQuery}
        onSearchSubmit={runDashboardSearch}
        searchLoading={ipLookup.loading}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onRevokeWarrant={revokeAccess}
      >
        <Suspense fallback={<section className="card loading-card">Loading section...</section>}>
          {page}
        </Suspense>
      </Shell>
      <Modal open={Boolean(faceResult)} title="د مخ پیژندنې پایله" onClose={() => setFaceResult('')}>
        <p>{faceResult}</p>
        <div className="notice">Face matching requires an approved backend provider, documented legal basis, and human review.</div>
      </Modal>
      <ToastStack toasts={toasts} />
    </>
  );
}
