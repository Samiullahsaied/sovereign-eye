import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { sanitizeText } from '../lib/validation.js';

const DEFAULT_PLATFORM = 'فیسبوک';

export function Social({ targets, onAddTarget, onRemoveTarget, query }) {
  const [form, setForm] = useState({ platform: DEFAULT_PLATFORM, target: '', reason: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const filtered = targets.filter((target) => `${target.platform} ${target.target} ${target.reason}`.toLowerCase().includes(query.toLowerCase()));

  const submit = async (event) => {
    event.preventDefault();
    const target = sanitizeText(form.target);
    const reason = sanitizeText(form.reason);
    if (!target || !reason) {
      setError('لینک/شمېره او دلیل دواړه اړین دي.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const ok = await onAddTarget({ platform: form.platform, target, reason });
      if (ok === false) {
        setError('Target could not be saved. Check Supabase connection and table policies.');
        return;
      }
      setForm({ platform: DEFAULT_PLATFORM, target: '', reason: '' });
    } catch (err) {
      setError(err.message || 'Target could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="د ټولنیزو رسنیو څارنه (workflow)">
      <form className="inline-form" onSubmit={submit}>
        <label>
          <span>پلاتفورم</span>
          <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} disabled={submitting}>
            <option>فیسبوک</option>
            <option>واټس اپ</option>
            <option>ټیلیګرام</option>
            <option>ایکس</option>
          </select>
        </label>
        <label>
          <span>هدف</span>
          <input value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} placeholder="لینک / شمېره" disabled={submitting} />
        </label>
        <label>
          <span>دلیل</span>
          <input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="قانوني دلیل" disabled={submitting} />
        </label>
        <button className="btn primary" type="submit" disabled={submitting}><Plus /> {submitting ? 'Saving...' : 'اضافه'}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="item-list">
        {filtered.length === 0 ? (
          <EmptyState title="هدف نشته" body="هدفونه د قانوني دلیل سره ثبت کړئ." />
        ) : (
          filtered.map((item) => (
            <article className="list-card" key={item.id}>
              <div>
                <strong>{item.platform}: {item.target}</strong>
                <span>{item.reason}</span>
              </div>
              <button className="icon-button" type="button" onClick={() => onRemoveTarget(item.id)} aria-label="Remove target" disabled={submitting}><Trash2 /></button>
            </article>
          ))
        )}
      </div>
    </Card>
  );
}
