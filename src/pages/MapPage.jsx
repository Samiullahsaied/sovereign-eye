import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { PROVINCES } from '../data/appConstants.js';

const RISK_COLORS = {
  high: '#DC2626',
  medium: '#D97706',
  normal: '#059669'
};

export function MapPage({ points = [], onProvinceSelect }) {
  const [selectedProvince, setSelectedProvince] = useState('');

  const chooseProvince = (province) => {
    setSelectedProvince(province);
    onProvinceSelect?.(province);
  };

  return (
    <div className="page-stack">
      <Card title="د افغانستان نقشه">
        <MapContainer className="map-container tall" center={[33.93911, 67.709953]} zoom={6} scrollWheelZoom={false}>
          <TileLayer attribution="CartoDB" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {points.filter((point) => point.loc).map((point) => (
            <CircleMarker key={point.id} center={point.loc} radius={10} pathOptions={{ color: '#fff', fillColor: RISK_COLORS[point.risk || (point.vpn ? 'high' : 'normal')], fillOpacity: 0.9 }}>
              <Popup>
                {point.city || point.ip} - {point.vpn ? 'مشکوک' : 'عادي'}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        {points.length === 0 && <div className="notice">No live map points are loaded from Supabase yet.</div>}
      </Card>
      <Card title="ولایتي حرارت نقشه">
        <div className="heat-grid">
          {PROVINCES.map((province, index) => (
            <button
              key={province}
              type="button"
              className={`heat-cell tone-${index % 3} ${selectedProvince === province ? 'active' : ''}`}
              onClick={() => chooseProvince(province)}
            >
              {province}
            </button>
          ))}
        </div>
        {selectedProvince && <div className="notice">Selected province: {selectedProvince}. Live risk details will appear when Supabase status rows include province-level data.</div>}
      </Card>
    </div>
  );
}
