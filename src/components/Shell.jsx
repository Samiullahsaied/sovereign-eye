import { Sidebar } from './Sidebar.jsx';
import { StatusBanner } from './StatusBanner.jsx';
import { Topbar } from './Topbar.jsx';

export function Shell({
  children,
  activePage,
  lang,
  theme,
  query,
  sidebarOpen,
  navItems,
  user,
  warrant,
  sessionSeconds,
  onNavigate,
  onLogout,
  onLangChange,
  onThemeToggle,
  onQueryChange,
  onSearchSubmit,
  searchLoading,
  onToggleSidebar,
  onRevokeWarrant
}) {
  return (
    <div className="app-shell">
      <Topbar
        lang={lang}
        theme={theme}
        query={query}
        onLangChange={onLangChange}
        onThemeToggle={onThemeToggle}
        onQueryChange={onQueryChange}
        onSearchSubmit={onSearchSubmit}
        searchLoading={searchLoading}
        onToggleSidebar={onToggleSidebar}
        user={user}
      />
      <Sidebar activePage={activePage} items={navItems} open={sidebarOpen} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="main-content">
        <StatusBanner warrant={warrant} sessionSeconds={sessionSeconds} onRevoke={onRevokeWarrant} />
        {children}
      </main>
    </div>
  );
}
