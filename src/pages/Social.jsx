import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';
import { sanitizeText } from '../lib/validation.js';

const PLATFORM_KEYS = ['facebook', 'whatsapp', 'telegram', 'x'];

export function Social({ targets, onAddTarget, onRemoveTarget, query }) {
  const t = useT();
  const [form, setForm] = useState({ platform: 'facebook', target: '', reason: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const filtered = targets.filter((target) => `${target.platform} ${target.target} ${target.reason}`.toLowerCase().includes(query.toLowerCase()));

  const submit = async (event) => {
    event.preventDefault();
    const target = sanitizeText(form.target);
    const reason = sanitizeText(form.reason);
    if (!target || !reason) {
      setError(t('social.required'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const platformLabel = t(`social.platforms.${form.platform}`);
      const ok = await onAddTarget({ platform: platformLabel, target, reason });
      if (ok === false) {
        setError(t('social.saveFailed'));
        return;
      }
      setForm({ platform: 'facebook', target: '', reason: '' });
    } catch (err) {
      setError(err.message || t('social.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title={t('social.title')}>
      <form className="inline-form" onSubmit={submit}>
        <label>
          <span>{t('social.platform')}</span>
          <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} disabled={submitting}>
            {PLATFORM_KEYS.map((key) => <option key={key} value={key}>{t(`social.platforms.${key}`)}</option>)}
          </select>
        </label>
        <label><span>{t('social.target')}</span><input value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} placeholder={t('social.targetPlaceholder')} disabled={submitting} /></label>
        <label><span>{t('social.reason')}</span><input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder={t('social.reasonPlaceholder')} disabled={submitting} /></label>
        <button className="btn primary" type="submit" disabled={submitting}><Plus /> {submitting ? t('common.saving') : t('common.add')}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="item-list">
        {filtered.length === 0 ? (
          <EmptyState title={t('social.emptyTitle')} body={t('social.emptyBody')} />
        ) : filtered.map((item) => (
          <article className="list-card" key={item.id}>
            <div><strong>{item.platform}: {item.target}</strong><span>{item.reason}</span></div>
            <button className="icon-button" type="button" onClick={() => onRemoveTarget(item.id)} aria-label={t('social.removeTarget')} disabled={submitting}><Trash2 /></button>
          </article>
        ))}
      </div>
    </Card>
  );
}
