import { Download, Trash2 } from 'lucide-react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';
import { downloadCSV } from '../lib/csv.js';

export function Audit({ auditLog, onClearAudit }) {
  const t = useT();
  const exportAudit = () => downloadCSV('audit_export.csv', [[t('common.time'), t('common.user'), t('common.action'), t('common.detail')], ...auditLog.map((item) => [item.time, item.user, item.action, item.detail])]);

  return (
    <Card
      title={t('audit.title')}
      actions={(
        <>
          <button className="btn small" type="button" onClick={exportAudit}><Download /> CSV</button>
          <button className="btn small danger" type="button" onClick={onClearAudit}><Trash2 /> {t('common.clear')}</button>
        </>
      )}
    >
      {auditLog.length === 0 ? (
        <EmptyState title={t('audit.emptyTitle')} body={t('audit.emptyBody')} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('common.time')}</th><th>{t('common.user')}</th><th>{t('common.action')}</th><th>{t('common.detail')}</th></tr></thead>
            <tbody>
              {auditLog.slice(0, 100).map((item) => (
                <tr key={item.id}><td>{item.time}</td><td>{item.user}</td><td>{item.action}</td><td>{item.detail}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
