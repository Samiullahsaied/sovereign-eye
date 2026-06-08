import { RotateCcw } from 'lucide-react';
import { Card } from '../components/Card.jsx';
import { SUPPORTED_LANGUAGES, useT } from '../i18n/index.jsx';

export function SettingsPage({ lang, theme, settingsRows, onLangChange, onThemeChange, onReset }) {
  const t = useT();

  return (
    <Card title={t('settings.title')}>
      <div className="settings-grid">
        <div>
          <h3>{t('settings.language')}</h3>
          <div className="segmented">
            {SUPPORTED_LANGUAGES.map((value) => (
              <button key={value} className={lang === value ? 'active' : ''} type="button" onClick={() => onLangChange(value)}>
                {t(`lang.${value}`)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3>{t('settings.theme')}</h3>
          <div className="segmented">
            <button className={theme === 'dark' ? 'active' : ''} type="button" onClick={() => onThemeChange('dark')}>{t('common.dark')}</button>
            <button className={theme === 'light' ? 'active' : ''} type="button" onClick={() => onThemeChange('light')}>{t('common.light')}</button>
          </div>
        </div>
      </div>
      <div className="notice">{t('settings.ipinfoNotice')}</div>
      <div className="notice">{t('settings.supabaseRows', { count: settingsRows.length })}</div>
      <div className="button-row">
        <button className="btn danger" type="button" onClick={onReset}><RotateCcw /> {t('settings.resetCache')}</button>
      </div>
    </Card>
  );
}
