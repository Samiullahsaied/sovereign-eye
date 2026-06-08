import { Activity, AlertTriangle, Bot, FileText, Send, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { useT } from '../i18n/index.jsx';
import { AI_ASSISTANT_ACTIONS, runOperationalAssistant } from '../lib/assistant.js';

function countRecords(groups) {
  return Object.values(groups).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0);
}

function toneClass(tone) {
  if (tone === 'danger') return 'danger';
  if (tone === 'warn') return 'warn';
  if (tone === 'ok') return 'ok';
  return 'gold';
}

export function Assistant({
  warrant,
  cases = [],
  warrants = [],
  auditLog = [],
  evidence = [],
  alerts = [],
  sessions = [],
  deviceRecords = [],
  typingProfiles = [],
  trafficData = [],
  statusRows = [],
  dashboardStats = [],
  users = [],
  dataLoading = false,
  onApprovalRequest
}) {
  const t = useT();
  const [actionId, setActionId] = useState('case_analysis');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [approvalRequested, setApprovalRequested] = useState(false);

  useEffect(() => {
    const updateStatus = () => setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  const recordGroups = useMemo(() => ({
    cases,
    warrants,
    auditLog,
    evidence,
    alerts,
    sessions,
    deviceRecords,
    typingProfiles,
    trafficData,
    statusRows
  }), [alerts, auditLog, cases, deviceRecords, evidence, sessions, statusRows, trafficData, typingProfiles, warrants]);

  const recordCount = countRecords(recordGroups);

  const context = {
    warrant,
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
    users,
    t
  };

  const analyze = (event) => {
    event.preventDefault();
    setApprovalRequested(false);
    setError('');

    try {
      const nextResult = runOperationalAssistant(actionId, notes, context);
      const action = AI_ASSISTANT_ACTIONS.find((item) => item.id === actionId) || AI_ASSISTANT_ACTIONS[0];
      setResult(nextResult);
      setMessages((items) => [
        ...items,
        {
          id: `operator-${Date.now()}`,
          role: 'operator',
          text: notes.trim() || t(`assistant.actions.${action.id}`)
        },
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: nextResult.summary
        }
      ].slice(-8));
    } catch {
      setResult(null);
      setError(t('assistant.unavailable'));
    }
  };

  const requestApproval = () => {
    if (!result) return;
    setApprovalRequested(true);
    onApprovalRequest?.(result);
  };

  return (
    <div className="page-stack assistant-page">
      <Card title={t('assistant.title')} icon={<Bot aria-hidden="true" />}>
        {dataLoading && <div className="notice">{t('assistant.loadingRecords')}</div>}
        {isOffline && <div className="notice">{t('assistant.offline')}</div>}
        <div className="assistant-hero">
          <div>
            <h3>{t('assistant.heroTitle')}</h3>
            <p>{t('assistant.heroBody')}</p>
          </div>
          <div className="assistant-stat">
            <span>{recordCount}</span>
            <small>{t('assistant.loadedRecords')}</small>
          </div>
        </div>

        <div className="assistant-layout">
          <form className="assistant-chat" onSubmit={analyze}>
            <div className="chat-window" aria-live="polite">
              {messages.length === 0 ? (
                <div className="empty-chat">{t('assistant.emptyChat')}</div>
              ) : messages.map((message) => (
                <div key={message.id} className={`chat-bubble ${message.role}`}>
                  <strong>{message.role === 'operator' ? t('common.operator') : t('nav.assistant')}</strong>
                  <span>{message.text}</span>
                </div>
              ))}
            </div>
            <label>
              <span>{t('assistant.analysisModule')}</span>
              <select value={actionId} onChange={(event) => setActionId(event.target.value)}>
                {AI_ASSISTANT_ACTIONS.map((item) => (
                  <option key={item.id} value={item.id}>{t(`assistant.actions.${item.id}`)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('assistant.operatorContext')}</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder={t('assistant.contextPlaceholder')}
              />
            </label>
            <button className="btn primary" type="submit" disabled={dataLoading}>
              <Send aria-hidden="true" /> {t('assistant.runAnalysis')}
            </button>
            {error && <p className="form-error">{error}</p>}
          </form>

          <div className="executive-panel">
            <h3>{t('assistant.executiveSummary')}</h3>
            {result ? (
              <>
                <p>{result.executiveSummary.headline}</p>
                <ul>
                  {result.executiveSummary.keyFindings.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <div className="notice">{result.executiveSummary.operationalPosture}</div>
              </>
            ) : (
              <p className="result-message">{t('assistant.executiveEmpty')}</p>
            )}
          </div>
        </div>
      </Card>

      {result && (
        <>
          <div className="assistant-card-grid">
            {result.analysisCards.map((item) => (
              <div key={`${item.title}-${item.value}`} className={`assistant-metric ${toneClass(item.tone)}`}>
                <strong>{item.title}</strong>
                <span>{item.value}</span>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>

          <div className="grid two">
            <Card title={t('assistant.analysisResult')} icon={<Activity aria-hidden="true" />}>
              <div className="result-panel">
                <div><strong>{t('assistant.confidenceLevel')}:</strong> {result.confidenceLevel}</div>
                <div><strong>{t('assistant.riskAssessment')}:</strong> {result.riskAssessment.level}</div>
                <div><strong>{t('assistant.summary')}:</strong> {result.summary}</div>
                <div><strong>{t('assistant.automaticAction')}:</strong> {t('assistant.notAllowed')}</div>
              </div>
              <div className="result-panel">
                <strong>{t('assistant.evidenceSourcesUsed')}</strong>
                {result.evidenceSourcesUsed.length ? result.evidenceSourcesUsed.map((item) => (
                  <div key={item.label}>{item.label}: {item.count}</div>
                )) : <div>{t('assistant.noSources')}</div>}
              </div>
              <div className="result-panel">
                <strong>{t('assistant.recommendedNextSteps')}</strong>
                <ul>
                  {result.recommendedNextSteps.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </Card>

            <Card title={t('assistant.sensitiveControl')} icon={<ShieldCheck aria-hidden="true" />}>
              <div className="result-panel">
                <div><strong>{t('assistant.explanation')}:</strong> {result.sensitiveAction.explanation}</div>
                <div><strong>{t('assistant.impact')}:</strong> {result.sensitiveAction.impact}</div>
                <div><strong>{t('assistant.requiredPermissions')}:</strong> {result.sensitiveAction.requiredPermissions}</div>
                <div><strong>{t('assistant.requiredHumanApproval')}:</strong> {result.sensitiveAction.requiredHumanApproval}</div>
                <div><strong>{t('assistant.canExecuteAutomatically')}:</strong> {t('common.no')}</div>
              </div>
              <div className="result-panel">
                <strong>{t('assistant.affectedRecords')}</strong>
                {result.sensitiveAction.affectedRecords.length ? result.sensitiveAction.affectedRecords.map((item) => (
                  <div key={item}>{item}</div>
                )) : <div>{t('assistant.noAffectedRecords')}</div>}
              </div>
              <button className="btn primary" type="button" onClick={requestApproval}>
                {t('assistant.requestApproval')}
              </button>
              {approvalRequested && (
                <p className="notice">{t('assistant.approvalRecorded')}</p>
              )}
            </Card>
          </div>

          <Card title={t('assistant.evidenceTimeline')} icon={<FileText aria-hidden="true" />}>
            {result.evidenceTimeline.length ? (
              <div className="timeline">
                {result.evidenceTimeline.map((item) => (
                  <div className="timeline-item" key={`${item.type}-${item.sourceId}-${item.title}`}>
                    <strong>{item.type}: {item.title}</strong>
                    <span>{item.detail || t('assistant.noAdditionalDetail')}</span>
                    <small>{item.time || t('assistant.timeNotRecorded')}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notice">{t('assistant.noTimeline')}</div>
            )}
          </Card>

          <Card title={t('assistant.riskReasons')} icon={<AlertTriangle aria-hidden="true" />}>
            <ul className="rule-list">
              {result.riskAssessment.reasons.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

export default Assistant;
