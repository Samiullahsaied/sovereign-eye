import { Card } from '../components/Card.jsx';
import { BarChart, RadialBars } from '../components/Charts.jsx';
import { useT } from '../i18n/index.jsx';

export function Analytics({ cases, trafficData }) {
  const t = useT();
  const months = t('analytics.months');
  const monthlyValues = months.map((_, index) => {
    const monthNumber = index + 1;
    return cases.filter((item) => {
      const created = item.createdAtISO ? new Date(item.createdAtISO) : null;
      return created && created.getMonth() + 1 === monthNumber;
    }).length;
  });
  const high = cases.filter((item) => item.priority === 'critical' || item.priority === 'high').length;
  const medium = cases.filter((item) => item.priority === 'medium').length;
  const low = Math.max(0, cases.length - high - medium);
  const total = Math.max(cases.length, 1);

  return (
    <div className="grid two">
      <Card title={t('analytics.monthlyOperations')}><BarChart ariaLabel={t('common.monthlyOperationsChart')} labels={months} values={monthlyValues} /></Card>
      <Card title={t('analytics.riskLevel')}>
        <RadialBars ariaLabel={t('common.riskLevelChart')} items={[
          { label: t('common.high'), value: Math.round((high / total) * 100), color: '#DC2626' },
          { label: t('common.medium'), value: Math.round((medium / total) * 100), color: '#D97706' },
          { label: t('common.low'), value: Math.round((low / total) * 100), color: '#059669' }
        ]} />
        {trafficData.length === 0 && <div className="notice">{t('analytics.networkPending')}</div>}
      </Card>
    </div>
  );
}
