import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';

export function UsersPage({ users }) {
  return (
    <Card title="کاروونکي">
      <div className="notice">Users and roles are loaded from Supabase Auth profiles and the public.roles table. Passwords are handled only by Supabase Auth.</div>
      {users.length === 0 ? (
        <EmptyState title="کاروونکي نشته" body="Registered accounts will appear here after the Supabase schema is applied and user_profiles rows exist." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>نوم</th><th>Email</th><th>رول</th><th>Status</th></tr></thead>
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
