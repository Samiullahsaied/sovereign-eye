import { useT } from '../i18n/index.jsx';
import { formatWarrantDate, getWarrantStatus } from '../lib/warrant.js';

function statusKey(status) {
  if (status === 'Active') return 'common.active';
  if (status === 'Pending') return 'common.pending';
  if (status === 'Expired') return 'common.expired';
  if (status === 'Revoked') return 'common.revoked';
  return 'common.unknown';
}

export function StatusBanner({ warrant, sessionSeconds, onRevoke }) {
  const t = useT();
  const minutes = Math.floor(sessionSeconds / 60).toString().padStart(2, '0');
  const seconds = (sessionSeconds % 60).toString().padStart(2, '0');
  const status = getWarrantStatus(warrant);

  return (
    <div className="status-banner" role="status">
      <div>
        {t('status.warrant')}: <strong>{warrant?.number || '-'}</strong>
      </div>
      <div>
        {t('status.expiry')}: <strong>{formatWarrantDate(warrant?.accessEndTime || warrant?.expiresAt)}</strong>
      </div>
      <div>
        {t('status.accessStatus')}: <strong>{t(statusKey(status))}</strong>
      </div>
      <div>
        {t('status.session')}: <strong>{minutes}:{seconds}</strong>
      </div>
      {status === 'Active' && (
        <button className="btn small danger" type="button" onClick={onRevoke}>{t('status.revokeAccess')}</button>
      )}
    </div>
  );
}
