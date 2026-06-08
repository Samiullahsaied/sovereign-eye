import { Loader2, Menu, Moon, Search, Sun } from 'lucide-react';
import { SUPPORTED_LANGUAGES, useT } from '../i18n/index.jsx';

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
  const t = useT();
  const initial = user?.name?.trim()?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  const submitSearch = (event) => {
    event.preventDefault();
    onSearchSubmit?.();
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">◎</span>
        <span>{t('app.product')}</span>
      </div>
      <form className="search-box" onSubmit={submitSearch} role="search">
        <span className="sr-only">{t('common.search')}</span>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t('common.searchPlaceholder')} />
        <button type="submit" aria-label={t('common.search')} disabled={searchLoading}>
          {searchLoading ? <Loader2 aria-hidden="true" className="spin" /> : <Search aria-hidden="true" />}
        </button>
      </form>
      <div className="topbar-actions">
        <div className="language-tabs" aria-label={t('common.language')}>
          {SUPPORTED_LANGUAGES.map((value) => (
            <button key={value} type="button" className={lang === value ? 'active' : ''} onClick={() => onLangChange(value)}>
              {t(`lang.${value}`)}
            </button>
          ))}
        </div>
        <button className="icon-button" type="button" onClick={onThemeToggle} aria-label={t('common.toggleTheme')}>
          {theme === 'light' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        <div className="avatar" aria-label={user?.roleLabel || t('common.currentUser')} title={user?.roleLabel || ''}>
          {initial}
        </div>
        <button className="icon-button menu-button" type="button" onClick={onToggleSidebar} aria-label={t('common.openMenu')}>
          <Menu aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
