import { getWarrantStatus } from './warrant.js';

export const AI_ASSISTANT_ACTIONS = [
  { id: 'case_analysis', label: 'Case Analysis', pashtoLabel: 'د قضیې تحلیل', sensitive: false },
  { id: 'device_analysis', label: 'Device Analysis', pashtoLabel: 'د وسیلې تحلیل', sensitive: false },
  { id: 'behavioral_analysis', label: 'Behavioral Analysis', pashtoLabel: 'رفتاري تحلیل', sensitive: false },
  { id: 'timeline_analysis', label: 'Timeline Analysis', pashtoLabel: 'د مهالویش تحلیل', sensitive: false },
  { id: 'report_generator', label: 'Report Generator', pashtoLabel: 'د راپور جوړونکی', sensitive: true }
];

const LEGACY_ACTION_MAP = {
  case: 'case_analysis',
  report: 'report_generator',
  audit: 'timeline_analysis',
  errors: 'device_analysis',
  alerts: 'timeline_analysis',
  next_step: 'case_analysis',
  warrant: 'timeline_analysis',
  health: 'device_analysis'
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasHighRiskText(value) {
  return /high|critical|expired|revoked|vpn|tor|proxy|failed|denied|warning|بحراني|خطر|رد|ناکام/i.test(String(value || ''));
}

function source(label, count, ids = []) {
  return {
    label,
    count,
    ids: ids.filter(Boolean).slice(0, 8)
  };
}

function normalizeAction(actionId) {
  const id = LEGACY_ACTION_MAP[actionId] || actionId;
  return AI_ASSISTANT_ACTIONS.find((item) => item.id === id) || AI_ASSISTANT_ACTIONS[0];
}

function buildContext(context = {}) {
  const cases = asArray(context.cases);
  const warrants = asArray(context.warrants);
  const auditLog = asArray(context.auditLog);
  const evidence = asArray(context.evidence);
  const alerts = asArray(context.alerts);
  const sessions = asArray(context.sessions);
  const deviceRecords = asArray(context.deviceRecords);
  const typingProfiles = asArray(context.typingProfiles);
  const trafficData = asArray(context.trafficData);
  const statusRows = asArray(context.statusRows);
  const dashboardStats = asArray(context.dashboardStats);
  const approvalRequests = asArray(context.approvalRequests);
  const users = asArray(context.users);
  const warrantStatus = getWarrantStatus(context.warrant);

  const highRiskAlerts = alerts.filter((item) => hasHighRiskText(`${item.level} ${item.message} ${item.status}`));
  const riskyTraffic = trafficData.filter((item) => item.vpn || item.proxy || item.tor || item.risk === 'high');
  const failedAudit = auditLog.filter((item) => hasHighRiskText(`${item.action} ${item.detail}`));
  const degradedStatus = statusRows.filter((item) => hasHighRiskText(`${item.name} ${item.status} ${item.tone}`));
  const activeSessions = sessions.filter((item) => item.status === 'active' || !item.endedAt);

  return {
    cases,
    warrants,
    auditLog,
    evidence,
    alerts,
    sessions,
    deviceRecords,
    typingProfiles,
    trafficData,
    statusRows,
    dashboardStats,
    approvalRequests,
    users,
    warrantStatus,
    highRiskAlerts,
    riskyTraffic,
    failedAudit,
    degradedStatus,
    activeSessions,
    totalRecords: cases.length + warrants.length + auditLog.length + evidence.length + alerts.length
      + sessions.length + deviceRecords.length + typingProfiles.length + trafficData.length + statusRows.length
      + approvalRequests.length
  };
}

function confidenceFor(ctx) {
  if (ctx.totalRecords >= 25 && ctx.evidence.length > 0 && ctx.auditLog.length > 0) return 'High';
  if (ctx.totalRecords >= 8) return 'Medium';
  if (ctx.totalRecords > 0) return 'Low';
  return 'Insufficient data';
}

function riskFor(action, ctx) {
  if (ctx.warrantStatus !== 'Active') return 'High';

  let score = 0;
  score += Math.min(ctx.highRiskAlerts.length, 3);
  score += Math.min(ctx.riskyTraffic.length, 2);
  score += Math.min(ctx.failedAudit.length, 2);
  score += Math.min(ctx.degradedStatus.length, 2);
  if (action.sensitive) score += 1;

  if (score >= 6) return 'High';
  if (score >= 3) return 'Medium';
  return 'Low';
}

function riskReasons(ctx) {
  const reasons = [];
  if (ctx.warrantStatus !== 'Active') reasons.push(`Warrant access status is ${ctx.warrantStatus}.`);
  if (ctx.highRiskAlerts.length) reasons.push(`${ctx.highRiskAlerts.length} unresolved alert record(s) require review.`);
  if (ctx.riskyTraffic.length) reasons.push(`${ctx.riskyTraffic.length} network record(s) include VPN, Tor, proxy, or high-risk indicators.`);
  if (ctx.failedAudit.length) reasons.push(`${ctx.failedAudit.length} audit record(s) include failed, denied, expired, or warning signals.`);
  if (ctx.degradedStatus.length) reasons.push(`${ctx.degradedStatus.length} system status row(s) report degraded conditions.`);
  return reasons.length ? reasons : ['No high-risk operational signals were found in the loaded records.'];
}

function evidenceSources(ctx) {
  return [
    source('Case records', ctx.cases.length, ctx.cases.map((item) => item.id)),
    source('Warrant records', ctx.warrants.length, ctx.warrants.map((item) => item.id)),
    source('Audit records', ctx.auditLog.length, ctx.auditLog.map((item) => item.id)),
    source('Evidence records', ctx.evidence.length, ctx.evidence.map((item) => item.id)),
    source('Alert records', ctx.alerts.length, ctx.alerts.map((item) => item.id)),
    source('Session logs', ctx.sessions.length, ctx.sessions.map((item) => item.id)),
    source('Device records', ctx.deviceRecords.length, ctx.deviceRecords.map((item) => item.id)),
    source('Typing profile records', ctx.typingProfiles.length, ctx.typingProfiles.map((item) => item.id)),
    source('Traffic records', ctx.trafficData.length, ctx.trafficData.map((item) => item.id)),
    source('Approval request records', ctx.approvalRequests.length, ctx.approvalRequests.map((item) => item.id)),
    source('System status records', ctx.statusRows.length, ctx.statusRows.map((item) => item.id))
  ].filter((item) => item.count > 0);
}

function card(title, value, detail, tone = 'gold') {
  return { title, value, detail, tone };
}

function analysisCards(action, ctx) {
  const base = [
    card('Cases', ctx.cases.length, 'Loaded case records available for review.'),
    card('Evidence', ctx.evidence.length, 'Evidence notes and chain records available for summary.'),
    card('Alerts', ctx.alerts.length, `${ctx.highRiskAlerts.length} alert(s) carry elevated risk signals.`, ctx.highRiskAlerts.length ? 'danger' : 'ok'),
    card('Warrant status', ctx.warrantStatus, 'Sensitive follow-up requires an active legal access window.', ctx.warrantStatus === 'Active' ? 'ok' : 'danger')
  ];

  if (action.id === 'device_analysis') {
    return [
      card('Device records', ctx.deviceRecords.length, 'Registered device records loaded from operations data.'),
      card('Traffic records', ctx.trafficData.length, `${ctx.riskyTraffic.length} network record(s) require network review.`, ctx.riskyTraffic.length ? 'warn' : 'ok'),
      card('Active sessions', ctx.activeSessions.length, 'Session logs currently showing active or open sessions.'),
      card('System status', ctx.statusRows.length, `${ctx.degradedStatus.length} degraded system row(s).`, ctx.degradedStatus.length ? 'warn' : 'ok')
    ];
  }

  if (action.id === 'behavioral_analysis') {
    return [
      card('Typing profiles', ctx.typingProfiles.length, 'Typing profile records available for behavioral review.'),
      card('Behavioral notes', ctx.evidence.filter((item) => /typing|behavior|keyboard|رفتار|کیبورډ/i.test(`${item.action} ${item.detail}`)).length, 'Evidence records with behavioral context.'),
      card('Audit signals', ctx.failedAudit.length, 'Audit records with warning or failed-action language.', ctx.failedAudit.length ? 'warn' : 'ok'),
      card('Human review', 'Required', 'Behavioral analysis is non-decisive and must remain evidence-led.', 'gold')
    ];
  }

  if (action.id === 'timeline_analysis') {
    return [
      card('Audit entries', ctx.auditLog.length, 'Chronological operator and system activity.'),
      card('Evidence entries', ctx.evidence.length, 'Evidence events available for timeline placement.'),
      card('Alert entries', ctx.alerts.length, 'Alert events available for timeline placement.'),
      card('Session entries', ctx.sessions.length, 'Session starts, endings, and status changes.')
    ];
  }

  if (action.id === 'report_generator') {
    return [
      card('Executive report scope', ctx.totalRecords, 'Total loaded operational records considered.'),
      card('Risk posture', riskFor(action, ctx), 'Report draft requires administrator approval before distribution.'),
      card('Evidence sources', evidenceSources(ctx).length, 'Distinct internal source groups used.'),
      card('Automatic action', 'Not allowed', 'The assistant can draft only; it cannot submit, approve, or distribute.', 'danger')
    ];
  }

  return base;
}

function timelineFrom(ctx) {
  const rows = [
    ...ctx.auditLog.map((item) => ({
      time: item.time,
      type: 'Audit',
      title: item.action,
      detail: item.detail || item.user,
      sourceId: item.id
    })),
    ...ctx.evidence.map((item) => ({
      time: item.time,
      type: 'Evidence',
      title: item.action,
      detail: item.detail,
      sourceId: item.id
    })),
    ...ctx.alerts.map((item) => ({
      time: item.createdAt,
      type: 'Alert',
      title: item.message,
      detail: item.level || item.status,
      sourceId: item.id
    })),
    ...ctx.sessions.map((item) => ({
      time: item.startedAt || item.lastSeenAt || item.createdAt,
      type: 'Session',
      title: item.status || 'Session activity',
      detail: item.userAgent || item.user || '',
      sourceId: item.id
    }))
  ];

  return rows
    .filter((item) => item.title || item.detail)
    .slice(0, 12);
}

function recommendedNextSteps(action, ctx) {
  const steps = [];
  if (ctx.warrantStatus !== 'Active') {
    steps.push('Confirm or renew the legal access window before sensitive follow-up.');
  }
  if (ctx.highRiskAlerts.length) {
    steps.push('Review unresolved high-risk alerts and attach analyst notes to the related case records.');
  }
  if (action.id === 'device_analysis' && ctx.riskyTraffic.length) {
    steps.push('Correlate high-risk network records with device and session records before escalating.');
  }
  if (action.id === 'behavioral_analysis') {
    steps.push('Treat behavioral similarity as supporting context only and require human evidence review.');
  }
  if (action.id === 'report_generator') {
    steps.push('Route the report draft for administrator and legal supervisor approval before sharing.');
  }
  steps.push('Preserve the audit trail for every decision and follow-up request.');
  return [...new Set(steps)];
}

function executiveSummary(action, notes, ctx, riskLevel, confidenceLevel) {
  const noteText = notes ? `Operator notes were included for context.` : 'No operator notes were provided.';
  return {
    headline: `${action.label} completed with ${confidenceLevel.toLowerCase()} confidence and ${riskLevel.toLowerCase()} risk.`,
    keyFindings: [
      `${ctx.totalRecords} internal record(s) were available to the assistant.`,
      `${ctx.alerts.length} alert record(s), ${ctx.auditLog.length} audit record(s), and ${ctx.evidence.length} evidence record(s) were considered.`,
      noteText,
      `Current warrant access status is ${ctx.warrantStatus}.`
    ],
    operationalPosture: riskLevel === 'High'
      ? 'Elevated review posture: require legal and administrator approval before any sensitive operational step.'
      : 'Controlled review posture: continue with documented human review.'
  };
}

function sensitiveAction(action, ctx) {
  const affectedRecords = evidenceSources(ctx).map((item) => `${item.label}: ${item.count}`);
  return {
    required: true,
    explanation: 'The assistant provides analysis only and cannot delete, modify, approve, revoke, submit, distribute, or contact external systems.',
    impact: action.sensitive
      ? 'A report draft may influence operational decisions, so administrator approval is required before it is attached, distributed, or acted on.'
      : 'No operational change is made. Any follow-up action must be performed separately by an authorized operator.',
    requiredPermissions: 'System Administrator approval and an active warrant are required before sensitive follow-up.',
    affectedRecords,
    requiredHumanApproval: 'Administrator approval is required before any delete, modify, approve, revoke, submit, distribute, or external action.',
    canActAutomatically: false
  };
}

export function runOperationalAssistant(actionId, notes, context = {}) {
  const action = normalizeAction(actionId);
  const cleanNotes = String(notes || '').trim();
  const ctx = buildContext(context);
  const riskLevel = riskFor(action, ctx);
  const confidenceLevel = confidenceFor(ctx);
  const sources = evidenceSources(ctx);

  if (ctx.totalRecords === 0 && !cleanNotes) {
    return {
      action: action.label,
      mode: 'operational_analysis',
      summary: 'No internal operational records are currently loaded for this analysis.',
      confidenceLevel: 'Insufficient data',
      evidenceSourcesUsed: [],
      riskAssessment: { level: 'Medium', reasons: ['Operational data must be loaded before a reliable analysis can be prepared.'] },
      recommendedNextSteps: ['Load or create the relevant operational records, then rerun the analysis.'],
      analysisCards: analysisCards(action, ctx),
      evidenceTimeline: [],
      executiveSummary: executiveSummary(action, cleanNotes, ctx, 'Medium', 'Insufficient data'),
      sensitiveAction: sensitiveAction(action, ctx),
      canActAutomatically: false,
      requiredHumanApproval: 'Administrator approval is required before any sensitive follow-up.'
    };
  }

  return {
    action: action.label,
    mode: 'operational_analysis',
    summary: `${action.label} used ${sources.length} internal source group(s). The assistant found ${ctx.highRiskAlerts.length} elevated alert signal(s), ${ctx.riskyTraffic.length} risky network signal(s), and ${ctx.failedAudit.length} audit warning signal(s).`,
    confidenceLevel,
    evidenceSourcesUsed: sources,
    riskAssessment: {
      level: riskLevel,
      reasons: riskReasons(ctx)
    },
    recommendedNextSteps: recommendedNextSteps(action, ctx),
    analysisCards: analysisCards(action, ctx),
    evidenceTimeline: timelineFrom(ctx),
    executiveSummary: executiveSummary(action, cleanNotes, ctx, riskLevel, confidenceLevel),
    sensitiveAction: sensitiveAction(action, ctx),
    canActAutomatically: false,
    requiredHumanApproval: 'Administrator approval is required before any sensitive follow-up.'
  };
}

export const runPermissionFirstAssistant = runOperationalAssistant;
