import { BrainCircuit, Download, Network, Plus, StickyNote } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';
import { buildGraphEdges, calculateIdentitySimilarity } from '../lib/behavioralIdentity.js';
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
  return { x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY };
}

function levelKey(level) {
  if (/High/i.test(level)) return 'high';
  if (/Medium/i.test(level)) return 'medium';
  if (/Low/i.test(level)) return 'low';
  return 'review';
}

function reasonKey(reason) {
  if (/Select at least two/i.test(reason)) return 'selectTwo';
  if (/Typing profile/i.test(reason)) return 'typing';
  if (/Language style/i.test(reason)) return 'writing';
  if (/Activity windows/i.test(reason)) return 'activity';
  if (/Device hints/i.test(reason)) return 'device';
  if (/Case or network/i.test(reason)) return 'network';
  return 'limited';
}

function confidenceText(result, t) {
  if (result.overall_similarity_score >= 70) return t('common.high');
  if (result.overall_similarity_score >= 40) return t('common.medium');
  if (result.overall_similarity_score > 0) return t('common.low');
  return t('behavioral.levels.review');
}

function dataModeLabel(identity, t) {
  return t('behavioral.live');
}

function GraphView({ identities, edges, graphLabel, t }) {
  const positions = Object.fromEntries(identities.map((identity, index) => [identity.id, nodePosition(index, identities.length)]));

  return (
    <div className="identity-graph" aria-label={graphLabel}>
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
              <circle className="identity-node" cx={position.x} cy={position.y} r="34" />
              <text className="identity-node-label" x={position.x} y={position.y - 3}>{identity.account_name}</text>
              <text className="identity-node-meta" x={position.x} y={position.y + 13}>{identity.platform} · {dataModeLabel(identity, t)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function BehavioralIdentityGraph({
  identities: liveIdentities = [],
  comparisons = [],
  graphEdges: liveGraphEdges = [],
  notes: liveNotes = [],
  dataLoading = false,
  onCreateIdentity,
  onCreateComparison,
  onAddAnalysisNote,
  onAudit
}) {
  const t = useT();
  const identities = liveIdentities;
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState(EMPTY_IDENTITY);
  const [note, setNote] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [lastComparisonId, setLastComparisonId] = useState('');
  const [assistantResult, setAssistantResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const viewedLogged = useRef(false);

  const notes = liveNotes;
  const selectedIdentities = useMemo(() => identities.filter((identity) => selectedIds.includes(identity.id)), [identities, selectedIds]);
  const graphEdges = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const persisted = liveGraphEdges.filter((edge) => selectedSet.has(edge.source) && selectedSet.has(edge.target));
    return persisted.length > 0 ? persisted : buildGraphEdges(selectedIdentities);
  }, [liveGraphEdges, selectedIdentities, selectedIds]);

  useEffect(() => {
    if (lastResult || comparisons.length === 0) return;
    const latest = comparisons[0];
    setLastComparisonId(latest.id);
    setLastResult({
      typing_similarity: latest.typing_similarity,
      writing_style_similarity: latest.writing_style_similarity,
      activity_time_similarity: latest.activity_time_similarity,
      device_pattern_similarity: latest.device_pattern_similarity,
      network_signal_similarity: latest.network_signal_similarity,
      overall_similarity_score: latest.overall_similarity_score,
      confidence_label: latest.confidence_label,
      level: latest.level,
      reasons: []
    });
  }, [comparisons, lastResult]);

  useEffect(() => {
    setSelectedIds((current) => {
      const valid = current.filter((id) => identities.some((identity) => identity.id === id));
      if (valid.length > 0) return valid;
      return identities.slice(0, 2).map((item) => item.id);
    });
  }, [identities]);

  useEffect(() => {
    if (viewedLogged.current) return;
    viewedLogged.current = true;
    onAudit?.('graph viewed', t('behavioral.title'));
  }, [onAudit, t]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const addIdentity = async (event) => {
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
    setSubmitting(true);
    try {
      if (onCreateIdentity) {
        const ok = await onCreateIdentity(identity);
        if (!ok) return;
      }
    } finally {
      setSubmitting(false);
    }
    setForm(EMPTY_IDENTITY);
  };

  const toggleSelected = (id) => setSelectedIds((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));

  const generateScore = async () => {
    const result = calculateIdentitySimilarity(selectedIdentities);
    const edges = buildGraphEdges(selectedIdentities);
    setLastResult(result);
    setAssistantResult(null);
    if (selectedIdentities.length >= 2 && onCreateComparison) {
      setSubmitting(true);
      try {
        const comparisonId = await onCreateComparison(selectedIdentities, result, edges);
        if (comparisonId) setLastComparisonId(comparisonId);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const addNote = async () => {
    const clean = sanitizeText(note);
    if (!clean || !lastResult) return;
    setSubmitting(true);
    try {
      if (onAddAnalysisNote) {
        const ok = await onAddAnalysisNote({
          note: clean,
          comparisonId: lastComparisonId || null,
          metadata: { score: lastResult.overall_similarity_score }
        });
        if (!ok) return;
      }
    } finally {
      setSubmitting(false);
    }
    setNote('');
  };

  const explain = () => {
    const result = lastResult || calculateIdentitySimilarity(selectedIdentities);
    setLastResult(result);
    setAssistantResult({
      summary: t('behavioral.explanationSummary', { level: t(`behavioral.levels.${levelKey(result.level)}`), score: result.overall_similarity_score }),
      supportingSignals: result.reasons.map((reason) => t(`behavioral.reasons.${reasonKey(reason)}`)),
      uncertainty: t('behavioral.explanationUncertainty'),
      recommendedNextStep: t('behavioral.explanationNextStep'),
      requiredHumanReview: t('behavioral.explanationReview')
    });
  };

  const exportComparison = () => {
    const result = lastResult || calculateIdentitySimilarity(selectedIdentities);
    const rows = [
      ['account_name', 'platform', 'username', 'overall_similarity_score', 'level'],
      ...selectedIdentities.map((identity) => [identity.account_name, identity.platform, identity.username, result.overall_similarity_score, result.level])
    ];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'behavioral_identity_comparison.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    onAudit?.('comparison exported', `${selectedIdentities.length}`);
  };

  return (
    <div className="page-stack">
      <Card title={t('behavioral.title')} icon={<Network aria-hidden="true" />}>
        <div className="notice">{t('behavioral.warning')}</div>
        <div className="identity-layout">
          <div>
            <div className="identity-selection">
              {dataLoading && <div className="notice">{t('common.loading')}</div>}
              {!dataLoading && identities.length === 0 && <EmptyState title={t('common.noLiveRecords')} body={t('behavioral.noLiveIdentities')} />}
              {identities.map((identity) => (
                <label key={identity.id} className="identity-option">
                  <input type="checkbox" checked={selectedIds.includes(identity.id)} onChange={() => toggleSelected(identity.id)} />
                  <span><strong>{identity.account_name}</strong><small>{identity.platform} - @{identity.username} ({dataModeLabel(identity, t)})</small></span>
                </label>
              ))}
            </div>
          </div>
          <GraphView identities={selectedIdentities} edges={graphEdges} graphLabel={t('behavioral.graphLabel')} t={t} />
        </div>
        <div className="button-row">
          <button className="btn primary" type="button" onClick={generateScore} disabled={submitting || selectedIdentities.length < 2}>{t('behavioral.generateScore')}</button>
          <button className="btn" type="button" onClick={explain} disabled={selectedIdentities.length < 2}><BrainCircuit aria-hidden="true" /> {t('behavioral.aiExplanation')}</button>
          <button className="btn" type="button" onClick={exportComparison} disabled={selectedIdentities.length === 0}><Download aria-hidden="true" /> {t('common.export')}</button>
        </div>
      </Card>

      <div className="grid two">
        <Card title={t('behavioral.addIdentity')} icon={<Plus aria-hidden="true" />}>
          <form className="form-grid" onSubmit={addIdentity}>
            <label><span>{t('behavioral.accountName')}</span><input value={form.account_name} onChange={(event) => updateForm('account_name', event.target.value)} required /></label>
            <label><span>{t('behavioral.platform')}</span><input value={form.platform} onChange={(event) => updateForm('platform', event.target.value)} required /></label>
            <label><span>{t('behavioral.username')}</span><input value={form.username} onChange={(event) => updateForm('username', event.target.value)} required /></label>
            <label><span>{t('behavioral.deviceHint')}</span><input value={form.device_hint} onChange={(event) => updateForm('device_hint', event.target.value)} /></label>
            <label><span>{t('behavioral.typingProfileId')}</span><input value={form.typing_profile_id} onChange={(event) => updateForm('typing_profile_id', event.target.value)} /></label>
            <label><span>{t('behavioral.activityTimes')}</span><input value={form.activity_times} onChange={(event) => updateForm('activity_times', event.target.value)} placeholder={t('behavioral.activityTimesPlaceholder')} /></label>
            <label><span>{t('behavioral.languageStyleNotes')}</span><textarea rows={3} value={form.language_style_notes} onChange={(event) => updateForm('language_style_notes', event.target.value)} /></label>
            <label><span>{t('behavioral.knownCaseId')}</span><input value={form.known_case_id} onChange={(event) => updateForm('known_case_id', event.target.value)} /></label>
            <button className="btn primary" type="submit" disabled={submitting}>{submitting ? t('common.saving') : t('behavioral.addAccount')}</button>
          </form>
        </Card>

        <Card title={t('behavioral.similarityResult')}>
          {!lastResult && <div className="empty-state">{t('behavioral.resultEmpty')}</div>}
          {lastResult && (
            <div className="result-panel">
              <div><strong>{t('behavioral.overall')}:</strong> <span className={`badge ${scoreClass(lastResult.overall_similarity_score)}`}>{lastResult.overall_similarity_score}% - {t(`behavioral.levels.${levelKey(lastResult.level)}`)}</span></div>
              <div>{t('behavioral.confidence')}: <strong>{confidenceText(lastResult, t)}</strong></div>
              <div>{t('behavioral.typingSimilarity')}: <strong>{lastResult.typing_similarity}%</strong></div>
              <div>{t('behavioral.writingStyleSimilarity')}: <strong>{lastResult.writing_style_similarity}%</strong></div>
              <div>{t('behavioral.activityTimeSimilarity')}: <strong>{lastResult.activity_time_similarity}%</strong></div>
              <div>{t('behavioral.devicePatternSimilarity')}: <strong>{lastResult.device_pattern_similarity}%</strong></div>
              <div>{t('behavioral.networkSignalSimilarity')}: <strong>{lastResult.network_signal_similarity}%</strong></div>
              <ul className="rule-list">{lastResult.reasons.map((reason) => <li key={reason}>{t(`behavioral.reasons.${reasonKey(reason)}`)}</li>)}</ul>
            </div>
          )}
        </Card>
      </div>

      <div className="grid two">
        <Card title={t('behavioral.evidenceNotes')} icon={<StickyNote aria-hidden="true" />}>
          <label className="full-label"><span>{t('behavioral.analystNote')}</span><textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('behavioral.notePlaceholder')} /></label>
          <button className="btn primary" type="button" onClick={addNote} disabled={submitting || !lastResult || !note.trim()}>{t('behavioral.attachNote')}</button>
          <div className="item-list">
            {notes.length === 0 && <EmptyState title={t('common.noLiveRecords')} body={t('behavioral.noLiveNotes')} />}
            {notes.map((item) => (
              <div className="timeline-item" key={item.id}>
                <strong>{t('behavioral.estimate', { score: item.score })}</strong>
                <span>{item.text}</span>
                <small>{item.createdAt}</small>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t('behavioral.aiExplanation')} icon={<BrainCircuit aria-hidden="true" />}>
          {!assistantResult && <div className="empty-state">{t('behavioral.aiEmpty')}</div>}
          {assistantResult && (
            <div className="result-panel">
              <div><strong>{t('assistant.summary')}:</strong> {assistantResult.summary}</div>
              <div><strong>{t('behavioral.supportingSignals')}:</strong> {assistantResult.supportingSignals.join(' ')}</div>
              <div><strong>{t('behavioral.uncertainty')}:</strong> {assistantResult.uncertainty}</div>
              <div><strong>{t('behavioral.recommendedNextStep')}:</strong> {assistantResult.recommendedNextStep}</div>
              <div><strong>{t('behavioral.requiredHumanReview')}:</strong> {assistantResult.requiredHumanReview}</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default BehavioralIdentityGraph;
