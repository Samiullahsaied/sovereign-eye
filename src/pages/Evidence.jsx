import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';

export function Evidence({ evidence }) {
  return (
    <Card title="شواهد زنځیر">
      <div className="timeline">
        {evidence.length === 0 ? (
          <EmptyState title="شواهد نشته" body="سیستم به اړوند actions دلته ثبت کړي." />
        ) : (
          evidence.map((item) => (
            <article className="timeline-item" key={item.id}>
              <strong>{item.action}</strong>
              <span>{item.detail}</span>
              <small>{item.time}</small>
            </article>
          ))
        )}
      </div>
    </Card>
  );
}
