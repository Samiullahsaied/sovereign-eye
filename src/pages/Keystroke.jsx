import { Keyboard } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { useT } from '../i18n/index.jsx';
import { compareTypingFingerprint, createTypingFingerprint } from '../lib/fingerprint.js';

export function Keystroke({ storedFingerprint, onSaveFingerprint, onHighSimilarity }) {
  const t = useT();
  const [oldSample, setOldSample] = useState('');
  const [newSample, setNewSample] = useState('');
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(null);

  const save = async () => {
    const fingerprint = createTypingFingerprint(oldSample);
    if (!fingerprint) {
      setMessage(t('keystroke.minSave'));
      setScore(null);
      return;
    }
    if (onSaveFingerprint && !await onSaveFingerprint(fingerprint)) return;
    setMessage(t('keystroke.saveSuccess'));
    setScore(null);
  };

  const compare = async () => {
    if (!storedFingerprint) {
      setMessage(t('keystroke.needPrevious'));
      setScore(null);
      return;
    }
    if (!createTypingFingerprint(newSample)) {
      setMessage(t('keystroke.minCompare'));
      setScore(null);
      return;
    }
    const value = compareTypingFingerprint(storedFingerprint, newSample);
    setScore(value);
    setMessage(value >= 70 ? t('keystroke.highFound') : t('keystroke.moderateFound'));
    if (value >= 70) await onHighSimilarity(value);
  };

  return (
    <Card title={t('keystroke.title')}>
      <div className="notice">{t('keystroke.notice')}</div>
      <div className="form-grid wide">
        <label><span>{t('keystroke.oldSample')}</span><textarea rows={4} value={oldSample} onChange={(event) => setOldSample(event.target.value)} /></label>
        <button className="btn primary" type="button" onClick={save}><Keyboard /> {t('keystroke.register')}</button>
        <label><span>{t('keystroke.newSample')}</span><textarea rows={4} value={newSample} onChange={(event) => setNewSample(event.target.value)} /></label>
        <button className="btn" type="button" onClick={compare} disabled={!storedFingerprint}>{t('keystroke.similarity')}</button>
      </div>
      {message && <p className="result-message">{message}</p>}
      {score !== null && <span className={`badge ${score >= 70 ? 'danger' : score >= 40 ? 'warn' : 'ok'}`}>{t('keystroke.score', { score })}</span>}
    </Card>
  );
}
