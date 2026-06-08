import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';

export function UsersPage({ users }) {
  const t = useT();
  return (
    <Card title={t('users.title')}>
      <div className="notice">{t('users.notice')}</div>
      {users.length === 0 ? (
        <EmptyState title={t('users.emptyTitle')} body={t('users.emptyBody')} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('common.name')}</th><th>{t('common.email')}</th><th>{t('common.role')}</th><th>{t('common.status')}</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.roleLabel}</td>
                  <td><span className={`badge ${user.status === 'active' ? 'ok' : 'warn'}`}>{user.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
