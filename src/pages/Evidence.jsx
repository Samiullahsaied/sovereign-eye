import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';

export function Evidence({ evidence }) {
  const t = useT();
  return (
    <Card title={t('evidence.title')}>
      <div className="timeline">
        {evidence.length === 0 ? (
          <EmptyState title={t('evidence.emptyTitle')} body={t('evidence.emptyBody')} />
        ) : evidence.map((item) => (
          <article className="timeline-item" key={item.id}>
            <strong>{item.action}</strong>
            <span>{item.detail}</span>
            <small>{item.time}</small>
          </article>
        ))}
      </div>
    </Card>
  );
}
