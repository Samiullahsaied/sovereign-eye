import { Activity, AlertTriangle, Bot, FileText, Send, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card.jsx';
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
    users
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
          text: notes.trim() || action.label
        },
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: nextResult.summary
        }
      ].slice(-8));
    } catch {
      setResult(null);
      setError('AI Assistant is temporarily unavailable');
    }
  };

  const requestApproval = () => {
    if (!result) return;
    setApprovalRequested(true);
    onApprovalRequest?.(result);
  };

  return (
    <div className="page-stack assistant-page">
      <Card title="Operational AI Assistant" icon={<Bot aria-hidden="true" />}>
        {dataLoading && <div className="notice">Loading operational records...</div>}
        {isOffline && <div className="notice">Offline state detected. Analysis can use loaded records only.</div>}
        <div className="assistant-hero">
          <div>
            <h3>Permission-based operational analysis</h3>
            <p>
              The assistant analyzes internal records, summarizes evidence, explains alerts, reviews audit history,
              detects anomalies, and drafts reports. It cannot execute operational actions automatically.
            </p>
          </div>
          <div className="assistant-stat">
            <span>{recordCount}</span>
            <small>Loaded records</small>
          </div>
        </div>

        <div className="assistant-layout">
          <form className="assistant-chat" onSubmit={analyze}>
            <div className="chat-window" aria-live="polite">
              {messages.length === 0 ? (
                <div className="empty-chat">Select an analysis type and run the assistant against the loaded operational records.</div>
              ) : messages.map((message) => (
                <div key={message.id} className={`chat-bubble ${message.role}`}>
                  <strong>{message.role === 'operator' ? 'Operator' : 'AI Assistant'}</strong>
                  <span>{message.text}</span>
                </div>
              ))}
            </div>
            <label>
              <span>Analysis module</span>
              <select value={actionId} onChange={(event) => setActionId(event.target.value)}>
                {AI_ASSISTANT_ACTIONS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label} - {item.pashtoLabel}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Operator context</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Add authorized case context, alert details, audit questions, or report scope."
              />
            </label>
            <button className="btn primary" type="submit" disabled={dataLoading}>
              <Send aria-hidden="true" /> Run analysis
            </button>
            {error && <p className="form-error">{error}</p>}
          </form>

          <div className="executive-panel">
            <h3>Executive summary</h3>
            {result ? (
              <>
                <p>{result.executiveSummary.headline}</p>
                <ul>
                  {result.executiveSummary.keyFindings.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <div className="notice">{result.executiveSummary.operationalPosture}</div>
              </>
            ) : (
              <p className="result-message">Run an analysis to generate an executive summary from current records.</p>
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
            <Card title="Analysis Result" icon={<Activity aria-hidden="true" />}>
              <div className="result-panel">
                <div><strong>Confidence level:</strong> {result.confidenceLevel}</div>
                <div><strong>Risk assessment:</strong> {result.riskAssessment.level}</div>
                <div><strong>Summary:</strong> {result.summary}</div>
                <div><strong>Automatic action:</strong> Not allowed</div>
              </div>
              <div className="result-panel">
                <strong>Evidence sources used</strong>
                {result.evidenceSourcesUsed.length ? result.evidenceSourcesUsed.map((item) => (
                  <div key={item.label}>{item.label}: {item.count}</div>
                )) : <div>No internal source records were available.</div>}
              </div>
              <div className="result-panel">
                <strong>Recommended next steps</strong>
                <ul>
                  {result.recommendedNextSteps.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </Card>

            <Card title="Sensitive Action Control" icon={<ShieldCheck aria-hidden="true" />}>
              <div className="result-panel">
                <div><strong>Explanation:</strong> {result.sensitiveAction.explanation}</div>
                <div><strong>Impact:</strong> {result.sensitiveAction.impact}</div>
                <div><strong>Required permissions:</strong> {result.sensitiveAction.requiredPermissions}</div>
                <div><strong>Required human approval:</strong> {result.sensitiveAction.requiredHumanApproval}</div>
                <div><strong>Can execute automatically:</strong> No</div>
              </div>
              <div className="result-panel">
                <strong>Affected records</strong>
                {result.sensitiveAction.affectedRecords.length ? result.sensitiveAction.affectedRecords.map((item) => (
                  <div key={item}>{item}</div>
                )) : <div>No affected records are loaded.</div>}
              </div>
              <button className="btn primary" type="button" onClick={requestApproval}>
                Request administrator approval
              </button>
              {approvalRequested && (
                <p className="notice">Approval request recorded for review. No operational action has been performed.</p>
              )}
            </Card>
          </div>

          <Card title="Evidence Timeline" icon={<FileText aria-hidden="true" />}>
            {result.evidenceTimeline.length ? (
              <div className="timeline">
                {result.evidenceTimeline.map((item) => (
                  <div className="timeline-item" key={`${item.type}-${item.sourceId}-${item.title}`}>
                    <strong>{item.type}: {item.title}</strong>
                    <span>{item.detail || 'No additional detail.'}</span>
                    <small>{item.time || 'Time not recorded'}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notice">No timeline records are currently available.</div>
            )}
          </Card>

          <Card title="Risk Reasons" icon={<AlertTriangle aria-hidden="true" />}>
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
