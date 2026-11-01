import { useMemo, useEffect, useRef, useState } from 'react';
import { format, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { LabSample, LabOrder, LabTest } from '@/types/dhos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Timer,
  TrendingUp,
  XCircle,
  Bell,
  BellOff,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TATMonitorProps {
  samples: LabSample[];
  orders: LabOrder[];
  testCatalog: LabTest[];
}

interface TATEntry {
  sample: LabSample;
  order: LabOrder;
  expectedTAT: number; // hours
  elapsedMinutes: number;
  percentUsed: number;
  status: 'on-track' | 'warning' | 'overdue';
  overdueByMinutes: number;
}

export function TATMonitor({ samples, orders, testCatalog }: TATMonitorProps) {
  const { toast } = useToast();
  const [tick, setTick] = useState(0); // Forces re-computation
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const alertedSamples = useRef<Set<string>>(new Set());

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const tatEntries = useMemo(() => {
    const now = new Date();
    const activeSamples = samples.filter(s =>
      !['validated', 'reported'].includes(s.status)
    );

    return activeSamples
      .map(sample => {
        const order = orders.find(o => o.id === sample.orderId);
        if (!order) return null;

        const maxTAT = Math.max(
          ...order.tests.map(code => {
            const test = testCatalog.find(t => t.code === code);
            return test?.turnaroundTime || 4;
          })
        );

        // For STAT/urgent, reduce expected TAT
        const priorityMultiplier = order.priority === 'stat' ? 0.5 : order.priority === 'urgent' ? 0.75 : 1;
        const adjustedTAT = maxTAT * priorityMultiplier;

        const collectedAt = parseISO(sample.collectedAt);
        const elapsedMinutes = differenceInMinutes(now, collectedAt);
        const expectedMinutes = adjustedTAT * 60;
        const percentUsed = Math.min((elapsedMinutes / expectedMinutes) * 100, 200);
        const overdueByMinutes = Math.max(0, elapsedMinutes - expectedMinutes);

        let status: TATEntry['status'] = 'on-track';
        if (percentUsed >= 100) status = 'overdue';
        else if (percentUsed >= 75) status = 'warning';

        return {
          sample, order, expectedTAT: adjustedTAT,
          elapsedMinutes, percentUsed, status, overdueByMinutes,
        } as TATEntry;
      })
      .filter((e): e is TATEntry => e !== null)
      .sort((a, b) => b.percentUsed - a.percentUsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples, orders, testCatalog, tick]);

  // Fire alerts for newly overdue samples
  useEffect(() => {
    if (!alertsEnabled) return;
    tatEntries.forEach(entry => {
      if (entry.status === 'overdue' && !alertedSamples.current.has(entry.sample.id)) {
        alertedSamples.current.add(entry.sample.id);
        toast({
          title: `⚠️ TAT Exceeded: ${entry.sample.patientName}`,
          description: `${entry.sample.barcode} is ${formatElapsed(entry.overdueByMinutes)} overdue (${entry.order.priority.toUpperCase()} priority)`,
          variant: 'destructive',
        });
      }
    });
  }, [tatEntries, alertsEnabled, toast]);

  const overdueEntries = tatEntries.filter(e => e.status === 'overdue');
  const warningEntries = tatEntries.filter(e => e.status === 'warning');
  const onTrackEntries = tatEntries.filter(e => e.status === 'on-track');

  const avgTATPercent = tatEntries.length > 0
    ? Math.round(tatEntries.reduce((sum, e) => sum + Math.min(e.percentUsed, 100), 0) / tatEntries.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* TAT Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Timer className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{tatEntries.length}</p>
                <p className="text-xs text-muted-foreground">Active Samples</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">{onTrackEntries.length}</p>
                <p className="text-xs text-muted-foreground">On Track</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={warningEntries.length > 0 ? 'border-warning/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-2xl font-bold">{warningEntries.length}</p>
                <p className="text-xs text-muted-foreground">At Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={overdueEntries.length > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">{overdueEntries.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alerts Banner */}
      {overdueEntries.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                TAT Alerts — {overdueEntries.length} Sample{overdueEntries.length > 1 ? 's' : ''} Overdue
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setAlertsEnabled(!alertsEnabled)}
                >
                  {alertsEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                  {alertsEnabled ? 'Mute' : 'Unmute'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setTick(t => t + 1)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueEntries.map(entry => (
                <div
                  key={entry.sample.id}
                  className="flex items-center justify-between bg-background/80 border border-destructive/20 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{entry.sample.patientName}</span>
                        <Badge className={cn(
                          "text-xs uppercase",
                          entry.order.priority === 'stat' ? 'bg-destructive text-destructive-foreground' : 
                          entry.order.priority === 'urgent' ? 'bg-warning text-warning-foreground' : 
                          'bg-muted text-muted-foreground'
                        )}>
                          {entry.order.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.sample.barcode} · {entry.order.tests.join(', ')} · {entry.sample.status.replace('-', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">
                      +{formatElapsed(entry.overdueByMinutes)} overdue
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expected: {entry.expectedTAT}h · Elapsed: {formatElapsed(entry.elapsedMinutes)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Average TAT */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Average TAT Utilization
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Auto-refreshes every 30s</span>
              <span className={cn(
                "text-sm font-bold",
                avgTATPercent >= 100 ? "text-destructive" :
                avgTATPercent >= 75 ? "text-warning" :
                "text-success"
              )}>
                {avgTATPercent}%
              </span>
            </div>
          </div>
          <Progress
            value={Math.min(avgTATPercent, 100)}
            className={cn(
              "h-3",
              avgTATPercent >= 100 ? "[&>div]:bg-destructive" :
              avgTATPercent >= 75 ? "[&>div]:bg-warning" :
              "[&>div]:bg-success"
            )}
          />
        </CardContent>
      </Card>

      {/* TAT Trend Chart */}
      <TATTrendChart />

      {/* Individual TAT Entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Turnaround Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {tatEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active samples to monitor</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tatEntries.map(entry => {
                  const config = getStatusConfig(entry.status);
                  return (
                    <div
                      key={entry.sample.id}
                      className={cn(
                        "border border-border rounded-lg p-3",
                        entry.status === 'overdue' && "border-l-4 border-l-destructive bg-destructive/5",
                        entry.status === 'warning' && "border-l-4 border-l-warning bg-warning/5"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {config.icon}
                          <span className="font-medium text-sm">{entry.sample.patientName}</span>
                          <Badge variant="outline" className={cn('text-xs', config.badge)}>
                            {config.label}
                          </Badge>
                          {entry.order.priority !== 'routine' && (
                            <Badge className={cn(
                              "text-xs uppercase",
                              entry.order.priority === 'stat'
                                ? 'bg-destructive text-destructive-foreground'
                                : 'bg-warning text-warning-foreground'
                            )}>
                              {entry.order.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <code className="text-xs text-muted-foreground font-mono">
                            {entry.sample.barcode}
                          </code>
                          {entry.status === 'overdue' && (
                            <p className="text-xs font-medium text-destructive">
                              +{formatElapsed(entry.overdueByMinutes)} over
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <Progress
                          value={Math.min(entry.percentUsed, 100)}
                          className={cn("flex-1 h-2", config.progressColor)}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[80px] text-right">
                          {formatElapsed(entry.elapsedMinutes)} / {entry.expectedTAT}h
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Status: <strong className="capitalize">{entry.sample.status.replace('-', ' ')}</strong></span>
                        <span>·</span>
                        <span>{entry.sample.location}</span>
                        <span>·</span>
                        <span>Tests: {entry.order.tests.join(', ')}</span>
                        {entry.order.priority !== 'routine' && (
                          <>
                            <span>·</span>
                            <span className="text-warning">TAT adjusted for {entry.order.priority} priority</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function formatElapsed(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function getStatusConfig(status: TATEntry['status']) {
  switch (status) {
    case 'overdue':
      return {
        icon: <XCircle className="h-4 w-4 text-destructive" />,
        badge: 'bg-destructive text-destructive-foreground',
        progressColor: '[&>div]:bg-destructive',
        label: 'Overdue',
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="h-4 w-4 text-warning" />,
        badge: 'bg-warning/10 text-warning border-warning/20',
        progressColor: '[&>div]:bg-warning',
        label: 'At Risk',
      };
    default:
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
        badge: 'bg-success/10 text-success border-success/20',
        progressColor: '[&>div]:bg-success',
        label: 'On Track',
      };
  }
}

// Generate simulated 7-day TAT trend data by test category
function generateTATTrendData() {
  const categories = [
    { key: 'hematology', label: 'Hematology', target: 2 },
    { key: 'chemistry', label: 'Chemistry', target: 3 },
    { key: 'coagulation', label: 'Coagulation', target: 2.5 },
    { key: 'urinalysis', label: 'Urinalysis', target: 1.5 },
    { key: 'cardiac', label: 'Cardiac', target: 1 },
  ];

  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const entry: Record<string, string | number> = {
      date: format(date, 'EEE'),
      fullDate: format(date, 'MMM d'),
    };
    categories.forEach(cat => {
      // Simulate realistic TAT with slight variance and a trend
      const base = cat.target;
      const noise = (Math.sin(i * 1.7 + cat.key.length) * 0.3) + (Math.random() * 0.4 - 0.2);
      const weekendBump = [0, 6].includes(date.getDay()) ? 0.3 : 0;
      entry[cat.key] = Math.max(0.3, +(base + noise + weekendBump).toFixed(1));
    });
    data.push(entry);
  }
  return { data, categories };
}

const TREND_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--success))',
  'hsl(var(--info))',
];

function TATTrendChart() {
  const { data, categories } = useMemo(() => generateTATTrendData(), []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          TAT Trends — Past 7 Days
        </CardTitle>
        <p className="text-xs text-muted-foreground">Average turnaround time (hours) by test category</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number, name: string) => {
                  const cat = categories.find(c => c.key === name);
                  return [`${value}h`, cat?.label || name];
                }}
                labelFormatter={(label: string, payload: any[]) => {
                  if (payload?.[0]?.payload?.fullDate) return payload[0].payload.fullDate;
                  return label;
                }}
              />
              <Legend
                formatter={(value: string) => {
                  const cat = categories.find(c => c.key === value);
                  return cat?.label || value;
                }}
                wrapperStyle={{ fontSize: '12px' }}
              />
              {categories.map((cat, i) => (
                <Line
                  key={cat.key}
                  type="monotone"
                  dataKey={cat.key}
                  stroke={TREND_COLORS[i % TREND_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
