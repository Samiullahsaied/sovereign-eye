import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';

const RISK_COLORS = { high: '#DC2626', medium: '#D97706', normal: '#059669' };

export function MapPage({ points = [], onProvinceSelect }) {
  const t = useT();
  const [selectedProvince, setSelectedProvince] = useState('');
  const liveProvinceRows = Object.values(points.reduce((acc, point) => {
    const name = point.region || point.city || '';
    if (!name) return acc;
    const current = acc[name] || { id: name, province: name, count: 0, risk: 'normal' };
    current.count += 1;
    if (point.risk === 'high' || point.vpn) current.risk = 'high';
    else if (point.risk === 'medium' && current.risk !== 'high') current.risk = 'medium';
    acc[name] = current;
    return acc;
  }, {}));

  const chooseProvince = (province) => {
    setSelectedProvince(province);
    onProvinceSelect?.(province);
  };

  return (
    <div className="page-stack">
      <Card title={t('map.afghanistan')}>
        <MapContainer className="map-container tall" center={[33.93911, 67.709953]} zoom={6} scrollWheelZoom={false}>
          <TileLayer attribution="CartoDB" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {points.filter((point) => point.loc).map((point) => (
            <CircleMarker key={point.id} center={point.loc} radius={10} pathOptions={{ color: '#fff', fillColor: RISK_COLORS[point.risk || (point.vpn ? 'high' : 'normal')], fillOpacity: 0.9 }}>
              <Popup>{point.city || point.ip} - {point.vpn ? t('common.suspicious') : t('common.normal')}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        {points.length === 0 && <div className="notice">{t('common.noLiveRecords')}</div>}
      </Card>
      <Card title={t('map.provinceHeat')}>
        {liveProvinceRows.length === 0 ? (
          <EmptyState title={t('common.noLiveRecords')} body={t('map.noProvinceRows')} />
        ) : (
          <div className="heat-grid">
            {liveProvinceRows.map((row) => (
              <button key={row.id} type="button" className={`heat-cell tone-${row.risk === 'high' ? 0 : row.risk === 'medium' ? 1 : 2} ${selectedProvince === row.province ? 'active' : ''}`} onClick={() => chooseProvince(row.province)}>
                {row.province} ({row.count})
              </button>
            ))}
          </div>
        )}
        {selectedProvince && <div className="notice">{t('map.selectedProvince', { province: selectedProvince })}</div>}
      </Card>
    </div>
  );
}
