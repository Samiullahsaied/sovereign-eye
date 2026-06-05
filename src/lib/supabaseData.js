import { getRoleLabel } from './roles.js';
import { sanitizeText } from './validation.js';

function timeLabel(value) {
  return value ? new Date(value).toLocaleString() : new Date().toLocaleString();
}

function mapOrder(row) {
  const metadata = row.metadata || {};
  return {
    id: row.id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    title: metadata.title || row.order_number,
    suspect: metadata.suspect || '',
    priority: metadata.priority || 'لوړ',
    country: row.country,
    status: row.status,
    expiresAt: row.expires_at || '',
    name: metadata.fileName || metadata.title || row.order_number,
    sizeLabel: metadata.sizeLabel || '',
    platform: metadata.platform || '',
    target: metadata.target || metadata.title || '',
    reason: metadata.reason || '',
    createdAt: timeLabel(row.created_at),
    createdAtISO: row.created_at
  };
}

function mapTrafficRecord(row) {
  const metadata = row.metadata || {};
  const privacy = {
    vpn: Boolean(row.vpn),
    proxy: Boolean(row.proxy),
    tor: Boolean(row.tor),
    relay: Boolean(row.relay),
    hosting: Boolean(row.hosting)
  };

  return {
    id: row.id,
    time: timeLabel(row.observed_at || row.created_at),
    ip: row.ip,
    country: row.country || '',
    region: row.region || '',
    city: row.city || '',
    org: row.org || '',
    loc: typeof row.latitude === 'number' && typeof row.longitude === 'number' ? [row.latitude, row.longitude] : null,
    vpn: privacy.vpn || privacy.proxy || privacy.tor,
    proxy: privacy.proxy,
    tor: privacy.tor,
    relay: privacy.relay,
    hosting: privacy.hosting,
    risk: row.risk || 'normal',
    source: row.source || 'manual',
    metadata,
    observedAtISO: row.observed_at,
    createdAtISO: row.created_at
  };
}

function mapAlert(row) {
  return {
    id: row.id,
    message: row.message,
    level: row.level || 'warn',
    status: row.status || 'new',
    createdAt: timeLabel(row.created_at),
    createdAtISO: row.created_at,
    trafficRecordId: row.traffic_record_id || null
  };
}

function mapAudit(row) {
  const profile = row.user_profiles || row.profiles || row.users;
  return {
    id: row.id,
    time: timeLabel(row.created_at),
    user: profile?.display_name || profile?.email || row.user_id || 'System',
    action: row.action,
    detail: row.detail || ''
  };
}

function mapEvidence(row) {
  return {
    id: row.id,
    time: timeLabel(row.created_at),
    action: row.title || row.evidence_type,
    detail: row.detail || ''
  };
}

function mapStatus(row) {
  return {
    id: row.id,
    name: row.service_name,
    status: row.message || row.status,
    tone: row.status === 'ready' ? 'ok' : row.status === 'warning' ? 'warn' : row.status === 'down' ? 'danger' : 'gold',
    checkedAt: timeLabel(row.checked_at)
  };
}

function mapUser(row) {
  const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
  return {
    id: row.id,
    name: row.display_name || row.email,
    email: row.email,
    role: role?.slug || '',
    roleLabel: role?.label_en && role?.label_ps ? `${role.label_en} / ${role.label_ps}` : getRoleLabel(role?.slug),
    status: row.status
  };
}

async function safeQuery(factory, fallback) {
  const { data, error } = await factory();
  if (error) {
    return fallback;
  }
  return data || fallback;
}

export async function loadOperationalData(client) {
  const [orders, auditLogs, evidence, statusRows, settings, users, trafficRecords, alerts, dashboardStats] = await Promise.all([
    safeQuery(
      () => client.from('orders').select('*').order('created_at', { ascending: false }).limit(250),
      []
    ),
    safeQuery(
      () => client.from('audit_logs').select('*,user_profiles:user_id(display_name,email)').order('created_at', { ascending: false }).limit(250),
      []
    ),
    safeQuery(
      () => client.from('evidence').select('*').order('created_at', { ascending: false }).limit(250),
      []
    ),
    safeQuery(
      () => client.from('status').select('*').order('checked_at', { ascending: false }).limit(50),
      []
    ),
    safeQuery(
      () => client.from('settings').select('*').order('updated_at', { ascending: false }).limit(100),
      []
    ),
    safeQuery(
      () => client.from('user_profiles').select('id,email,display_name,status,roles:role_id(slug,label_en,label_ps)').order('created_at', { ascending: false }).limit(200),
      []
    ),
    safeQuery(
      () => client.from('traffic_records').select('*').order('observed_at', { ascending: false }).limit(250),
      []
    ),
    safeQuery(
      () => client.from('alerts').select('*').neq('status', 'resolved').order('created_at', { ascending: false }).limit(50),
      []
    ),
    safeQuery(
      () => client.from('dashboard_stats').select('*').order('updated_at', { ascending: false }).limit(100),
      []
    )
  ]);

  const mappedOrders = orders.map(mapOrder);

  return {
    cases: mappedOrders.filter((item) => item.orderType === 'case'),
    warrants: mappedOrders.filter((item) => item.orderType === 'warrant'),
    targets: mappedOrders.filter((item) => item.orderType === 'social_target'),
    auditLog: auditLogs.map(mapAudit),
    evidence: evidence.map(mapEvidence),
    statusRows: statusRows.map(mapStatus),
    settings,
    users: users.map(mapUser),
    trafficRecords: trafficRecords.map(mapTrafficRecord),
    alerts: alerts.map(mapAlert),
    dashboardStats
  };
}

