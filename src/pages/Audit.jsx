import { Download, Trash2 } from 'lucide-react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { downloadCSV } from '../lib/csv.js';

export function Audit({ auditLog, onClearAudit }) {
  const exportAudit = () => downloadCSV('audit_export.csv', [['وخت', 'کارونکی', 'کړنه', 'تفصیل'], ...auditLog.map((item) => [item.time, item.user, item.action, item.detail])]);

  return (
    <Card
      title="آډیټ لاګ"
      actions={
        <>
          <button className="btn small" type="button" onClick={exportAudit}><Download /> CSV</button>
          <button className="btn small danger" type="button" onClick={onClearAudit}><Trash2 /> پاکول</button>
        </>
      }
    >
      {auditLog.length === 0 ? (
        <EmptyState title="آډیټ نشته" body="وروسته له login او actions څخه به لاګ دلته ښکاره شي." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>وخت</th><th>کارونکی</th><th>کړنه</th><th>تفصیل</th></tr></thead>
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
