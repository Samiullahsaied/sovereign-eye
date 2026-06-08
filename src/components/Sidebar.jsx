import {
  Bot,
  BrainCircuit,
  ChartLine,
  Circle,
  ClipboardList,
  FolderOpen,
  Gauge,
  HeartPulse,
  Keyboard,
  Link,
  LogOut,
  Map,
  Network,
  Phone,
  Scale,
  Settings,
  Share2,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useT } from '../i18n/index.jsx';

const ICONS = {
  Bot,
  BrainCircuit,
  ChartLine,
  ClipboardList,
  FolderOpen,
  Gauge,
  HeartPulse,
  Keyboard,
  Link,
  Map,
  Network,
  Phone,
  Scale,
  Settings,
  Share2,
  ShieldCheck,
  Users
};

export function Sidebar({ activePage, items, onNavigate, open, onLogout }) {
  const t = useT();

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label={t('common.openMenu')}>
      <nav>
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? Circle;
          return (
            <button
              key={item.id}
              className={activePage === item.id ? 'nav-link active' : 'nav-link'}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              <Icon aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
        <button className="nav-link danger" type="button" onClick={onLogout}>
          <LogOut aria-hidden="true" />
          <span>{t('nav.logout')}</span>
        </button>
      </nav>
    </aside>
  );
}
