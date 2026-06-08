import { Download } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useT } from '../i18n/index.jsx';
import { downloadCSV } from '../lib/csv.js';

export function NetworkPage({ trafficData, query }) {
  const t = useT();
  const canvasRef = useRef(null);
  const filtered = trafficData.filter((row) => `${row.ip} ${row.country} ${row.city}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const center = { x: rect.width / 2, y: rect.height / 2 };
    const nodes = filtered.map((row, index) => ({
      x: 60 + index * Math.max(80, (rect.width - 120) / Math.max(1, filtered.length - 1)),
      y: 60 + (index % 2) * 92,
      label: row.country,
      vpn: row.vpn
    }));
    if (nodes.length === 0) {
      ctx.fillStyle = '#80A0C0';
      ctx.font = '14px Vazirmatn';
      ctx.textAlign = 'center';
      ctx.fillText(t('network.noRowsCanvas'), rect.width / 2, rect.height / 2);
      return;
    }
    ctx.strokeStyle = '#C8A427';
    ctx.lineWidth = 1;
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
    });
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = node.vpn ? '#DC2626' : '#059669';
      ctx.fill();
      ctx.fillStyle = '#D8EAF8';
      ctx.font = '12px Vazirmatn';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 34);
    });
    ctx.beginPath();
    ctx.arc(center.x, center.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#C8A427';
    ctx.fill();
  }, [filtered, t]);

  const exportRows = () => downloadCSV('traffic_export.csv', [[t('common.time'), 'IP', t('common.country'), 'VPN', t('common.city')], ...filtered.map((row) => [row.time, row.ip, row.country, row.vpn ? 'VPN' : t('common.normal'), row.city])]);

  return (
    <div className="page-stack">
      <Card title={t('network.graph')}>
        <canvas ref={canvasRef} className="network-canvas" aria-label={t('network.graph')} />
      </Card>
      <Card title={t('network.trafficTable')} actions={<button className="btn small" type="button" onClick={exportRows}><Download /> {t('network.exportCsv')}</button>}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('common.time')}</th><th>IP</th><th>{t('common.country')}</th><th>VPN</th><th>{t('common.city')}</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.time}</td>
                  <td className="mono">{row.ip}</td>
                  <td>{row.country}</td>
                  <td><span className={`badge ${row.vpn ? 'warn' : 'ok'}`}>{row.vpn ? 'VPN' : t('common.normal')}</span></td>
                  <td>{row.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title={t('common.noLiveRecords')} body={t('network.noTrafficBody')} />}
        </div>
      </Card>
    </div>
  );
}
