import { Card } from '../components/Card.jsx';
import { BarChart, RadialBars } from '../components/Charts.jsx';

export function Analytics({ cases, trafficData }) {
  const months = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدي', 'دلو', 'حوت'];
  const monthlyValues = months.map((_, index) => {
    const monthNumber = index + 1;
    return cases.filter((item) => {
      const created = item.createdAtISO ? new Date(item.createdAtISO) : null;
      return created && created.getMonth() + 1 === monthNumber;
    }).length;
  });
  const high = cases.filter((item) => item.priority === 'بحراني' || item.priority === 'لوړ').length;
  const medium = cases.filter((item) => item.priority === 'منځنی').length;
  const low = Math.max(0, cases.length - high - medium);
  const total = Math.max(cases.length, 1);

  return (
    <div className="grid two">
      <Card title="میاشتنی عملیات">
        <BarChart
          labels={months}
          values={monthlyValues}
        />
      </Card>
      <Card title="د خطر کچه">
        <RadialBars items={[
          { label: 'لوړ', value: Math.round((high / total) * 100), color: '#DC2626' },
          { label: 'منځنی', value: Math.round((medium / total) * 100), color: '#D97706' },
          { label: 'ټیټ', value: Math.round((low / total) * 100), color: '#059669' }
        ]} />
        {trafficData.length === 0 && <div className="notice">Network analytics will appear after approved backend collectors write live rows.</div>}
      </Card>
    </div>
  );
}
