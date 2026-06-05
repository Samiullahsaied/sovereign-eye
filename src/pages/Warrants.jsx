import { FileUp, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';

export function Warrants({ warrants, onAddWarrantFile, onRemoveWarrant }) {
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
        setError('Warrant metadata could not be saved. Check Supabase connection and table policies.');
        return;
      }
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Warrant metadata could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="قانوني حکمونه">
      <div className="notice">
        حقیقي اسناد باید backend storage، access control، او audit retention سره وصل شي. دلته یوازې metadata خوندي کېږي.
      </div>
      <label className="file-drop">
        <FileUp aria-hidden="true" />
        <span>{submitting ? 'Saving metadata...' : 'PDF یا سند انتخاب کړئ'}</span>
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => addFile(event.target.files?.[0])} disabled={submitting} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="item-list">
        {warrants.length === 0 ? (
          <EmptyState title="حکم نه دی ثبت شوی" body="د پورته انتخاب له لارې د حکم metadata اضافه کړئ." />
        ) : (
          warrants.map((item) => (
            <article className="list-card" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.country} · {item.sizeLabel}</span>
              </div>
              <button className="icon-button" type="button" onClick={() => onRemoveWarrant(item.id)} aria-label="Remove warrant" disabled={submitting}><Trash2 /></button>
            </article>
          ))
        )}
      </div>
    </Card>
  );
}
