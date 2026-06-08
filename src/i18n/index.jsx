import { createContext, useContext, useMemo } from 'react';
import { ar } from './ar.js';
import { en } from './en.js';
import { fa } from './fa.js';
import { ps } from './ps.js';

export const SUPPORTED_LANGUAGES = ['ps', 'fa', 'en', 'ar'];
export const RTL_LANGUAGES = ['ps', 'fa', 'ar'];

const DICTIONARIES = { ps, fa, en, ar };
const I18nContext = createContext({
  lang: 'ps',
  dir: 'rtl',
  t: (key) => key
});

function getPath(source, key) {
  return key.split('.').reduce((current, part) => current?.[part], source);
}

function interpolate(value, params = {}) {
  return String(value).replace(/\{\{(\w+)\}\}/g, (_, name) => params[name] ?? '');
}

export function normalizeLanguage(value) {
  if (value === 'dr') return 'fa';
  return SUPPORTED_LANGUAGES.includes(value) ? value : 'ps';
}

export function directionForLanguage(value) {
  return RTL_LANGUAGES.includes(normalizeLanguage(value)) ? 'rtl' : 'ltr';
}

export function createTranslator(lang) {
  const normalized = normalizeLanguage(lang);
  const dictionary = DICTIONARIES[normalized] || ps;
  const isProd = import.meta.env.PROD;

  return (key, params) => {
    const translated = getPath(dictionary, key);
    const fallback = getPath(en, key);
    const value = translated ?? fallback;

    if (value === undefined) {
      return isProd ? '' : interpolate(en.dev.missingTranslation, { key });
    }

    if (Array.isArray(value)) return value;
    if (typeof value === 'object') return value;
    return interpolate(value, params);
  };
}

export function I18nProvider({ lang, children }) {
  const normalized = normalizeLanguage(lang);
  const value = useMemo(() => ({
    lang: normalized,
    dir: directionForLanguage(normalized),
    t: createTranslator(normalized)
  }), [normalized]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useI18n().t;
}
