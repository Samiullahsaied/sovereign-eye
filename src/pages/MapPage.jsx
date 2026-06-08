import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { useMemo, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';

const RISK_COLORS = { high: '#DC2626', medium: '#D97706', normal: '#059669' };

function riskColor(point) {
  const risk = point.risk || (point.vpn ? 'high' : 'normal');
  return RISK_COLORS[risk] || RISK_COLORS.normal;
}

function heatTone(count, maxCount) {
  if (!maxCount) return 2;
  const ratio = count / maxCount;
  if (ratio >= 0.75) return 0;
  if (ratio >= 0.4) return 1;
  return 2;
}

export function MapPage({ points = [], dataLoading = false, onLoadDemoData, onClearDemoData, onProvinceSelect }) {
  const t = useT();
  const [selectedProvince, setSelectedProvince] = useState('');
  const realPoints = useMemo(() => points.filter((point) => !point.isTestData), [points]);
  const demoPoints = useMemo(() => points.filter((point) => point.isTestData), [points]);
  const displayPoints = realPoints.length > 0 ? realPoints : demoPoints;
  const isUsingDemoData = realPoints.length === 0 && demoPoints.length > 0;
  const isDemoHidden = realPoints.length > 0 && demoPoints.length > 0;
  const mappablePoints = displayPoints.filter((point) => point.loc);
  const provinceRows = Object.values(displayPoints.reduce((acc, point) => {
    const name = point.region || point.city || '';
    if (!name) return acc;
    const current = acc[name] || { id: name, province: name, count: 0, isTestData: false };
    current.count += 1;
    current.isTestData = current.isTestData || point.isTestData;
    acc[name] = current;
    return acc;
  }, {})).sort((a, b) => b.count - a.count || a.province.localeCompare(b.province));
  const maxProvinceCount = Math.max(...provinceRows.map((row) => row.count), 0);

  const chooseProvince = (province) => {
    setSelectedProvince(province);
    onProvinceSelect?.(province);
  };

  return (
    <div className="page-stack">
      <Card title={t('map.afghanistan')}>
        <MapContainer className="map-container tall" center={[33.93911, 67.709953]} zoom={6} scrollWheelZoom={false}>
          <TileLayer attribution="CartoDB" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {mappablePoints.map((point) => (
            <CircleMarker key={point.id} center={point.loc} radius={10} pathOptions={{ color: '#fff', fillColor: riskColor(point), fillOpacity: 0.9 }}>
              <Popup>
                <strong>{point.city || point.ip}</strong>
                <br />
                {point.vpn ? t('common.suspicious') : t('common.normal')}
                {point.isTestData && (
                  <>
                    <br />
                    {t('map.testDataLabel')}
                  </>
                )}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        {displayPoints.length === 0 && <div className="notice">{t('common.noLiveRecords')}</div>}
        {isUsingDemoData && <div className="notice">{t('map.demoDataNotice')}</div>}
        {isDemoHidden && <div className="notice">{t('map.realDataOverridesDemo')}</div>}
      </Card>
      <Card title={t('map.provinceHeat')} actions={(
        <>
          <button type="button" className="btn small primary" onClick={onLoadDemoData} disabled={dataLoading}>
            {dataLoading ? t('common.loading') : t('map.loadDemoData')}
          </button>
          <button type="button" className="btn small" onClick={onClearDemoData} disabled={dataLoading || demoPoints.length === 0}>
            {t('map.clearDemoData')}
          </button>
        </>
      )}>
        {provinceRows.length === 0 ? (
          <EmptyState title={t('common.noLiveRecords')} body={t('map.noProvinceRows')} />
        ) : (
          <div className="heat-grid">
            {provinceRows.map((row) => (
              <button key={row.id} type="button" className={`heat-cell tone-${heatTone(row.count, maxProvinceCount)} ${selectedProvince === row.province ? 'active' : ''}`} onClick={() => chooseProvince(row.province)}>
                {row.province} ({row.count}) {row.isTestData ? t('map.testDataLabel') : ''}
              </button>
            ))}
          </div>
        )}
        {selectedProvince && <div className="notice">{t('map.selectedProvince', { province: selectedProvince })}</div>}
      </Card>
    </div>
  );
}
