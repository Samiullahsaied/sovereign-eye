import { Loader2, Menu, Moon, Search, Sun } from 'lucide-react';

export function Topbar({
  lang,
  theme,
  query,
  user,
  searchLoading = false,
  onLangChange,
  onThemeToggle,
  onQueryChange,
  onSearchSubmit,
  onToggleSidebar
}) {
  const initial = user?.name?.trim()?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  const submitSearch = (event) => {
    event.preventDefault();
    onSearchSubmit?.();
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">◎</span>
        <span>Sovereign Eye</span>
      </div>
      <form className="search-box" onSubmit={submitSearch} role="search">
        <span className="sr-only">Search dashboard data</span>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="پلټنه..." />
        <button type="submit" aria-label="Search dashboard data" disabled={searchLoading}>
          {searchLoading ? <Loader2 aria-hidden="true" className="spin" /> : <Search aria-hidden="true" />}
        </button>
      </form>
      <div className="topbar-actions">
        <div className="language-tabs" aria-label="Language">
          {[
            ['ps', 'پښتو'],
            ['dr', 'دری'],
            ['en', 'EN']
          ].map(([value, label]) => (
            <button key={value} type="button" className={lang === value ? 'active' : ''} onClick={() => onLangChange(value)}>
              {label}
            </button>
          ))}
        </div>
        <button className="icon-button" type="button" onClick={onThemeToggle} aria-label="Toggle theme">
          {theme === 'light' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        <div className="avatar" aria-label={user?.roleLabel || 'Current user'} title={user?.roleLabel || ''}>
          {initial}
        </div>
        <button className="icon-button menu-button" type="button" onClick={onToggleSidebar} aria-label="Open menu">
          <Menu aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
