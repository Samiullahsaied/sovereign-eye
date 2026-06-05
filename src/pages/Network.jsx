import { Download } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Card } from '../components/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { downloadCSV } from '../lib/csv.js';

export function NetworkPage({ trafficData, query }) {
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
      ctx.fillText('No network rows loaded', rect.width / 2, rect.height / 2);
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
  }, [filtered]);

  const exportRows = () => downloadCSV('traffic_export.csv', [['وخت', 'IP', 'هیواد', 'VPN', 'ښار'], ...filtered.map((row) => [row.time, row.ip, row.country, row.vpn ? 'VPN' : 'عادي', row.city])]);

  return (
    <div className="page-stack">
      <Card title="د اړیکو شبکه">
        <canvas ref={canvasRef} className="network-canvas" aria-label="Network graph" />
      </Card>
      <Card title="د ترافیک جدول" actions={<button className="btn small" type="button" onClick={exportRows}><Download /> CSV صادرول</button>}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>وخت</th><th>IP</th><th>هیواد</th><th>VPN</th><th>ښار</th></tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.time}</td>
                  <td className="mono">{row.ip}</td>
                  <td>{row.country}</td>
                  <td><span className={`badge ${row.vpn ? 'warn' : 'ok'}`}>{row.vpn ? 'VPN' : 'عادي'}</span></td>
                  <td>{row.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState title="ترافیک نشته" body="کله چې Supabase rows وصل شي، معلومات به دلته ښکاره شي." />}
        </div>
      </Card>
    </div>
  );
}
