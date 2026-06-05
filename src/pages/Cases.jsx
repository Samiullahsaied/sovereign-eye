import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { sanitizeText } from '../lib/validation.js';

const DEFAULT_PRIORITY = 'لوړ';

export function Cases({ cases, onAddCase, onRemoveCase, query }) {
  const [form, setForm] = useState({ title: '', suspect: '', priority: DEFAULT_PRIORITY });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const filtered = cases.filter((item) => `${item.title} ${item.suspect}`.toLowerCase().includes(query.toLowerCase()));

  const submit = async (event) => {
    event.preventDefault();
    const title = sanitizeText(form.title);
    if (!title) {
      setError('د قضیې نوم اړین دی.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const ok = await onAddCase({ title, suspect: sanitizeText(form.suspect), priority: form.priority });
      if (ok === false) {
        setError('Case could not be saved. Check Supabase connection and table policies.');
        return;
      }
      setForm({ title: '', suspect: '', priority: DEFAULT_PRIORITY });
    } catch (err) {
      setError(err.message || 'Case could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="د قضیو مدیریت">
      <form className="inline-form" onSubmit={submit}>
        <label>
          <span>قضیه</span>
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="د قضیې نوم" disabled={submitting} />
        </label>
        <label>
          <span>شکمن</span>
          <input value={form.suspect} onChange={(event) => setForm({ ...form, suspect: event.target.value })} placeholder="نوم / شناسه" disabled={submitting} />
        </label>
        <label>
          <span>اولویت</span>
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} disabled={submitting}>
            <option>بحراني</option>
            <option>لوړ</option>
            <option>منځنی</option>
            <option>ټیټ</option>
          </select>
        </label>
        <button className="btn primary" type="submit" disabled={submitting}><Plus /> {submitting ? 'Saving...' : 'اضافه'}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="item-list">
        {filtered.length === 0 ? (
          <EmptyState title="قضیه نشته" body="له پورته فورم څخه نوې قضیه ثبت کړئ." />
        ) : (
          filtered.map((item) => (
            <article className="list-card" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.suspect || 'شکمن نه دی ټاکل شوی'}</span>
              </div>
              <span className={`badge ${item.priority === 'بحراني' ? 'danger' : 'gold'}`}>{item.priority}</span>
              <button className="icon-button" type="button" onClick={() => onRemoveCase(item.id)} aria-label="Remove case" disabled={submitting}><Trash2 /></button>
            </article>
          ))
        )}
      </div>
    </Card>
  );
}
