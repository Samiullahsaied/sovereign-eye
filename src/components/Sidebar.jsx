import {
  ChartLine,
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
  Users,
  Circle
} from 'lucide-react';

const ICONS = {
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
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Main navigation">
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
              <span>{item.label}</span>
            </button>
          );
        })}
        <button className="nav-link danger" type="button" onClick={onLogout}>
          <LogOut aria-hidden="true" />
          <span>وتل</span>
        </button>
      </nav>
    </aside>
  );
}
