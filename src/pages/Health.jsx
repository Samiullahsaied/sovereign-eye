import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';

function healthErrorLabel(errorType, t) {
  if (!errorType) return '';
  return t(`health.errors.${errorType}`);
}

export function Health({ statusRows, dataHealth }) {
  const t = useT();
  const sourceKey = dataHealth?.dataSource || 'empty';
  const tables = dataHealth?.tables || [];

  return (
    <div className="page-stack">
      <Card title={t('health.backendTitle')}>
        <div className="grid two">
          <article className="health-card">
            <strong>{t('health.connected')}</strong>
            <span className={`badge ${dataHealth?.connected ? 'ok' : 'warn'}`}>{dataHealth?.connected ? t('common.yes') : t('common.no')}</span>
          </article>
          <article className="health-card">
            <strong>{t('health.tablesReachable')}</strong>
            <span className="badge gold">{dataHealth?.tablesReachable || 0}/{dataHealth?.tablesTotal || 0}</span>
          </article>
          <article className="health-card">
            <strong>{t('health.lastRead')}</strong>
            <span>{dataHealth?.lastSuccessfulReadTime ? new Date(dataHealth.lastSuccessfulReadTime).toLocaleString() : t('common.notProvided')}</span>
          </article>
          <article className="health-card">
            <strong>{t('health.dataSource')}</strong>
            <span className={`badge ${sourceKey === 'live' ? 'ok' : 'gold'}`}>{t(`health.sources.${sourceKey}`)}</span>
          </article>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('health.table')}</th><th>{t('common.status')}</th><th>{t('health.rowsRead')}</th><th>{t('common.detail')}</th></tr></thead>
            <tbody>
              {tables.map((table) => (
                <tr key={table.table}>
                  <td className="mono">{table.table}</td>
                  <td><span className={`badge ${table.reachable ? 'ok' : 'warn'}`}>{table.reachable ? t('health.reachable') : t('health.notReachable')}</span></td>
                  <td>{table.rowCount || 0}</td>
                  <td>{table.reachable ? t(`health.sources.${table.source}`) : healthErrorLabel(table.errorType, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tables.length === 0 && <EmptyState title={t('common.noLiveRecords')} body={t('health.noTableReads')} />}
        </div>
      </Card>

      <Card title={t('health.title')}>
        {statusRows.length === 0 ? (
          <EmptyState title={t('common.noLiveRecords')} body={t('health.noStatusRows')} />
        ) : (
          <div className="grid two">
            {statusRows.map((service) => (
              <article className="health-card" key={service.id || service.name}>
                <strong>{service.name}</strong>
                <span className={`badge ${service.tone}`}>{service.status}</span>
                {service.checkedAt && <small>{service.checkedAt}</small>}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
