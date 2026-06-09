import { PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { useT } from '../i18n/index.jsx';
import { validatePhoneWithNumverify } from '../lib/numverify.js';
import { classifyPhoneNumber } from '../lib/phone.js';

function validityText(valid, t) {
  if (valid === null) return t('phone.localOnly');
  return valid ? t('phone.valid') : t('phone.invalid');
}

function lineTypeText(lineType, t) {
  if (!lineType) return t('common.unknown');
  const normalized = String(lineType).replace(/\s+/g, '').replace(/_/g, '');
  const key = normalized === 'fixedline' ? 'fixedLine' : normalized;
  return t(`phone.lineTypes.${key}`) || lineType;
}

const COUNTRY_KEY_BY_CODE = {
  AF: 'af',
  PK: 'pk',
  IR: 'ir',
  TR: 'tr',
  US: 'us',
  GB: 'gb',
  DE: 'de',
  FR: 'fr',
  IN: 'in',
  CN: 'cn',
  AE: 'ae',
  SA: 'sa'
};

const COUNTRY_KEY_BY_NAME = {
  afghanistan: 'af',
  pakistan: 'pk',
  iran: 'ir',
  turkey: 'tr',
  'united states': 'us',
  'united states of america': 'us',
  'united kingdom': 'gb',
  germany: 'de',
  france: 'fr',
  india: 'in',
  china: 'cn',
  'united arab emirates': 'ae',
  'saudi arabia': 'sa'
};

function countryNameText(result, t) {
  const keyFromCode = COUNTRY_KEY_BY_CODE[String(result.countryCode || '').toUpperCase()];
  const keyFromName = COUNTRY_KEY_BY_NAME[String(result.countryName || result.country || '').trim().toLowerCase()];
  const key = keyFromCode || keyFromName;
  return key ? t(`countries.${key}`) : result.countryName || result.country || t('common.unknown');
}

export function PhonePage({ warrant, onBeforeClassify, onClassify }) {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const classified = classifyPhoneNumber(phone);
    if (classified.normalized.length < 5) {
      setError(t('phone.minDigits'));
      return;
    }

    if (onBeforeClassify && !await onBeforeClassify()) return;

    setLoading(true);
    setError('');
    try {
      const live = await validatePhoneWithNumverify(phone);
      const merged = live.enabled === false ? {
        ...classified,
        valid: null,
        number: classified.normalized,
        internationalFormat: classified.normalized,
        localFormat: classified.normalized,
        countryCode: '',
        countryName: classified.country,
        countryPrefix: '',
        lineType: '',
        location: '',
        provider: 'local',
        message: live.message
      } : {
        normalized: live.internationalFormat || live.number || classified.normalized,
        number: live.number || '',
        internationalFormat: live.internationalFormat || '',
        localFormat: live.localFormat || '',
        country: live.countryName || classified.country,
        countryName: live.countryName || '',
        countryCode: live.countryCode || '',
        countryPrefix: live.countryPrefix || '',
        carrier: live.carrier || classified.carrier,
        lineType: live.lineType || '',
        location: live.location || '',
        valid: live.valid,
        isKnown: live.valid,
        provider: 'numverify'
      };

      setResult(merged);
      if (merged.message) setError(merged.message);
      await onClassify(phone, merged);
    } catch (err) {
      setResult(null);
      setError(err.message || t('phone.validationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('phone.title')}>
      <div className="notice">{t('phone.notice')}</div>
      <form className="inline-form" onSubmit={submit}>
        <label><span>{t('phone.number')}</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t('phone.numberPlaceholder')} inputMode="tel" disabled={loading} /></label>
        <button className="btn primary" type="submit" disabled={loading}><PhoneCall /> {loading ? t('phone.checking') : t('phone.classify')}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {result && (
        <div className="result-panel">
          <div>{t('common.countryName')}: <strong>{countryNameText(result, t)}</strong></div>
          <div>{t('common.countryCode')}: <strong>{result.countryCode || t('common.unknown')}</strong></div>
          <div>{t('phone.internationalFormat')}: <strong>{result.internationalFormat || result.normalized || t('common.unknown')}</strong></div>
          <div>{t('phone.localFormat')}: <strong>{result.localFormat || t('common.unknown')}</strong></div>
          <div>{t('phone.carrier')}: <strong>{result.carrier || t('common.unknown')}</strong></div>
          <div>{t('phone.lineType')}: <strong>{lineTypeText(result.lineType, t)}</strong></div>
          <div>{t('phone.validity')}: <strong>{validityText(result.valid, t)}</strong></div>
          <div>{t('phone.location')}: <strong>{result.location || t('phone.noLocation')}</strong></div>
          <div>{t('phone.warrant')}: <strong>{warrant?.number}</strong></div>
          <details>
            <summary>{t('common.technicalDetails')}</summary>
            <div>Country name: <strong>{result.countryName || result.country || 'Unknown'}</strong></div>
            <div>Country code: <strong>{result.countryCode || 'Unknown'}</strong></div>
            <div>International format: <strong>{result.internationalFormat || result.normalized || 'Unknown'}</strong></div>
            <div>Local format: <strong>{result.localFormat || 'Unknown'}</strong></div>
            <div>Carrier: <strong>{result.carrier || 'Unknown'}</strong></div>
            <div>Line type: <strong>{result.lineType || 'Unknown'}</strong></div>
            <div>Validity: <strong>{result.valid === null ? 'Local only' : result.valid ? 'Valid' : 'Invalid'}</strong></div>
            <div>Location: <strong>{result.location || 'Location information is not provided by the Numverify API for this number.'}</strong></div>
          </details>
        </div>
      )}
    </Card>
  );
}
