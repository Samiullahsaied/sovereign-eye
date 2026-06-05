import { Inbox } from 'lucide-react';

export function EmptyState({ title, body }) {
  return (
    <div className="empty-state" role="status">
      <Inbox aria-hidden="true" />
      <strong>{title}</strong>
      {body && <span>{body}</span>}
    </div>
  );
}
