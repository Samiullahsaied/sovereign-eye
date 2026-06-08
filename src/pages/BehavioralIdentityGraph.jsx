import { BrainCircuit, Download, Network, Plus, StickyNote } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../components/Card.jsx';
import {
  IDENTITY_WARNING,
  SAFE_SAMPLE_IDENTITIES,
  buildGraphEdges,
  calculateIdentitySimilarity,
  createAssistantExplanation
} from '../lib/behavioralIdentity.js';
import { sanitizeText } from '../lib/validation.js';

const EMPTY_IDENTITY = {
  account_name: '',
  platform: '',
  username: '',
  device_hint: '',
  typing_profile_id: '',
  activity_times: '',
  language_style_notes: '',
  known_case_id: ''
};

function scoreClass(score) {
  if (score >= 70) return 'danger';
  if (score >= 40) return 'warn';
  if (score > 0) return 'ok';
  return 'gold';
}

function nodePosition(index, count) {
  const centerX = 260;
  const centerY = 150;
  const radiusX = 190;
  const radiusY = 95;
  const angle = ((Math.PI * 2) / Math.max(count, 1)) * index - Math.PI / 2;
  return {
    x: centerX + Math.cos(angle) * radiusX,
    y: centerY + Math.sin(angle) * radiusY
  };
}

