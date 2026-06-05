import { ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card.jsx';
import { PRIVACY_RULES } from '../data/appConstants.js';

export function Privacy() {
  return (
    <Card title="د حریم اصول" icon={<ShieldCheck />}>
      <ul className="rule-list">
        {PRIVACY_RULES.map((rule) => <li key={rule}>{rule}</li>)}
      </ul>
    </Card>
  );
}
