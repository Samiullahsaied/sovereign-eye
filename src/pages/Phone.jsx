import { PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { validatePhoneWithNumverify } from '../lib/numverify.js';
import { classifyPhoneNumber } from '../lib/phone.js';

const NO_LOCATION_MESSAGE_PS = 'د دې شمېرې لپاره د موقعیت معلومات د Numverify API لخوا نه ورکول کېږي.';
const NO_LOCATION_MESSAGE_EN = 'Location information is not provided by the Numverify API for this number.';

const COUNTRY_NAMES_PS = {
  Afghanistan: 'افغانستان',
  Pakistan: 'پاکستان',
  Iran: 'ایران',
  Turkey: 'ترکیه',
  'United States': 'د امریکا متحده ایالات',
  'United States of America': 'د امریکا متحده ایالات',
  'United Kingdom': 'برتانیا',
  Germany: 'آلمان',
  France: 'فرانسه',
  India: 'هند',
  China: 'چین',
  'United Arab Emirates': 'متحده عربي امارات',
  'Saudi Arabia': 'سعودي عربستان'
};

const LINE_TYPES_PS = {
  mobile: 'موبایل',
  landline: 'ثابت خط',
  'fixed line': 'ثابت خط',
  toll_free: 'وړیا کرښه',
  premium_rate: 'لوړ لګښت لرونکې کرښه',
  satellite: 'سپوږمکۍ کرښه',
  voip: 'انټرنېټي تلیفون'
};

function validityText(valid) {
  if (valid === null) return 'یوازې محلي';
  return valid ? 'معتبره' : 'نامعتبره';
}

function countryNameText(result) {
  const value = result.countryName || result.country || '';
  return COUNTRY_NAMES_PS[value] || value || 'نامعلوم';
}

function lineTypeText(lineType) {
  return LINE_TYPES_PS[lineType] || lineType || 'نامعلوم';
}

export function PhonePage({ warrant, onBeforeClassify, onClassify }) {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const classified = classifyPhoneNumber(phone);
    if (classified.normalized.length < 5) {
      setError('شمېره لږ تر لږه 5 عددونه غواړي.');
      return;
    }

    if (onBeforeClassify && !await onBeforeClassify()) {
      return;
    }

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
      setError(err.message || 'Phone validation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="نړیوال تلیفون تعقیب">
      <div className="notice">دا workflow د قانوني ثبت لپاره دی. حقیقي telecom lookup باید د منظور شوي backend provider له لارې وصل شي.</div>
      <form className="inline-form" onSubmit={submit}>
        <label>
          <span>شمېره</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+93 700 000 000" inputMode="tel" disabled={loading} />
        </label>
        <button className="btn primary" type="submit" disabled={loading}><PhoneCall /> {loading ? 'کتل کېږي...' : 'طبقه بندي'}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {result && (
        <div className="result-panel">
          <div>د هېواد نوم: <strong>{countryNameText(result)}</strong></div>
          <div>د هېواد کوډ: <strong>{result.countryCode || 'نامعلوم'}</strong></div>
          <div>نړیواله بڼه: <strong>{result.internationalFormat || result.normalized || 'نامعلوم'}</strong></div>
          <div>محلي بڼه: <strong>{result.localFormat || 'نامعلوم'}</strong></div>
          <div>مخابراتي شرکت: <strong>{result.carrier || 'نامعلوم'}</strong></div>
          <div>د کرښې ډول: <strong>{lineTypeText(result.lineType)}</strong></div>
          <div>اعتبار: <strong>{validityText(result.valid)}</strong></div>
          <div>موقعیت: <strong>{result.location || NO_LOCATION_MESSAGE_PS}</strong></div>
          <div>حکم: <strong>{warrant?.number}</strong></div>
          <details>
            <summary>تخنیکي جزئیات</summary>
            <div>Country name: <strong>{result.countryName || result.country || 'Unknown'}</strong></div>
            <div>Country code: <strong>{result.countryCode || 'Unknown'}</strong></div>
            <div>International format: <strong>{result.internationalFormat || result.normalized || 'Unknown'}</strong></div>
            <div>Local format: <strong>{result.localFormat || 'Unknown'}</strong></div>
            <div>Carrier: <strong>{result.carrier || 'Unknown'}</strong></div>
            <div>Line type: <strong>{result.lineType || 'Unknown'}</strong></div>
            <div>Validity: <strong>{result.valid === null ? 'Local only' : result.valid ? 'Valid' : 'Invalid'}</strong></div>
            <div>Location: <strong>{result.location || NO_LOCATION_MESSAGE_EN}</strong></div>
          </details>
        </div>
      )}
    </Card>
  );
}
