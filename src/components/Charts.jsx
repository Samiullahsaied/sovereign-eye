function normalize(values, height) {
  const max = Math.max(...values, 1);
  return values.map((value, index) => ({
    x: index * (100 / Math.max(1, values.length - 1)),
    y: height - (value / max) * height
  }));
}

export function AreaChart({ series, labels }) {
  const height = 80;
  return (
    <div className="svg-chart" role="img" aria-label="Threat trend chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {series.map((line, index) => {
          const points = normalize(line.data, height);
          const path = points.map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y + 8}`).join(' ');
          const fillPath = `${path} L 100 100 L 0 100 Z`;
          return (
            <g key={line.name}>
              <path d={fillPath} fill={line.color} opacity={index === 0 ? 0.18 : 0.11} />
              <path d={path} fill="none" stroke={line.color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </svg>
      <div className="chart-axis">{labels.map((label) => <span key={label}>{label}</span>)}</div>
      <div className="chart-legend">{series.map((line) => <span key={line.name}><i style={{ background: line.color }} />{line.name}</span>)}</div>
    </div>
  );
}

export function DonutChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 25;

  return (
    <div className="donut-layout" role="img" aria-label="Traffic type chart">
      <svg viewBox="0 0 42 42" className="donut">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(128,160,192,.18)" strokeWidth="5" />
        {items.map((item) => {
          const dash = total > 0 ? (item.value / total) * 100 : 0;
          const circle = (
            <circle
              key={item.label}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={item.color}
              strokeWidth="5"
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offset}
            />
          );
          offset -= dash;
          return circle;
        })}
      </svg>
      <div className="chart-legend vertical">{items.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}: {item.value}</span>)}</div>
    </div>
  );
}

export function BarChart({ values, labels }) {
  const max = Math.max(...values, 1);
  return (
    <div className="bar-chart" role="img" aria-label="Monthly operations chart">
      {values.map((value, index) => (
        <div className="bar-column" key={labels[index]}>
          <span style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
          <small>{labels[index]}</small>
        </div>
      ))}
    </div>
  );
}

export function RadialBars({ items }) {
  return (
    <div className="radial-grid" role="img" aria-label="Risk level chart">
      {items.map((item) => (
        <div className="radial-item" key={item.label} style={{ '--value': item.value, '--color': item.color }}>
          <div className="radial-circle"><strong>{item.value}%</strong></div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
