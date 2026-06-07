import { formatWarrantDate, getWarrantStatus } from '../lib/warrant.js';

export function StatusBanner({ warrant, sessionSeconds, onRevoke }) {
  const minutes = Math.floor(sessionSeconds / 60).toString().padStart(2, '0');
  const seconds = (sessionSeconds % 60).toString().padStart(2, '0');
  const status = getWarrantStatus(warrant);

  return (
    <div className="status-banner" role="status">
      <div>
        Warrant: <strong>{warrant?.number || '-'}</strong>
      </div>
      <div>
        Expiry: <strong>{formatWarrantDate(warrant?.accessEndTime || warrant?.expiresAt)}</strong>
      </div>
      <div>
        Access status: <strong>{status}</strong>
      </div>
      <div>
        Session: <strong>{minutes}:{seconds}</strong>
      </div>
      {status === 'Active' && (
        <button className="btn small danger" type="button" onClick={onRevoke}>Revoke access</button>
      )}
    </div>
  );
}
