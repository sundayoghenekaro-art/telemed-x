import { ArrowDownRight, ArrowUpRight, Gauge, Minus, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DepartmentScorecard,
  MonthlyOperationsMetric,
  mockDepartmentScorecards,
  mockOperationsHistory,
} from '@/data/programmeOpsMockData';
import { cn } from '@/lib/utils';
import { StatutoryReturnsPanel } from '@/components/operations/StatutoryReturnsPanel';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

function delta(metric: MonthlyOperationsMetric, previous: MonthlyOperationsMetric | undefined, key: keyof MonthlyOperationsMetric, lowerIsBetter = false) {
  if (!previous) return { text: '—', good: null as boolean | null, change: 0 };
  const current = Number(metric[key]);
  const prior = Number(previous[key]);
  const change = ((current - prior) / prior) * 100;
  const good = lowerIsBetter ? change <= 0 : change >= 0;
  return {
    text: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    good,
    change,
  };
}

function DeltaBadge({ text, good, change }: { text: string; good: boolean | null; change: number }) {
  if (good === null) return <span className="text-[11px] text-muted-foreground">—</span>;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px]', good ? 'text-success' : 'text-destructive')}>
      <Icon className="h-3 w-3" />
      {text} vs last month
    </span>
  );
}

function maxOf(history: MonthlyOperationsMetric[], key: keyof MonthlyOperationsMetric): number {
  return Math.max(...history.map((entry) => Number(entry[key])));
}

export function OperationsCockpit({ canSubmitReturns = false }: { canSubmitReturns?: boolean }) {
  const history = mockOperationsHistory;
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const maxOccupancy = maxOf(history, 'occupancyPercent');
  const maxWait = maxOf(history, 'averageWaitMinutes');
  const maxNoShow = maxOf(history, 'noShowRate');
  const totalDischarges = mockDepartmentScorecards.reduce((sum, row) => sum + row.discharges, 0);
  const averageMargin = mockDepartmentScorecards.reduce((sum, row) => sum + row.marginPercent, 0) / mockDepartmentScorecards.length;

  const kpis = [
    {
      label: 'Bed turnover',
      value: latest.bedTurnover.toFixed(1),
      sub: 'discharges per bed per month',
      delta: delta(latest, previous, 'bedTurnover'),
      icon: TrendingUp,
    },
    {
      label: 'Average length of stay',
      value: `${latest.averageLengthOfStay.toFixed(1)} d`,
      sub: 'inpatient days per case',
      delta: delta(latest, previous, 'averageLengthOfStay', true),
      icon: Gauge,
    },
    {
      label: 'Cost per case',
      value: naira.format(latest.costPerCase),
      sub: 'direct + allocated overhead',
      delta: delta(latest, previous, 'costPerCase', true),
      icon: Users,
    },
    {
      label: 'Case-mix index',
      value: latest.caseMixIndex.toFixed(2),
      sub: 'acuity-weighted workload',
      delta: delta(latest, previous, 'caseMixIndex'),
      icon: TrendingUp,
    },
    {
      label: 'No-show rate',
      value: `${latest.noShowRate.toFixed(1)}%`,
      sub: 'missed appointments',
      delta: delta(latest, previous, 'noShowRate', true),
      icon: Minus,
    },
    {
      label: 'Average wait',
      value: `${latest.averageWaitMinutes} min`,
      sub: 'registration to consult',
      delta: delta(latest, previous, 'averageWaitMinutes', true),
      icon: Gauge,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Gauge className="h-6 w-6 text-primary" />
          Operations cockpit
        </h1>
        <p className="text-muted-foreground">
          {latest.month} · bed turnover, length of stay, cost per case, case-mix and access performance
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="space-y-1 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold leading-tight">{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
              <DeltaBadge text={kpi.delta.text} good={kpi.delta.good} change={kpi.delta.change} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Six-month trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Month</th>
                    <th className="py-2 pr-3 font-medium">Occupancy</th>
                    <th className="py-2 pr-3 font-medium">No-show</th>
                    <th className="py-2 pr-3 font-medium">Avg wait</th>
                    <th className="py-2 text-right font-medium">Cost / case</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, index) => {
                    const isLatest = index === history.length - 1;
                    return (
                      <tr key={entry.month} className={cn('border-b border-border/60 last:border-0', isLatest && 'bg-primary/5')}>
                        <td className="py-2 pr-3 font-medium">
                          {entry.month}
                          {isLatest && <Badge variant="secondary" className="ml-1.5 text-[10px]">latest</Badge>}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${(entry.occupancyPercent / maxOccupancy) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs">{entry.occupancyPercent}%</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-destructive"
                                style={{ width: `${(entry.noShowRate / maxNoShow) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs">{entry.noShowRate.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-warning"
                                style={{ width: `${(entry.averageWaitMinutes / maxWait) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs">{entry.averageWaitMinutes} min</span>
                          </div>
                        </td>
                        <td className="py-2 text-right text-xs font-medium">{naira.format(entry.costPerCase)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Discharges this month</p>
              <p className="text-xl font-bold">{totalDischarges}</p>
              <p className="text-[11px] text-muted-foreground">across {mockDepartmentScorecards.length} departments</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Average contribution margin</p>
              <p className={cn('text-xl font-bold', averageMargin >= 15 ? 'text-success' : 'text-warning')}>
                {averageMargin.toFixed(1)}%
              </p>
              <p className="text-[11px] text-muted-foreground">weighted by department revenue</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Worst access performer</p>
              <p className="text-sm font-semibold">
                {[...mockDepartmentScorecards].sort((a, b) => b.noShowRate - a.noShowRate)[0].department}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {[...mockDepartmentScorecards].sort((a, b) => b.noShowRate - a.noShowRate)[0].noShowRate.toFixed(1)}% no-show
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Department scorecards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Department</th>
                  <th className="py-2 pr-3 text-right font-medium">Discharges</th>
                  <th className="py-2 pr-3 text-right font-medium">ALOS</th>
                  <th className="py-2 pr-3 text-right font-medium">No-show</th>
                  <th className="py-2 pr-3 text-right font-medium">Avg wait</th>
                  <th className="py-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {[...mockDepartmentScorecards]
                  .sort((a, b) => b.discharges - a.discharges)
                  .map((row: DepartmentScorecard) => (
                    <tr key={row.department} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-medium">{row.department}</td>
                      <td className="py-2 pr-3 text-right">{row.discharges}</td>
                      <td className="py-2 pr-3 text-right">{row.averageLengthOfStay.toFixed(1)} d</td>
                      <td className={cn('py-2 pr-3 text-right', row.noShowRate > 12 && 'font-semibold text-destructive')}>
                        {row.noShowRate.toFixed(1)}%
                      </td>
                      <td className={cn('py-2 pr-3 text-right', row.averageWaitMinutes > 25 && 'font-semibold text-warning')}>
                        {row.averageWaitMinutes} min
                      </td>
                      <td className={cn('py-2 text-right font-medium', row.marginPercent < 12 ? 'text-warning' : 'text-success')}>
                        {row.marginPercent}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Hospital-wide indicators. Department scorecards exclude community outreach activity.
          </p>
        </CardContent>
      </Card>

      <StatutoryReturnsPanel canSubmit={canSubmitReturns} />
    </div>
  );
}
