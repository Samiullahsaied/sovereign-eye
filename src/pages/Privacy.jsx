import { ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card.jsx';
import { useT } from '../i18n/index.jsx';

export function Privacy() {
  const t = useT();
  return (
    <Card title={t('privacy.title')} icon={<ShieldCheck />}>
      <ul className="rule-list">
        {t('privacy.rules').map((rule) => <li key={rule}>{rule}</li>)}
      </ul>
    </Card>
  );
}
