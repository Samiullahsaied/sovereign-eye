export function Card({ title, icon, children, actions, className = '' }) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <div className="card-header">
          {title && (
            <h2 className="card-title">
              {icon}
              <span>{title}</span>
            </h2>
          )}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
