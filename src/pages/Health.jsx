import { Card } from '../components/Card.jsx';

export function Health({ statusRows }) {
  return (
    <Card title="سیستم حالت">
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
