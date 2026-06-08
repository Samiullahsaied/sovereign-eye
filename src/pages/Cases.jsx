import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';
import { sanitizeText } from '../lib/validation.js';

const PRIORITY_KEYS = ['critical', 'high', 'medium', 'low'];

export function Cases({ cases, onAddCase, onRemoveCase, query }) {
  const t = useT();
  const [form, setForm] = useState({ title: '', suspect: '', priority: 'high' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const filtered = cases.filter((item) => `${item.title} ${item.suspect}`.toLowerCase().includes(query.toLowerCase()));

  const submit = async (event) => {
    event.preventDefault();
    const title = sanitizeText(form.title);
    if (!title) {
      setError(t('cases.titleRequired'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const ok = await onAddCase({ title, suspect: sanitizeText(form.suspect), priority: form.priority });
      if (ok === false) {
        setError(t('cases.saveFailed'));
        return;
      }
      setForm({ title: '', suspect: '', priority: 'high' });
    } catch (err) {
      setError(err.message || t('cases.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title={t('cases.title')}>
      <form className="inline-form" onSubmit={submit}>
        <label><span>{t('cases.case')}</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={t('cases.caseName')} disabled={submitting} /></label>
        <label><span>{t('cases.suspect')}</span><input value={form.suspect} onChange={(event) => setForm({ ...form, suspect: event.target.value })} placeholder={t('cases.suspectPlaceholder')} disabled={submitting} /></label>
        <label>
          <span>{t('cases.priority')}</span>
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} disabled={submitting}>
            {PRIORITY_KEYS.map((key) => <option key={key} value={key}>{t(`common.${key}`)}</option>)}
          </select>
        </label>
        <button className="btn primary" type="submit" disabled={submitting}><Plus /> {submitting ? t('common.saving') : t('common.add')}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="item-list">
        {filtered.length === 0 ? (
          <EmptyState title={t('cases.emptyTitle')} body={t('cases.emptyBody')} />
        ) : filtered.map((item) => (
          <article className="list-card" key={item.id}>
            <div><strong>{item.title}</strong><span>{item.suspect || t('cases.noSuspect')}</span></div>
            <span className={`badge ${item.priority === 'critical' ? 'danger' : 'gold'}`}>{t(`common.${item.priority}`) || item.priority}</span>
            <button className="icon-button" type="button" onClick={() => onRemoveCase(item.id)} aria-label={t('cases.removeCase')} disabled={submitting}><Trash2 /></button>
          </article>
        ))}
      </div>
    </Card>
  );
}
