import { getRoleLabel } from './roles.js';
import { sanitizeText } from './validation.js';

function timeLabel(value) {
  return value ? new Date(value).toLocaleString() : new Date().toLocaleString();
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapOrder(row) {
  const metadata = row.metadata || {};
  return {
    id: row.id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    title: metadata.title || row.order_number,
    suspect: metadata.suspect || '',
    priority: metadata.priority || 'High',
    country: row.country,
    status: row.status,
    expiresAt: row.expires_at || '',
    courtOrderFileName: row.court_order_file || metadata.courtOrderFileName || metadata.fileName || '',
    accessStartTime: row.access_start_time || metadata.accessStartTime || '',
    accessEndTime: row.access_end_time || metadata.accessEndTime || row.expires_at || '',
    approvedBy: row.approved_by || metadata.approvedBy || '',
    legalBasisNote: row.legal_basis_note || metadata.legalBasisNote || '',
    name: row.court_order_file || metadata.fileName || metadata.title || row.order_number,
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
  const metadata = row.metadata || {};
  return {
    id: row.id,
    name: row.service_name,
    status: row.message || row.status,
    tone: row.status === 'ready' ? 'ok' : row.status === 'warning' ? 'warn' : row.status === 'down' ? 'danger' : 'gold',
    checkedAt: timeLabel(row.checked_at),
    metadata
  };
}

function mapUser(row) {
  const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
  return {
    id: row.id,
    name: row.display_name || row.email,
    email: row.email,
    role: role?.slug || '',
    roleLabel: getRoleLabel(role?.slug),
    status: row.status
  };
}

function mapSession(row) {
  const profile = row.user_profiles || row.profiles || row.users;
  return {
    id: row.id,
    user: profile?.display_name || profile?.email || row.user_id || 'System',
    status: row.status || 'active',
    userAgent: row.user_agent || '',
    ip: row.ip_address || row.ip || row.metadata?.ip || '',
    startedAt: timeLabel(row.created_at || row.started_at),
    startedAtISO: row.created_at || row.started_at,
    lastSeenAt: timeLabel(row.last_seen_at),
    endedAt: row.ended_at ? timeLabel(row.ended_at) : '',
    metadata: row.metadata || {}
  };
}

function mapDeviceRecord(row) {
  const metadata = row.metadata || {};
  return {
    id: row.id,
    name: row.device_name || row.name || metadata.device_name || metadata.name || 'Device record',
    userId: row.user_id || row.owner_id || '',
    deviceHint: row.device_hint || metadata.device_hint || '',
    platform: row.platform || metadata.platform || '',
    risk: row.risk || metadata.risk || 'normal',
    lastSeenAt: timeLabel(row.last_seen_at || row.updated_at || row.created_at),
    metadata
  };
}

function mapTypingProfile(row) {
  const metadata = row.metadata || {};
  return {
    id: row.id,
    userId: row.user_id || row.profile_user_id || '',
    profileLabel: row.profile_label || row.label || metadata.profile_label || 'Typing profile',
    confidence: numberValue(row.confidence || metadata.confidence),
    createdAt: timeLabel(row.created_at),
    metadata
  };
}

function mapBehavioralIdentity(row) {
  return {
    id: row.id,
    account_name: row.account_name,
    platform: row.platform,
    username: row.username,
    device_hint: row.device_hint || '',
    typing_profile_id: row.typing_profile_id || '',
    activity_times: row.activity_times || '',
    language_style_notes: row.language_style_notes || '',
    known_case_id: row.known_case_id || '',
    dataMode: row.data_mode || row.dataMode || 'real',
    createdAt: timeLabel(row.created_at),
    createdAtISO: row.created_at,
    metadata: row.metadata || {}
  };
}

function mapIdentityComparison(row) {
  return {
    id: row.id,
    title: row.title,
    identityIds: row.identity_ids || [],
    typing_similarity: numberValue(row.typing_similarity),
    writing_style_similarity: numberValue(row.writing_style_similarity),
    activity_time_similarity: numberValue(row.activity_time_similarity),
    device_pattern_similarity: numberValue(row.device_pattern_similarity),
    network_signal_similarity: numberValue(row.network_signal_similarity),
    overall_similarity_score: numberValue(row.overall_similarity_score),
    confidence_label: row.confidence_label || '',
    level: row.result_level || 'Needs human review',
    createdAt: timeLabel(row.created_at),
    createdAtISO: row.created_at,
    metadata: row.metadata || {}
  };
}

function mapIdentityGraphEdge(row) {
  return {
    id: row.id,
    comparisonId: row.comparison_id,
    source: row.source_identity_id,
    target: row.target_identity_id,
    score: numberValue(row.similarity_score),
    level: row.result_level || 'Needs human review',
    createdAt: timeLabel(row.created_at),
    metadata: row.metadata || {}
  };
}

function mapIdentityAnalysisNote(row) {
  return {
    id: row.id,
    comparisonId: row.comparison_id,
    identityId: row.identity_id,
    text: row.note,
    score: numberValue(row.metadata?.score),
    createdAt: timeLabel(row.created_at),
    metadata: row.metadata || {}
  };
}

function classifySupabaseError(error) {
  if (!error) return '';
  const code = String(error.code || '').toUpperCase();
  const message = String(error.message || error.details || error.hint || '').toLowerCase();

  if (code === '42P01' || message.includes('does not exist') || message.includes('schema cache')) return 'table_missing';
  if (code === '42501' || message.includes('permission denied') || message.includes('row-level security') || message.includes('rls')) return 'rls_denied';
  if (message.includes('failed to fetch') || message.includes('network') || message.includes('timeout')) return 'network_error';
  return 'read_error';
}

function healthForTable(table, data, error, startedAt) {
  const readAt = new Date().toISOString();
  const rowCount = Array.isArray(data) ? data.length : 0;
  return {
    table,
    reachable: !error,
    rowCount,
    source: !error && rowCount > 0 ? 'live' : 'empty',
    errorType: classifySupabaseError(error),
    message: error?.message || '',
    readAt,
    durationMs: Math.max(0, Date.now() - startedAt)
  };
}

async function safeQuery(table, factory) {
  const startedAt = Date.now();
  try {
    const { data, error } = await factory();
    return {
      data: error ? [] : data || [],
      health: healthForTable(table, data || [], error, startedAt)
    };
  } catch (error) {
    return {
      data: [],
      health: healthForTable(table, [], error, startedAt)
    };
  }
}

function summarizeHealth(tableHealth) {
  const reachable = tableHealth.filter((item) => item.reachable);
  const failures = tableHealth.filter((item) => !item.reachable);
  const liveTables = tableHealth.filter((item) => item.source === 'live');
  return {
    connected: failures.length < tableHealth.length,
    tablesReachable: reachable.length,
    tablesTotal: tableHealth.length,
    lastSuccessfulReadTime: reachable.map((item) => item.readAt).sort().at(-1) || '',
    dataSource: liveTables.length > 0 ? 'live' : 'empty',
    tables: tableHealth
  };
}

export async function loadOperationalData(client) {
  const results = await Promise.all([
    safeQuery('orders', () => client.from('orders').select('*').order('created_at', { ascending: false }).limit(250)),
    safeQuery('audit_logs', () => client.from('audit_logs').select('*,user_profiles:user_id(display_name,email)').order('created_at', { ascending: false }).limit(250)),
    safeQuery('evidence', () => client.from('evidence').select('*').order('created_at', { ascending: false }).limit(250)),
    safeQuery('status', () => client.from('status').select('*').order('checked_at', { ascending: false }).limit(50)),
    safeQuery('settings', () => client.from('settings').select('*').order('updated_at', { ascending: false }).limit(100)),
    safeQuery('user_profiles', () => client.from('user_profiles').select('id,email,display_name,status,roles:role_id(slug,label_en,label_ps)').order('created_at', { ascending: false }).limit(200)),
    safeQuery('traffic_records', () => client.from('traffic_records').select('*').order('observed_at', { ascending: false }).limit(250)),
    safeQuery('alerts', () => client.from('alerts').select('*').neq('status', 'resolved').order('created_at', { ascending: false }).limit(50)),
    safeQuery('dashboard_stats', () => client.from('dashboard_stats').select('*').order('updated_at', { ascending: false }).limit(100)),
    safeQuery('user_sessions', () => client.from('user_sessions').select('*,user_profiles:user_id(display_name,email)').order('started_at', { ascending: false }).limit(250)),
    safeQuery('device_records', () => client.from('device_records').select('*').order('last_seen_at', { ascending: false }).limit(250)),
    safeQuery('typing_profiles', () => client.from('typing_profiles').select('*').order('created_at', { ascending: false }).limit(250)),
    safeQuery('behavioral_identities', () => client.from('behavioral_identities').select('*').order('created_at', { ascending: false }).limit(250)),
    safeQuery('identity_comparisons', () => client.from('identity_comparisons').select('*').order('created_at', { ascending: false }).limit(250)),
    safeQuery('identity_graph_edges', () => client.from('identity_graph_edges').select('*').order('created_at', { ascending: false }).limit(500)),
    safeQuery('identity_analysis_notes', () => client.from('identity_analysis_notes').select('*').order('created_at', { ascending: false }).limit(250))
  ]);

  const [
    ordersResult,
    auditLogsResult,
    evidenceResult,
    statusRowsResult,
    settingsResult,
    usersResult,
    trafficRecordsResult,
    alertsResult,
    dashboardStatsResult,
    sessionsResult,
    deviceRecordsResult,
    typingProfilesResult,
    behavioralIdentitiesResult,
    identityComparisonsResult,
    identityGraphEdgesResult,
    identityAnalysisNotesResult
  ] = results;

  const orders = ordersResult.data;
  const auditLogs = auditLogsResult.data;
  const evidence = evidenceResult.data;
  const statusRows = statusRowsResult.data;
  const settings = settingsResult.data;
  const users = usersResult.data;
  const trafficRecords = trafficRecordsResult.data;
  const alerts = alertsResult.data;
  const dashboardStats = dashboardStatsResult.data;
  const sessions = sessionsResult.data;
  const deviceRecords = deviceRecordsResult.data;
  const typingProfiles = typingProfilesResult.data;

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
    dashboardStats,
    sessions: sessions.map(mapSession),
    deviceRecords: deviceRecords.map(mapDeviceRecord),
    typingProfiles: typingProfiles.map(mapTypingProfile),
    behavioralIdentities: behavioralIdentitiesResult.data.map(mapBehavioralIdentity),
    identityComparisons: identityComparisonsResult.data.map(mapIdentityComparison),
    identityGraphEdges: identityGraphEdgesResult.data.map(mapIdentityGraphEdge),
    identityAnalysisNotes: identityAnalysisNotesResult.data.map(mapIdentityAnalysisNote),
    dataHealth: summarizeHealth(results.map((result) => result.health))
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
    priority: payload.priority || 'High',
    fileName: sanitizeText(payload.fileName || payload.name || payload.courtOrderFileName || ''),
    courtOrderFileName: sanitizeText(payload.courtOrderFileName || payload.fileName || payload.name || ''),
    accessStartTime: payload.accessStartTime || '',
    accessEndTime: payload.accessEndTime || '',
    approvedBy: sanitizeText(payload.approvedBy || ''),
    legalBasisNote: sanitizeText(payload.legalBasisNote || ''),
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
    court_order_file: sanitizeText(payload.courtOrderFileName || payload.fileName || payload.name || '') || null,
    access_start_time: payload.accessStartTime || null,
    access_end_time: payload.accessEndTime || payload.expiresAt || null,
    approved_by: sanitizeText(payload.approvedBy || '') || null,
    legal_basis_note: sanitizeText(payload.legalBasisNote || '') || null,
    expires_at: payload.expiresAt || payload.accessEndTime || null,
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

export async function insertBehavioralIdentity(client, userId, payload) {
  return client.from('behavioral_identities').insert({
    created_by: userId,
    account_name: sanitizeText(payload.account_name),
    platform: sanitizeText(payload.platform),
    username: sanitizeText(payload.username),
    device_hint: sanitizeText(payload.device_hint || ''),
    typing_profile_id: sanitizeText(payload.typing_profile_id || ''),
    activity_times: sanitizeText(payload.activity_times || ''),
    language_style_notes: sanitizeText(payload.language_style_notes || ''),
    known_case_id: sanitizeText(payload.known_case_id || ''),
    data_mode: 'real',
    metadata: payload.metadata || {}
  }).select('*').single();
}

export async function insertIdentityComparison(client, userId, identities, result) {
  return client.from('identity_comparisons').insert({
    created_by: userId,
    title: sanitizeText(`Behavioral comparison ${new Date().toISOString()}`),
    identity_ids: identities.map((identity) => identity.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
    typing_similarity: result.typing_similarity,
    writing_style_similarity: result.writing_style_similarity,
    activity_time_similarity: result.activity_time_similarity,
    device_pattern_similarity: result.device_pattern_similarity,
    network_signal_similarity: result.network_signal_similarity,
    overall_similarity_score: result.overall_similarity_score,
    confidence_label: result.confidence_label,
    result_level: result.level,
    metadata: {
      selectedIdentities: identities.map((identity) => ({
        id: identity.id,
        account_name: identity.account_name,
        platform: identity.platform,
        username: identity.username
      }))
    }
  }).select('*').single();
}

export async function insertIdentityGraphEdges(client, comparisonId, edges) {
  const rows = edges
    .filter((edge) => /^[0-9a-f-]{36}$/i.test(edge.source) && /^[0-9a-f-]{36}$/i.test(edge.target))
    .map((edge) => ({
      comparison_id: comparisonId,
      source_identity_id: edge.source,
      target_identity_id: edge.target,
      similarity_score: edge.score,
      result_level: edge.level,
      metadata: edge.metadata || {}
    }));

  if (!rows.length) return { data: [], error: null };
  return client.from('identity_graph_edges').insert(rows).select('*');
}

export async function insertIdentityAnalysisNote(client, userId, payload) {
  return client.from('identity_analysis_notes').insert({
    comparison_id: payload.comparisonId || null,
    identity_id: payload.identityId || null,
    created_by: userId,
    note: sanitizeText(payload.note),
    metadata: payload.metadata || {}
  }).select('*').single();
}
