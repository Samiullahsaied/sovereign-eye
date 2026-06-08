import { Bot, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { AI_ASSISTANT_ACTIONS, runPermissionFirstAssistant } from '../lib/assistant.js';

export function Assistant({ warrant, auditLog, alerts, statusRows, onApprovalRequest }) {
  const [actionId, setActionId] = useState('case');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState(null);
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

  const analyze = (event) => {
    event.preventDefault();
    setApprovalRequested(false);
    setError('');

    try {
      setResult(runPermissionFirstAssistant(actionId, notes, {
        warrant,
        auditLog,
        alerts,
        statusRows
      }));
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
    <div className="page-stack">
      <Card title="Permission-first AI Assistant" icon={<Bot aria-hidden="true" />}>
        <div className="notice">AI Assistant is temporarily unavailable for external backend actions. Local permission-first analysis remains available.</div>
        {isOffline && <div className="notice">Offline mode: AI Assistant is temporarily unavailable until network connectivity returns.</div>}
        <div className="notice">
          AI can analyze, summarize, diagnose, and suggest. It cannot change records or take action without administrator approval.
        </div>
        <form className="form-grid" onSubmit={analyze}>
          <label>
            <span>Assistant task</span>
            <select value={actionId} onChange={(event) => setActionId(event.target.value)}>
              {AI_ASSISTANT_ACTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Context notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              placeholder="Add case facts, alert details, audit context, or system symptoms for analysis."
            />
          </label>
          <button className="btn primary" type="submit"><Bot aria-hidden="true" /> Analyze</button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </Card>

      {result && (
        <Card title="AI Recommendation" icon={<ShieldCheck aria-hidden="true" />}>
          <div className="result-panel">
            <div><strong>Explanation:</strong> {result.explanation}</div>
            <div><strong>Impact:</strong> {result.impact}</div>
            <div><strong>Summary:</strong> {result.summary}</div>
            <div><strong>Risk level:</strong> {result.riskLevel}</div>
            <div><strong>Required permissions:</strong> {result.requiredPermissions}</div>
            <div><strong>Recommended next step:</strong> {result.recommendedNextStep}</div>
            <div><strong>Required human approval:</strong> {result.requiredHumanApproval}</div>
            <div><strong>Automatic action:</strong> Not allowed</div>
          </div>
          <button className="btn primary" type="button" onClick={requestApproval}>
            Request administrator approval
          </button>
          {approvalRequested && (
            <p className="notice">Approval request prepared. No operational action has been performed.</p>
          )}
        </Card>
      )}
    </div>
  );
}

export default Assistant;
