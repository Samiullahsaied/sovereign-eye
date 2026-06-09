import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoginWizard } from './components/LoginWizard.jsx';
import { Modal } from './components/Modal.jsx';
import { PageErrorBoundary } from './components/PageErrorBoundary.jsx';
import { Shell } from './components/Shell.jsx';
import { ToastStack } from './components/Toast.jsx';
import { NAV_ITEMS } from './data/appConstants.js';
import { I18nProvider, createTranslator, directionForLanguage, normalizeLanguage } from './i18n/index.jsx';
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
  insertApprovalRequest,
  insertAuditLog,
  insertBehavioralIdentity,
  insertEvidence,
  insertIdentityAnalysisNote,
  insertIdentityComparison,
  insertIdentityGraphEdges,
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
  const [lang, setLang] = useState(() => normalizeLanguage(readString('se_lang', 'ps')));
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
  const [sessions, setSessions] = useState([]);
  const [deviceRecords, setDeviceRecords] = useState([]);
  const [typingProfiles, setTypingProfiles] = useState([]);
  const [behavioralIdentities, setBehavioralIdentities] = useState([]);
  const [identityComparisons, setIdentityComparisons] = useState([]);
  const [identityGraphEdges, setIdentityGraphEdges] = useState([]);
  const [identityAnalysisNotes, setIdentityAnalysisNotes] = useState([]);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [dataHealth, setDataHealth] = useState({
    connected: false,
    tablesReachable: 0,
    tablesTotal: 0,
    lastSuccessfulReadTime: '',
    dataSource: 'empty',
    tables: []
  });
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [expiryLoggedFor, setExpiryLoggedFor] = useState('');
  const loggedDataFailuresRef = useRef(new Set());

  const navItems = useMemo(() => (
    currentUser ? filterPagesForRole(NAV_ITEMS, currentUser.roleSlug) : []
  ), [currentUser]);
  const t = useMemo(() => createTranslator(lang), [lang]);

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
    document.documentElement.lang = lang;
    document.documentElement.dir = directionForLanguage(lang);
    document.body.dir = directionForLanguage(lang);
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
    if (!currentUser) return;
    if (!supabaseClient) {
      setDataHealth({
        connected: false,
        tablesReachable: 0,
        tablesTotal: 0,
        lastSuccessfulReadTime: '',
        dataSource: 'empty',
        tables: [{ table: 'supabase', reachable: false, rowCount: 0, source: 'empty', errorType: 'supabase_key_missing', message: t('health.errors.supabaseMissing') }]
      });
      return;
    }
    setDataLoading(true);
    try {
      const data = await loadOperationalData(supabaseClient);
      setDataHealth(data.dataHealth);
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
      setSessions(data.sessions || []);
      setDeviceRecords(data.deviceRecords || []);
      setTypingProfiles(data.typingProfiles || []);
      setBehavioralIdentities(data.behavioralIdentities || []);
      setIdentityComparisons(data.identityComparisons || []);
      setIdentityGraphEdges(data.identityGraphEdges || []);
      setIdentityAnalysisNotes(data.identityAnalysisNotes || []);
      setApprovalRequests(data.approvalRequests || []);

      const failures = data.dataHealth.tables.filter((table) => !table.reachable);
      if (failures.length > 0) {
        setAuditLog((items) => {
          const newRows = failures
            .filter((failure) => {
              const key = `${failure.table}:${failure.errorType}`;
              if (loggedDataFailuresRef.current.has(key)) return false;
              loggedDataFailuresRef.current.add(key);
              return true;
            })
            .map((failure) => localAuditRow(currentUser, 'data read failure', `${failure.table}: ${failure.errorType}`));
          if (!loggedDataFailuresRef.current.has('fallback_mode_activated')) {
            loggedDataFailuresRef.current.add('fallback_mode_activated');
            newRows.push(localAuditRow(currentUser, 'fallback mode activated', failures.map((failure) => failure.table).join(', ')));
          }
          return newRows.length ? [...newRows, ...items].slice(0, 500) : items;
        });

        await Promise.allSettled(
          failures
            .filter((failure) => {
              const key = `remote:${failure.table}:${failure.errorType}`;
              if (loggedDataFailuresRef.current.has(key)) return false;
              loggedDataFailuresRef.current.add(key);
              return true;
            })
            .map((failure) => insertAuditLog(supabaseClient, currentUser.id, 'data read failure', `${failure.table}: ${failure.errorType}`))
        );
        if (!loggedDataFailuresRef.current.has('remote:fallback_mode_activated')) {
          loggedDataFailuresRef.current.add('remote:fallback_mode_activated');
          await insertAuditLog(supabaseClient, currentUser.id, 'fallback mode activated', failures.map((failure) => failure.table).join(', ')).catch(() => {});
        }
      }
    } catch (error) {
      const message = error?.message || t('health.errors.network');
      setDataHealth({
        connected: false,
        tablesReachable: 0,
        tablesTotal: 0,
        lastSuccessfulReadTime: '',
        dataSource: 'empty',
        tables: [{ table: 'supabase', reachable: false, rowCount: 0, source: 'empty', errorType: 'network_error', message }]
      });
      setAuditLog((items) => [localAuditRow(currentUser, 'backend connection failure', message), ...items].slice(0, 500));
      await insertAuditLog(supabaseClient, currentUser.id, 'backend connection failure', message).catch(() => {});
    } finally {
      setDataLoading(false);
    }
  }, [currentUser, supabaseClient, t]);

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
      showToast(t('toast.auditFailed'), 'warn');
    }
  }, [currentUser, showToast, supabaseClient, t]);

  const requireActiveWarrant = useCallback(async (actionLabel) => {
    if (isWarrantActive(warrant)) return true;
    const status = getWarrantStatus(warrant);
    const detail = `${actionLabel} blocked. Access status: ${status}.`;
    showToast(t('toast.accessBlocked'), 'warn');
    await recordAudit('user attempted access after expiry', detail);
    return false;
  }, [recordAudit, showToast, t, warrant]);

  const recordEvidence = useCallback(async (action, detail, userOverride = currentUser) => {
    const localRow = localEvidenceRow(action, detail);
    setEvidence((items) => [localRow, ...items].slice(0, 200));

    if (!supabaseClient || !userOverride) return;
    try {
      const { error } = await insertEvidence(supabaseClient, userOverride.id, action, detail);
      if (error) throw error;
    } catch {
      showToast(t('toast.evidenceFailed'), 'warn');
    }
  }, [currentUser, showToast, supabaseClient, t]);

  const pushAlert = useCallback((message) => {
    const clean = sanitizeText(message);
    const localId = makeId('alert');
    setAlerts((items) => [{ id: localId, message: clean }, ...items].slice(0, 10));
    recordAudit('alert', clean);
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
          showToast(t('toast.alertFailed'), 'warn');
        });
    }
  }, [currentUser, recordAudit, showToast, supabaseClient, t]);

  const runDashboardSearch = useCallback(async () => {
    if (!await requireActiveWarrant('IPinfo lookup')) return;
    const ip = sanitizeText(query);
    if (!ip) {
      setIpLookup({ loading: false, error: t('toast.enterIp'), result: null });
      showToast(t('toast.enterIp'), 'warn');
      return;
    }

    setIpLookup((state) => ({ ...state, loading: true, error: '' }));
    try {
      const result = await lookupIpInfo(ip);
      setIpLookup({ loading: false, error: '', result });
      showToast(t('toast.ipDone', { ip: result.ip || ip }));
      await recordAudit('IPinfo lookup', result.ip || ip);
      if (supabaseClient && currentUser && result.ip) {
        const { error } = await insertTrafficRecord(supabaseClient, currentUser.id, {
          ...result,
          source: 'ipinfo_lookup',
          metadata: { lookupQuery: ip }
        });
        if (error) {
          showToast(error.message || t('toast.trafficFailed'), 'warn');
        } else {
          await refreshData();
        }
      }
    } catch (error) {
      const message = error.message || t('toast.trafficFailed');
      setIpLookup({ loading: false, error: message, result: null });
      showToast(message, 'warn');
      await recordAudit('IPinfo lookup failed', `${ip}: ${message}`);
    }
  }, [currentUser, query, recordAudit, refreshData, requireActiveWarrant, showToast, supabaseClient, t]);

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
    setSessions([]);
    setDeviceRecords([]);
    setTypingProfiles([]);
    setBehavioralIdentities([]);
    setIdentityComparisons([]);
    setIdentityGraphEdges([]);
    setIdentityAnalysisNotes([]);
    setApprovalRequests([]);
    setDataHealth({
      connected: false,
      tablesReachable: 0,
      tablesTotal: 0,
      lastSuccessfulReadTime: '',
      dataSource: 'empty',
      tables: []
    });
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
      showToast(t('toast.sessionExpired'), 'warn');
      logout();
    }
  }, [currentUser, logout, sessionSeconds, showToast, t]);

  useEffect(() => {
    if (!currentUser) return undefined;
    let idleTimer;
    const resetIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        showToast(t('toast.idleLogout'), 'warn');
        logout();
      }, IDLE_LENGTH * 1000);
    };
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach((eventName) => document.addEventListener(eventName, resetIdle));
    resetIdle();
    return () => {
      window.clearTimeout(idleTimer);
      ['mousemove', 'keydown', 'click', 'touchstart'].forEach((eventName) => document.removeEventListener(eventName, resetIdle));
    };
  }, [currentUser, logout, showToast, t]);

  const completeLogin = async ({ user, warrant: legalWarrant }) => {
    setCurrentUser(user);
    setWarrant(legalWarrant);
    setSessionSeconds(SESSION_LENGTH);
    setExpiryLoggedFor('');
    showToast(t('toast.loginSuccess'));

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
        showToast(t('toast.sessionWriteFailed'), 'warn');
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
        showToast(t('toast.orderExists'), 'warn');
      }
    }

    await recordAudit('warrant uploaded', legalWarrant.courtOrderFileName, user);
    await recordAudit('warrant approved', `${legalWarrant.number} · ${legalWarrant.approvedBy}`, user);
    await recordAudit('access started', legalWarrant.number, user);
    await recordAudit('login', legalWarrant.number, user);
    await recordEvidence('legal login', `${user.name} · ${legalWarrant.number}`, user);
  };

  const navigate = async (pageId) => {
    if (currentUser && !canAccessPage(currentUser.roleSlug, pageId)) {
      showToast(t('toast.noRoleAccess'), 'warn');
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
      showToast(t('toast.supabaseRequired'), 'warn');
      return false;
    }

    const { error } = await insertOrder(supabaseClient, currentUser.id, type, payload);
    if (error) {
      showToast(error.message || t('toast.supabaseWriteFailed'), 'warn');
      return false;
    }

    await refreshData();
    showToast(successMessage);
    return true;
  };

  const removeOrderBackedItem = async (id, auditAction) => {
    if (!await requireActiveWarrant(auditAction)) return false;
    if (!supabaseClient) {
      showToast(t('toast.supabaseRequired'), 'warn');
      return false;
    }
    const { error } = await deleteOrder(supabaseClient, id);
    if (error) {
      showToast(error.message || t('toast.supabaseDeleteFailed'), 'warn');
      return false;
    }
    await recordAudit(auditAction, id);
    await refreshData();
    return true;
  };

  const changeLang = async (value) => {
    const nextLang = normalizeLanguage(value);
    setLang(nextLang);
    if (supabaseClient && currentUser) {
      await upsertSetting(supabaseClient, 'ui.language', { value: nextLang }, currentUser.id);
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
    showToast(t('toast.accessRevoked'), 'warn');
    await recordAudit('access revoked', warrant.number);
  }, [recordAudit, showToast, warrant]);

  useEffect(() => {
    if (!currentUser || !warrant) return;

    const status = getWarrantStatus(warrant);
    if (status !== WARRANT_STATUS.EXPIRED || expiryLoggedFor === warrant.number) return;

    setWarrant((current) => (current ? { ...current, status: WARRANT_STATUS.EXPIRED } : current));
    setExpiryLoggedFor(warrant.number);
    showToast(t('toast.accessExpired'), 'warn');
    recordAudit('access expired', warrant.number);
  }, [currentUser, expiryLoggedFor, recordAudit, showToast, warrant]);

  const healthRows = useMemo(() => statusRows, [statusRows]);

  const requestAssistantApproval = useCallback(async (result) => {
    if (!await requireActiveWarrant('request assistant approval')) return false;
    if (!supabaseClient || !currentUser) {
      showToast(t('toast.supabaseRequired'), 'warn');
      return false;
    }

    const { error } = await insertApprovalRequest(supabaseClient, currentUser.id, result);
    if (error) {
      showToast(error.message || t('toast.supabaseWriteFailed'), 'warn');
      await recordAudit('AI approval request failed', error.message || result.action);
      return false;
    }

    await recordAudit('AI approval requested', `${result.action} - ${result.riskAssessment?.level || 'review'}`);
    showToast(t('assistant.approvalRecorded'));
    await refreshData();
    return true;
  }, [currentUser, recordAudit, refreshData, requireActiveWarrant, showToast, supabaseClient, t]);

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
              if (error) showToast(error.message || t('toast.alertAckFailed'), 'warn');
            }
          }}
          onFaceCheck={() => {
            const text = t('face.result');
            setFaceResult(text);
            recordAudit('face recognition', text);
          }}
        />
      ),
      cases: <Cases cases={cases} query={commonQuery} onAddCase={async (item) => {
        const ok = await addOrderBackedItem('case', item, t('cases.saveSuccess'));
        if (ok) await recordAudit('case created', item.title);
        return ok;
      }} onRemoveCase={(id) => removeOrderBackedItem(id, 'case removed')} />,
      map: (
        <MapPage
          points={trafficData}
          dataLoading={dataLoading}
          onProvinceSelect={(province) => recordAudit('Province selected', province)}
        />
      ),
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
        const ok = await addOrderBackedItem('warrant', item, t('warrant.saveSuccess'));
        if (ok) await recordAudit('warrant registered', item.name);
        return ok;
      }} onRemoveWarrant={(id) => removeOrderBackedItem(id, 'warrant removed')} />,
      phone: <PhonePage warrant={warrant} onBeforeClassify={() => requireActiveWarrant('phone classification')} onClassify={(phone, result) => {
        recordAudit('phone classified', `${phone} (${result.country})`);
        recordEvidence('phone workflow', `${result.normalized} -> ${result.country}`);
      }} />,
      social: <Social targets={targets} query={commonQuery} onAddTarget={async (item) => {
        const ok = await addOrderBackedItem('social_target', {
          ...item,
          title: `${item.platform}: ${item.target}`,
          orderNumber: `SOC-${Date.now()}`
        }, t('social.saveSuccess'));
        if (ok) await recordAudit('target added', `${item.platform}: ${item.target}`);
        return ok;
      }} onRemoveTarget={(id) => removeOrderBackedItem(id, 'target removed')} />,
      keyboard: <Keystroke storedFingerprint={typingFingerprint} onSaveFingerprint={async (fingerprint) => {
        if (!await requireActiveWarrant('typing fingerprint capture')) return false;
        setTypingFingerprint(fingerprint);
        recordAudit('typing fingerprint captured', 'Typing fingerprint captured for this session');
        showToast(t('toast.sampleSaved'));
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
        showToast(t('toast.auditCleared'), 'warn');
      }} />,
      users: <UsersPage users={users} />,
      health: <Health statusRows={healthRows} dataHealth={dataHealth} />,
      'behavioral-identity': <BehavioralIdentityGraph
        identities={behavioralIdentities}
        comparisons={identityComparisons}
        graphEdges={identityGraphEdges}
        notes={identityAnalysisNotes}
        dataLoading={dataLoading}
        dataSource={dataHealth.dataSource}
        onCreateIdentity={async (payload) => {
          if (!await requireActiveWarrant('create behavioral identity')) return false;
          if (!supabaseClient || !currentUser) {
            showToast(t('toast.supabaseRequired'), 'warn');
            return false;
          }
          const { error } = await insertBehavioralIdentity(supabaseClient, currentUser.id, payload);
          if (error) {
            showToast(error.message || t('toast.supabaseWriteFailed'), 'warn');
            return false;
          }
          await recordAudit('behavioral identity created', payload.account_name);
          await refreshData();
          return true;
        }}
        onCreateComparison={async (selectedIdentities, result, edges) => {
          if (!await requireActiveWarrant('create identity comparison')) return false;
          if (!supabaseClient || !currentUser) {
            showToast(t('toast.supabaseRequired'), 'warn');
            return false;
          }
          const { data, error } = await insertIdentityComparison(supabaseClient, currentUser.id, selectedIdentities, result);
          if (error) {
            showToast(error.message || t('toast.supabaseWriteFailed'), 'warn');
            return false;
          }
          const edgeResult = await insertIdentityGraphEdges(supabaseClient, data.id, edges);
          if (edgeResult.error) showToast(edgeResult.error.message || t('toast.supabaseWriteFailed'), 'warn');
          await recordAudit('similarity score generated', `${result.overall_similarity_score}%`);
          await refreshData();
          return data.id;
        }}
        onAddAnalysisNote={async (payload) => {
          if (!await requireActiveWarrant('add behavioral analysis note')) return false;
          if (!supabaseClient || !currentUser) {
            showToast(t('toast.supabaseRequired'), 'warn');
            return false;
          }
          const { error } = await insertIdentityAnalysisNote(supabaseClient, currentUser.id, payload);
          if (error) {
            showToast(error.message || t('toast.supabaseWriteFailed'), 'warn');
            return false;
          }
          await recordAudit('analyst note added', payload.note);
          await recordEvidence('behavioral identity analyst note', payload.note);
          await refreshData();
          return true;
        }}
        onAudit={(action, detail) => recordAudit(action, detail)}
        onEvidenceNote={(title, detail) => recordEvidence(title, detail)}
      />,
      assistant: <Assistant
        alerts={alerts}
        auditLog={auditLog}
        cases={cases}
        dashboardStats={dashboardStats}
        approvalRequests={approvalRequests}
        dataLoading={dataLoading}
        deviceRecords={deviceRecords}
        behavioralIdentities={behavioralIdentities}
        identityComparisons={identityComparisons}
        identityGraphEdges={identityGraphEdges}
        identityAnalysisNotes={identityAnalysisNotes}
        evidence={evidence}
        sessions={sessions}
        statusRows={healthRows}
        dataHealth={dataHealth}
        trafficData={trafficData}
        typingProfiles={typingProfiles}
        users={users}
        warrant={warrant}
        warrants={warrants}
        onApprovalRequest={requestAssistantApproval}
      />,
      settings: <SettingsPage lang={lang} theme={theme} settingsRows={settingsRows} onLangChange={changeLang} onThemeChange={changeTheme} onReset={() => {
        clearAppStorage();
        setTypingFingerprint(null);
        showToast(t('toast.cacheReset'), 'warn');
      }} />
    };
    return pages[activePage] ?? pages.dashboard;
  }, [
    activePage,
    alerts,
    auditLog,
    approvalRequests,
    behavioralIdentities,
    cases,
    currentUser,
    dashboardStats,
    dataHealth,
    dataLoading,
    deviceRecords,
    evidence,
    healthRows,
    identityAnalysisNotes,
    identityComparisons,
    identityGraphEdges,
    lang,
    pushAlert,
    query,
    recordAudit,
    recordEvidence,
    refreshData,
    requestAssistantApproval,
    requireActiveWarrant,
    settingsRows,
    sessions,
    showToast,
    supabaseClient,
    targets,
    theme,
    t,
    trafficData,
    typingFingerprint,
    typingProfiles,
    users,
    warrant,
    warrants
  ]);

  if (!currentUser) {
    return (
      <I18nProvider lang={lang}>
        <LoginWizard
          lang={lang}
          configLoading={configLoading}
          configError={configError}
          supabaseClient={supabaseClient}
          onLangChange={changeLang}
          onComplete={completeLogin}
        />
        <ToastStack toasts={toasts} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider lang={lang}>
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
        <PageErrorBoundary pageId={activePage} resetKey={activePage} t={t}>
          <Suspense fallback={<section className="card loading-card">{t('common.loading')}</section>}>
            {page}
          </Suspense>
        </PageErrorBoundary>
      </Shell>
      <Modal open={Boolean(faceResult)} title={t('face.title')} onClose={() => setFaceResult('')}>
        <p>{faceResult}</p>
        <div className="notice">{t('face.requiresBackend')}</div>
      </Modal>
      <ToastStack toasts={toasts} />
    </I18nProvider>
  );
}


