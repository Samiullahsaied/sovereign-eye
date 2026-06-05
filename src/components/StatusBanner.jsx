export function StatusBanner({ warrant, sessionSeconds }) {
  const minutes = Math.floor(sessionSeconds / 60).toString().padStart(2, '0');
  const seconds = (sessionSeconds % 60).toString().padStart(2, '0');

  return (
    <div className="status-banner" role="status">
      <div>
        حکم: <strong>{warrant?.number || '-'}</strong>
      </div>
      <div>
        پای: <strong>{warrant?.expiresAt || '-'}</strong>
      </div>
      <div>
        غونډه: <strong>{minutes}:{seconds}</strong>
      </div>
    </div>
  );
}
