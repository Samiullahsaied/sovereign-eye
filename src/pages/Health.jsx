import { Card } from '../components/Card.jsx';
import { useT } from '../i18n/index.jsx';

export function Health({ statusRows }) {
  const t = useT();
  return (
    <Card title={t('health.title')}>
      <div className="grid two">
        {statusRows.map((service) => (
          <article className="health-card" key={service.id || service.name}>
            <strong>{service.name}</strong>
            <span className={`badge ${service.tone}`}>{service.status}</span>
            {service.checkedAt && <small>{service.checkedAt}</small>}
          </article>
        ))}
      </div>
    </Card>
  );
}
