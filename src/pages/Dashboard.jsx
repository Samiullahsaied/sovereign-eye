import { AlertTriangle, Globe2, Hourglass, ShieldAlert, Video } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Card } from '../components/Card.jsx';
import { AreaChart, DonutChart } from '../components/Charts.jsx';

export function Dashboard({ cases, trafficData, alerts, dataLoading, ipLookup, dashboardStats = [], onDismissAlert, onFaceCheck }) {
  const latencyStat = dashboardStats.find((row) => row.key === 'latency_ms')?.value;
  const countries = new Set(trafficData.map((item) => item.country)).size;
  const vpnCount = trafficData.filter((item) => item.vpn).length;
  const criticalCount = cases.filter((item) => item.priority === 'بحراني').length;
  const normalTraffic = trafficData.filter((item) => !item.vpn).length;
  const foreignTraffic = trafficData.filter((item) => item.country && item.country !== 'Afghanistan' && item.country !== 'افغانستان').length;
  const chartLabels = trafficData.length > 0 ? trafficData.slice(0, 6).map((item) => item.time || item.ip) : [''];

  return (
    <div className="page-stack">
      <section className="kpi-grid" aria-label="Dashboard metrics">
        <Metric icon={<Globe2 />} value={cases.length} label="فعالې قضیې" />
        <Metric icon={<AlertTriangle />} value={criticalCount} label="بحراني" />
        <Metric icon={<Globe2 />} value={countries} label="هیوادونه" />
        <Metric icon={<ShieldAlert />} value={vpnCount} label="VPN/Tor" />
        <Metric icon={<Hourglass />} value={dataLoading ? '...' : latencyStat?.label || `${latencyStat?.value ?? 0}ms`} label="ځنډ" />
      </section>
      {trafficData.length === 0 && (
        <div className="notice">Live network rows are not loaded yet. When the approved backend writes traffic records, this dashboard will update from Supabase-backed data.</div>
      )}
      {(ipLookup?.loading || ipLookup?.error || ipLookup?.result) && (
        <Card title="IPinfo lookup">
          {ipLookup.loading && <div className="notice">Looking up IP address through the secure backend endpoint...</div>}
          {ipLookup.error && <p className="form-error">{ipLookup.error}</p>}
          {ipLookup.result && (
            <div className="result-panel" aria-live="polite">
              <div><strong className="mono">{ipLookup.result.ip}</strong></div>
              <div>{ipLookup.result.city || 'Unknown city'}, {ipLookup.result.region || 'Unknown region'}, {ipLookup.result.country || 'Unknown country'}</div>
              <div>Organization: {ipLookup.result.org || 'Not provided'}</div>
              <div>
                Privacy:
                {' '}
                <span className={`badge ${ipLookup.result.privacy?.vpn || ipLookup.result.privacy?.proxy || ipLookup.result.privacy?.tor ? 'warn' : 'ok'}`}>
                  {ipLookup.result.privacy?.vpn || ipLookup.result.privacy?.proxy || ipLookup.result.privacy?.tor ? 'VPN / proxy signal' : 'No VPN signal'}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid two">
        <Card title="د ګواښونو ګراف">
          <AreaChart
            labels={chartLabels}
            series={[
              { name: 'بحراني', data: chartLabels.map((_, index) => (index === 0 ? criticalCount : 0)), color: '#DC2626' },
              { name: 'لوړ', data: chartLabels.map((_, index) => (index === 0 ? cases.length : 0)), color: '#D97706' }
            ]}
          />
        </Card>
        <Card title="د ترافیکو ډولونه">
          <DonutChart items={[
            { label: 'عادي', value: normalTraffic, color: '#059669' },
            { label: 'VPN', value: vpnCount, color: '#DC2626' },
            { label: 'بهرني', value: foreignTraffic, color: '#0EA5E9' }
          ]} />
        </Card>
      </div>

      <div className="grid two">
        <Card title="نړیواله څارنه (نړۍ نقشه)">
          <MapContainer className="map-container" center={[20, 0]} zoom={1.5} scrollWheelZoom={false}>
            <TileLayer attribution="CartoDB" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            {trafficData.map((row) => (
              <CircleMarker
                key={row.id}
                center={row.loc}
                radius={8}
                pathOptions={{ color: '#fff', weight: 1, fillColor: row.vpn ? '#DC2626' : '#059669', fillOpacity: 0.85 }}
              >
                <Popup>
                  <strong>{row.ip}</strong>
                  <br />
                  {row.city}, {row.country}
                  <br />
                  {row.vpn ? 'VPN فعال' : 'عادي'}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </Card>
        <Card title="عامه کیمرې" actions={<button className="btn small" type="button" onClick={onFaceCheck}><Video />د مخ پیژندنې ازمایښت</button>}>
          <MapContainer className="map-container" center={[31.6289, 65.7372]} zoom={14} scrollWheelZoom={false}>
            <TileLayer attribution="CartoDB" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <CircleMarker center={[31.6289, 65.7372]} radius={10} pathOptions={{ color: '#fff', fillColor: '#C8A427', fillOpacity: 0.9 }}>
              <Popup>Secure camera feed pending authorization</Popup>
            </CircleMarker>
          </MapContainer>
        </Card>
      </div>

      <Card title="ژوندۍ خبرتیاوې">
        <div className="alert-list">
          {alerts.length === 0 ? (
            <p className="muted">اوس مهال ژوندۍ خبرتیا نشته.</p>
          ) : (
            alerts.map((alert) => (
              <div className="alert-item" key={alert.id}>
                <span>{alert.message}</span>
                <button className="icon-text-button" type="button" onClick={() => onDismissAlert(alert.id)}>لرې کول</button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon, value, label }) {
  return (
    <article className="metric-card">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
