import { Keyboard } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { compareTypingFingerprint, createTypingFingerprint } from '../lib/fingerprint.js';

export function Keystroke({ storedFingerprint, onSaveFingerprint, onHighSimilarity }) {
  const [oldSample, setOldSample] = useState('');
  const [newSample, setNewSample] = useState('');
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(null);

  const save = () => {
    const fingerprint = createTypingFingerprint(oldSample);
    if (!fingerprint) {
      setMessage('لږ تر لږه 10 توري ولیکئ.');
      setScore(null);
      return;
    }
    onSaveFingerprint(fingerprint);
    setMessage('نمونه ثبت شوه.');
    setScore(null);
  };

  const compare = () => {
    if (!storedFingerprint) {
      setMessage('لومړی پخوانۍ نمونه ثبت کړئ.');
      setScore(null);
      return;
    }
    if (!createTypingFingerprint(newSample)) {
      setMessage('د پرتله کولو لپاره لږ تر لږه 10 توري ولیکئ.');
      setScore(null);
      return;
    }
    const value = compareTypingFingerprint(storedFingerprint, newSample);
    setScore(value);
    setMessage(value >= 70 ? 'لوړ ورته والی وموندل شو.' : 'ورته والی ټیټ یا منځنی دی.');
    if (value >= 70) onHighSimilarity(value);
  };

  return (
    <Card title="کیبورډ بایومتریک">
      <div className="notice">دا د typing pattern داخلي ارزونه ده او د هویت وروستۍ ثبوت نه ګڼل کېږي.</div>
      <div className="form-grid wide">
        <label>
          <span>پخوانی نمونه</span>
          <textarea rows={4} value={oldSample} onChange={(event) => setOldSample(event.target.value)} />
        </label>
        <button className="btn primary" type="button" onClick={save}><Keyboard /> ثبت</button>
        <label>
          <span>نوی نمونه</span>
          <textarea rows={4} value={newSample} onChange={(event) => setNewSample(event.target.value)} />
        </label>
        <button className="btn" type="button" onClick={compare} disabled={!storedFingerprint}>ورته والی</button>
      </div>
      {message && <p className="result-message">{message}</p>}
      {score !== null && <span className={`badge ${score >= 70 ? 'danger' : score >= 40 ? 'warn' : 'ok'}`}>ورته والی: {score}%</span>}
    </Card>
  );
}