function GraphView({ identities, edges }) {
  const positions = Object.fromEntries(identities.map((identity, index) => [identity.id, nodePosition(index, identities.length)]));

  return (
    <div className="identity-graph" aria-label="Behavioral identity similarity graph">
      <svg viewBox="0 0 520 300" role="img">
        {edges.map((edge) => {
          const source = positions[edge.source];
          const target = positions[edge.target];
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          return (
            <g key={edge.id}>
              <line className={`identity-edge ${scoreClass(edge.score)}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
              <text className="identity-edge-label" x={midX} y={midY}>{edge.score}%</text>
            </g>
          );
        })}
        {identities.map((identity) => {
          const position = positions[identity.id];
          return (
            <g key={identity.id}>
              <circle className={identity.dataMode === 'sample' ? 'identity-node sample' : 'identity-node'} cx={position.x} cy={position.y} r="34" />
              <text className="identity-node-label" x={position.x} y={position.y - 3}>{identity.account_name}</text>
              <text className="identity-node-meta" x={position.x} y={position.y + 13}>{identity.platform}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function BehavioralIdentityGraph({ onAudit, onEvidenceNote }) {
  const [identities, setIdentities] = useState(SAFE_SAMPLE_IDENTITIES);
  const [selectedIds, setSelectedIds] = useState(() => SAFE_SAMPLE_IDENTITIES.slice(0, 2).map((item) => item.id));
  const [form, setForm] = useState(EMPTY_IDENTITY);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [assistantResult, setAssistantResult] = useState(null);
  const viewedLogged = useRef(false);

  const selectedIdentities = useMemo(
    () => identities.filter((identity) => selectedIds.includes(identity.id)),
    [identities, selectedIds]
  );
  const graphEdges = useMemo(() => buildGraphEdges(selectedIdentities), [selectedIdentities]);

  useEffect(() => {
    if (viewedLogged.current) return;
    viewedLogged.current = true;
    onAudit?.('graph viewed', 'Behavioral Identity Graph');
  }, [onAudit]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const addIdentity = (event) => {
    event.preventDefault();
    if (!form.account_name.trim() || !form.platform.trim() || !form.username.trim()) return;

    const identity = {
      id: `local-${Date.now()}`,
      account_name: sanitizeText(form.account_name),
      platform: sanitizeText(form.platform),
      username: sanitizeText(form.username),
      device_hint: sanitizeText(form.device_hint),
      typing_profile_id: sanitizeText(form.typing_profile_id),
      activity_times: sanitizeText(form.activity_times),
      language_style_notes: sanitizeText(form.language_style_notes),
      known_case_id: sanitizeText(form.known_case_id),
      dataMode: 'local'
    };

    setIdentities((items) => [identity, ...items]);
    setSelectedIds((items) => [...new Set([identity.id, ...items])].slice(0, 4));
    setForm(EMPTY_IDENTITY);
  };

  const toggleSelected = (id) => {
    setSelectedIds((items) => (
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
    ));
  };

  const generateScore = () => {
    const result = calculateIdentitySimilarity(selectedIdentities);
    setLastResult(result);
    setAssistantResult(null);
    onAudit?.('identity comparison created', `${selectedIdentities.length} identities selected`);
    onAudit?.('similarity score generated', `${selectedIdentities.length} identities - ${result.overall_similarity_score}%`);
  };

  const addNote = () => {
    const clean = sanitizeText(note);
    if (!clean || !lastResult) return;
    const entry = {
      id: `note-${Date.now()}`,
      text: clean,
      score: lastResult.overall_similarity_score,
      createdAt: new Date().toLocaleString()
    };
    setNotes((items) => [entry, ...items]);
    setNote('');
    onAudit?.('analyst note added', clean);
    onEvidenceNote?.('Behavioral identity analyst note', clean);
  };

  const explain = () => {
    const result = lastResult || calculateIdentitySimilarity(selectedIdentities);
    setLastResult(result);
    setAssistantResult(createAssistantExplanation(result));
  };

  const exportComparison = () => {
    const result = lastResult || calculateIdentitySimilarity(selectedIdentities);
    const rows = [
      ['account_name', 'platform', 'username', 'overall_similarity_score', 'level'],
      ...selectedIdentities.map((identity) => [
        identity.account_name,
        identity.platform,
        identity.username,
        result.overall_similarity_score,
        result.level
      ])
    ];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'behavioral_identity_comparison.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    onAudit?.('comparison exported', `${selectedIdentities.length} identities`);
  };

  return (
    <div className="page-stack">
      <Card title="Behavioral Identity Graph / د رفتاري هویت نقشه" icon={<Network aria-hidden="true" />}>
        <div className="notice">{IDENTITY_WARNING}</div>
        <div className="identity-layout">
          <div>
            <div className="identity-selection">
              {identities.map((identity) => (
                <label key={identity.id} className="identity-option">
                  <input type="checkbox" checked={selectedIds.includes(identity.id)} onChange={() => toggleSelected(identity.id)} />
                  <span>
                    <strong>{identity.account_name}</strong>
                    <small>{identity.platform} - @{identity.username} {identity.dataMode === 'sample' ? '(sample)' : '(local)'}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <GraphView identities={selectedIdentities} edges={graphEdges} />
        </div>
        <div className="button-row">
          <button className="btn primary" type="button" onClick={generateScore}>Generate similarity score</button>
          <button className="btn" type="button" onClick={explain}><BrainCircuit aria-hidden="true" /> AI explanation</button>
          <button className="btn" type="button" onClick={exportComparison}><Download aria-hidden="true" /> Export</button>
        </div>
      </Card>

      <div className="grid two">
        <Card title="Add identity/account" icon={<Plus aria-hidden="true" />}>
          <form className="form-grid" onSubmit={addIdentity}>
            <label><span>Account name</span><input value={form.account_name} onChange={(event) => updateForm('account_name', event.target.value)} required /></label>
            <label><span>Platform</span><input value={form.platform} onChange={(event) => updateForm('platform', event.target.value)} required /></label>
            <label><span>Username</span><input value={form.username} onChange={(event) => updateForm('username', event.target.value)} required /></label>
            <label><span>Device hint</span><input value={form.device_hint} onChange={(event) => updateForm('device_hint', event.target.value)} /></label>
            <label><span>Typing profile ID</span><input value={form.typing_profile_id} onChange={(event) => updateForm('typing_profile_id', event.target.value)} /></label>
            <label><span>Activity times</span><input value={form.activity_times} onChange={(event) => updateForm('activity_times', event.target.value)} placeholder="08:00, 20:00, 21:00" /></label>
            <label><span>Language style notes</span><textarea rows={3} value={form.language_style_notes} onChange={(event) => updateForm('language_style_notes', event.target.value)} /></label>
            <label><span>Known case ID</span><input value={form.known_case_id} onChange={(event) => updateForm('known_case_id', event.target.value)} /></label>
            <button className="btn primary" type="submit">Add account</button>
          </form>
        </Card>

        <Card title="Similarity result">
          {!lastResult && <div className="empty-state">Generate a score to view behavioral similarity estimates.</div>}
          {lastResult && (
            <div className="result-panel">
              <div><strong>Overall:</strong> <span className={`badge ${scoreClass(lastResult.overall_similarity_score)}`}>{lastResult.overall_similarity_score}% - {lastResult.level}</span></div>
              <div>Confidence: <strong>{lastResult.confidence_label}</strong></div>
              <div>Typing similarity: <strong>{lastResult.typing_similarity}%</strong></div>
              <div>Writing style similarity: <strong>{lastResult.writing_style_similarity}%</strong></div>
              <div>Activity time similarity: <strong>{lastResult.activity_time_similarity}%</strong></div>
              <div>Device pattern similarity: <strong>{lastResult.device_pattern_similarity}%</strong></div>
              <div>Network signal similarity: <strong>{lastResult.network_signal_similarity}%</strong></div>
              <ul className="rule-list">
                {lastResult.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="grid two">
        <Card title="Evidence notes" icon={<StickyNote aria-hidden="true" />}>
          <label className="full-label">
            <span>Analyst note</span>
            <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain why selected accounts may require review." />
          </label>
          <button className="btn primary" type="button" onClick={addNote} disabled={!lastResult || !note.trim()}>Attach note</button>
          <div className="item-list">
            {notes.map((item) => (
              <div className="timeline-item" key={item.id}>
                <strong>{item.score}% estimate</strong>
                <span>{item.text}</span>
                <small>{item.createdAt}</small>
              </div>
            ))}
          </div>
        </Card>

        <Card title="AI-assisted explanation" icon={<BrainCircuit aria-hidden="true" />}>
          {!assistantResult && <div className="empty-state">AI explanation will summarize signals without making final claims.</div>}
          {assistantResult && (
            <div className="result-panel">
              <div><strong>Summary:</strong> {assistantResult.summary}</div>
              <div><strong>Supporting signals:</strong> {assistantResult.supportingSignals.join(' ')}</div>
              <div><strong>Uncertainty:</strong> {assistantResult.uncertainty}</div>
              <div><strong>Recommended next step:</strong> {assistantResult.recommendedNextStep}</div>
              <div><strong>Required human review:</strong> {assistantResult.requiredHumanReview}</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default BehavioralIdentityGraph;
