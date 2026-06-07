import { Bot, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { AI_ASSISTANT_ACTIONS, runPermissionFirstAssistant } from '../lib/assistant.js';

export function Assistant({ warrant, auditLog, alerts, statusRows, onApprovalRequest }) {
  const [actionId, setActionId] = useState('case');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState(null);
  const [approvalRequested, setApprovalRequested] = useState(false);

  const analyze = (event) => {
    event.preventDefault();
    setApprovalRequested(false);
    setResult(runPermissionFirstAssistant(actionId, notes, {
      warrant,
      auditLog,
      alerts,
      statusRows
    }));
  };

  const requestApproval = () => {
    if (!result) return;
    setApprovalRequested(true);
    onApprovalRequest?.(result);
  };

  return (
    <div className="page-stack">
      <Card title="Permission-first AI Assistant" icon={Bot}>
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
      </Card>

      {result && (
        <Card title="AI Recommendation" icon={ShieldCheck}>
          <div className="result-panel">
            <div><strong>Summary:</strong> {result.summary}</div>
            <div><strong>Risk level:</strong> {result.riskLevel}</div>
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