export async function insertAuditLog(client, userId, action, detail) {
  return client.from('audit_logs').insert({
    user_id: userId,
    action: sanitizeText(action),
    detail: sanitizeText(detail)
  }).select('*').single();
}

export async function insertEvidence(client, userId, title, detail, metadata = {}) {
  return client.from('evidence').insert({
    created_by: userId,
    title: sanitizeText(title),
    detail: sanitizeText(detail),
    metadata
  }).select('*').single();
}

export async function insertAlert(client, userId, message, level = 'warn', metadata = {}) {
  return client.from('alerts').insert({
    created_by: userId,
    message: sanitizeText(message),
    level,
    metadata
  }).select('*').single();
}

export async function acknowledgeAlert(client, id, userId) {
  return client.from('alerts').update({
    status: 'acknowledged',
    acknowledged_by: userId,
    acknowledged_at: new Date().toISOString()
  }).eq('id', id).select('*').single();
}

export async function insertTrafficRecord(client, userId, payload) {
  const loc = Array.isArray(payload.loc) ? payload.loc : [];
  return client.from('traffic_records').insert({
    captured_by: userId,
    ip: payload.ip,
    country: payload.country || null,
    region: payload.region || null,
    city: payload.city || null,
    org: payload.org || null,
    latitude: Number.isFinite(loc[0]) ? loc[0] : null,
    longitude: Number.isFinite(loc[1]) ? loc[1] : null,
    vpn: Boolean(payload.privacy?.vpn || payload.vpn),
    proxy: Boolean(payload.privacy?.proxy || payload.proxy),
    tor: Boolean(payload.privacy?.tor || payload.tor),
    relay: Boolean(payload.privacy?.relay || payload.relay),
    hosting: Boolean(payload.privacy?.hosting || payload.hosting),
    risk: payload.risk || (payload.privacy?.vpn || payload.privacy?.proxy || payload.privacy?.tor ? 'high' : 'normal'),
    source: payload.source || 'manual',
    metadata: payload.metadata || {}
  }).select('*').single();
}

export async function insertUserSession(client, userId, sessionId, metadata = {}) {
  return client.from('user_sessions').insert({
    user_id: userId,
    auth_session_id: sessionId || null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    metadata
  }).select('*').single();
}

export async function endUserSession(client, id, status = 'signed_out') {
  return client.from('user_sessions').update({
    status,
    ended_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  }).eq('id', id).select('*').single();
}

export async function insertOrder(client, userId, orderType, payload) {
  const orderNumber = payload.orderNumber || `${orderType.toUpperCase()}-${Date.now()}`;
  const metadata = {
    title: sanitizeText(payload.title || payload.name || orderNumber),
    suspect: sanitizeText(payload.suspect || ''),
    priority: payload.priority || 'لوړ',
    fileName: sanitizeText(payload.fileName || payload.name || ''),
    sizeLabel: payload.sizeLabel || '',
    platform: payload.platform || '',
    target: sanitizeText(payload.target || ''),
    reason: sanitizeText(payload.reason || '')
  };

  return client.from('orders').insert({
    created_by: userId,
    order_number: orderNumber,
    order_type: orderType,
    country: payload.country || 'Afghanistan',
    status: payload.status || 'active',
    expires_at: payload.expiresAt || null,
    metadata
  }).select('*').single();
}

export async function deleteOrder(client, id) {
  return client.from('orders').delete().eq('id', id);
}

export async function upsertSetting(client, key, value, userId) {
  return client.from('settings').upsert({
    key,
    value,
    is_public: false,
    updated_by: userId,
    updated_at: new Date().toISOString()
  });
}
