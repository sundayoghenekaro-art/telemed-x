import { useMemo } from 'react';
import { subDays, format, differenceInMinutes, parseISO } from 'date-fns';
import { LabOrder, LabSample, LabAnalyzer } from '@/types/dhos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { BarChart3, TrendingUp, Cpu, Activity } from 'lucide-react';
import { labTestCatalog } from '@/data/labMockData';

interface LabDashboardProps {
  orders: LabOrder[];
  samples: LabSample[];
  analyzers: LabAnalyzer[];
}

// Generate simulated historical data for the past 7 days
function generateDailyVolume() {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const label = format(date, 'EEE');
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const base = isWeekend ? 25 : 55;
    data.push({
      day: label,
      routine: Math.floor(base + Math.random() * 20),
      urgent: Math.floor(5 + Math.random() * 10),
      stat: Math.floor(1 + Math.random() * 5),
    });
  }
  return data;
}

function generateTATTrends() {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      day: format(date, 'EEE'),
      avgTAT: +(2 + Math.random() * 2.5).toFixed(1),
      target: 4,
      p90: +(4 + Math.random() * 2).toFixed(1),
    });
  }
  return data;
}

function generateTestDistribution(orders: LabOrder[]) {
  const counts: Record<string, number> = {};
  orders.forEach(o => {
    o.tests.forEach(code => {
      const test = labTestCatalog.find(t => t.code === code);
      const name = test?.name || code;
      counts[name] = (counts[name] || 0) + 1;
    });
  });
  // Also add simulated historical volume
  const testNames = ['Complete Blood Count', 'Basic Metabolic Panel', 'Liver Function Tests', 'Lipid Panel', 'Urinalysis', 'Troponin I', 'COVID-19 PCR', 'Malaria Parasite'];
  testNames.forEach(name => {
    counts[name] = (counts[name] || 0) + Math.floor(10 + Math.random() * 40);
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(200, 70%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(340, 65%, 55%)',
];

const PIE_COLORS = [
  'hsl(var(--success))',
  'hsl(var(--primary))',
  'hsl(var(--chart-3))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

export function LabDashboard({ orders, samples, analyzers }: LabDashboardProps) {
  const dailyVolume = useMemo(() => generateDailyVolume(), []);
  const tatTrends = useMemo(() => generateTATTrends(), []);
  const testDistribution = useMemo(() => generateTestDistribution(orders), [orders]);

  const analyzerUtilization = useMemo(() => {
    return analyzers.map(a => ({
      name: a.name.replace(' Analyzer', '').replace(' Diagnostics', '').replace(' System', ''),
      utilization: Math.min(100, Math.round((a.currentQueue / Math.max(a.avgProcessingTime * 0.5, 1)) * 100 + Math.random() * 30 + 40)),
      queue: a.currentQueue,
      status: a.status,
    }));
  }, [analyzers]);

  const statusBreakdown = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    samples.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });
    // Add simulated historical volume
    const statuses = ['collected', 'in-transit', 'received', 'processing', 'analyzed', 'validated', 'reported'];
    statuses.forEach(s => {
      statusCounts[s] = (statusCounts[s] || 0) + Math.floor(5 + Math.random() * 15);
    });
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('-', ' '),
      value: count,
    }));
  }, [samples]);

  // Summary stats
  const totalWeekVolume = dailyVolume.reduce((s, d) => s + d.routine + d.urgent + d.stat, 0);
  const avgDailyTAT = +(tatTrends.reduce((s, d) => s + d.avgTAT, 0) / tatTrends.length).toFixed(1);
  const avgUtilization = Math.round(analyzerUtilization.reduce((s, a) => s + a.utilization, 0) / analyzerUtilization.length);

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{totalWeekVolume}</p>
                <p className="text-xs text-muted-foreground">7-Day Volume</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">{avgDailyTAT}h</p>
                <p className="text-xs text-muted-foreground">Avg TAT</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><Cpu className="h-5 w-5 text-info" /></div>
              <div>
                <p className="text-2xl font-bold">{avgUtilization}%</p>
                <p className="text-xs text-muted-foreground">Analyzer Util.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Activity className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-2xl font-bold">{orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length}</p>
                <p className="text-xs text-muted-foreground">Active Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Daily Volume & TAT Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Daily Sample Volume (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyVolume} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="routine" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} name="Routine" />
                <Bar dataKey="urgent" stackId="a" fill="hsl(var(--warning))" name="Urgent" />
                <Bar dataKey="stat" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="STAT" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              TAT Trends (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={tatTrends}>
                <defs>
                  <linearGradient id="tatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} unit="h" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}h`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="avgTAT" stroke="hsl(var(--primary))" fill="url(#tatGradient)" strokeWidth={2} name="Avg TAT" />
                <Line type="monotone" dataKey="target" stroke="hsl(var(--destructive))" strokeDasharray="5 5" strokeWidth={1.5} dot={false} name="Target" />
                <Line type="monotone" dataKey="p90" stroke="hsl(var(--warning))" strokeWidth={1.5} dot={{ r: 3 }} name="P90 TAT" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Analyzer Utilization & Test Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-info" />
              Analyzer Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analyzerUtilization} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Utilization']}
                />
                <Bar dataKey="utilization" radius={[0, 4, 4, 0]} name="Utilization">
                  {analyzerUtilization.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.status === 'error' ? 'hsl(var(--destructive))' :
                        entry.status === 'maintenance' ? 'hsl(var(--warning))' :
                        entry.utilization > 85 ? 'hsl(var(--destructive))' :
                        entry.utilization > 65 ? 'hsl(var(--warning))' :
                        'hsl(var(--primary))'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-warning" />
              Test Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={testDistribution} layout="vertical" barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={112}
                  interval={0}
                  tickLine={false}
                  tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                    const label = payload.value.length > 16 ? `${payload.value.slice(0, 15)}…` : payload.value;
                    return (
                      <text x={x} y={y} dy={3.5} textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">
                        {label}
                      </text>
                    );
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Orders" isAnimationActive={false}>
                  {testDistribution.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sample Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Sample Pipeline Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusBreakdown.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center space-y-3">
              {statusBreakdown.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm capitalize">{s.name}</span>
                  </div>
                  <span className="text-sm font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
