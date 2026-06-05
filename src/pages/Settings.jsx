import { RotateCcw } from 'lucide-react';
import { Card } from '../components/Card.jsx';

export function SettingsPage({ lang, theme, settingsRows, onLangChange, onThemeChange, onReset }) {
  return (
    <Card title="تنظیمات">
      <div className="settings-grid">
        <div>
          <h3>ژبه</h3>
          <div className="segmented">
            {['ps', 'dr', 'en'].map((value) => <button key={value} className={lang === value ? 'active' : ''} type="button" onClick={() => onLangChange(value)}>{value.toUpperCase()}</button>)}
          </div>
        </div>
        <div>
          <h3>Theme</h3>
          <div className="segmented">
            <button className={theme === 'dark' ? 'active' : ''} type="button" onClick={() => onThemeChange('dark')}>تیاره</button>
            <button className={theme === 'light' ? 'active' : ''} type="button" onClick={() => onThemeChange('light')}>روښانه</button>
          </div>
        </div>
      </div>
      <div className="notice">IPinfo geolocation اوس د خوندي backend endpoint له لارې کار کوي. Token په browser یا settings UI کې نه ښکاري.</div>
      <div className="notice">Supabase settings rows loaded: {settingsRows.length}</div>
      <div className="button-row">
        <button className="btn danger" type="button" onClick={onReset}><RotateCcw /> Local UI cache reset</button>
      </div>
    </Card>
  );
}
