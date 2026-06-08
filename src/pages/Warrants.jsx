import { FileUp, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';

export function Warrants({ warrants, onAddWarrantFile, onRemoveWarrant }) {
  const t = useT();
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addFile = async (file) => {
    if (!file) return;
    setSubmitting(true);
    setError('');
    try {
      const ok = await onAddWarrantFile(file);
      if (ok === false) {
        setError(t('warrant.metadataFailed'));
        return;
      }
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.message || t('warrant.metadataSaveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title={t('warrant.pageTitle')}>
      <div className="notice">{t('warrant.metadataNotice')}</div>
      <label className="file-drop">
        <FileUp aria-hidden="true" />
        <span>{submitting ? t('warrant.savingMetadata') : t('warrant.chooseDocument')}</span>
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => addFile(event.target.files?.[0])} disabled={submitting} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="item-list">
        {warrants.length === 0 ? (
          <EmptyState title={t('warrant.emptyTitle')} body={t('warrant.emptyBody')} />
        ) : warrants.map((item) => (
          <article className="list-card" key={item.id}>
            <div><strong>{item.name}</strong><span>{item.country} · {item.sizeLabel}</span></div>
            <button className="icon-button" type="button" onClick={() => onRemoveWarrant(item.id)} aria-label={t('common.remove')} disabled={submitting}><Trash2 /></button>
          </article>
        ))}
      </div>
    </Card>
  );
}
