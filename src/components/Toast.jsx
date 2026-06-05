import { CheckCircle2, CircleAlert, Info } from 'lucide-react';

const ICONS = {
  ok: CheckCircle2,
  warn: CircleAlert,
  error: CircleAlert,
  info: Info
};

export function ToastStack({ toasts }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] ?? Info;
        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
