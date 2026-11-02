import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildSampleVitals, isDemoPatientId } from '@/lib/demoVitals';
import { VITALS_SERIES_LIMIT } from '@/lib/pagination';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  ClipboardPlus,
  Droplets,
  Footprints,
  Gauge,
  Heart,
  Info,
  Loader2,
  Minus,
  Moon,
  Pill,
  Sparkles,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
  type LucideIcon,
} from 'lucide-react';

interface VitalRow {
  id: string;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  temperature: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  weight: number | null;
  blood_glucose: number | null;
  steps: number | null;
  sleep_hours: number | null;
  source: string;
  recorded_at: string;
}

type VitalKey = 'heart_rate' | 'blood_pressure' | 'spo2' | 'temperature' | 'glucose' | 'respiratory_rate';
type Status = 'normal' | 'high' | 'low' | 'unknown';
type InsightTone = 'warn' | 'info' | 'good';

interface MetricConfig {
  key: VitalKey;
  label: string;
  unit: string;
  icon: LucideIcon;
  accent: string;
  tint: string;
  chartColor: string;
  normal: [number, number];
  read: (vital: VitalRow) => number | null;
  format: (vital: VitalRow) => string;
  secondary?: { label: string; read: (vital: VitalRow) => number | null };
}

interface Insight {
  tone: InsightTone;
  title: string;
  detail: string;
}

const METRICS: MetricConfig[] = [
  {
    key: 'heart_rate',
    label: 'Heart rate',
    unit: 'bpm',
    icon: Heart,
    accent: 'text-rose-500',
    tint: 'bg-rose-500/10',
    chartColor: '#e11d48',
    normal: [60, 100],
    read: (v) => v.heart_rate,
    format: (v) => (v.heart_rate != null ? String(v.heart_rate) : '—'),
  },
  {
    key: 'blood_pressure',
    label: 'Blood pressure',
    unit: 'mmHg',
    icon: Gauge,
    accent: 'text-violet-500',
    tint: 'bg-violet-500/10',
    chartColor: '#7c3aed',
    normal: [90, 129],
    read: (v) => v.blood_pressure_systolic,
    format: (v) =>
      v.blood_pressure_systolic != null && v.blood_pressure_diastolic != null
        ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
        : '—',
    secondary: { label: 'Diastolic', read: (v) => v.blood_pressure_diastolic },
  },
  {
    key: 'spo2',
    label: 'Oxygen (SpO₂)',
    unit: '%',
    icon: Droplets,
    accent: 'text-sky-500',
    tint: 'bg-sky-500/10',
    chartColor: '#0284c7',
    normal: [95, 100],
    read: (v) => v.spo2,
    format: (v) => (v.spo2 != null ? String(v.spo2) : '—'),
  },
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°F',
    icon: Thermometer,
    accent: 'text-amber-500',
    tint: 'bg-amber-500/10',
    chartColor: '#d97706',
    normal: [97, 99.5],
    read: (v) => v.temperature,
    format: (v) => (v.temperature != null ? v.temperature.toFixed(1) : '—'),
  },
  {
    key: 'glucose',
    label: 'Blood glucose',
    unit: 'mg/dL',
    icon: Activity,
    accent: 'text-emerald-500',
    tint: 'bg-emerald-500/10',
    chartColor: '#059669',
    normal: [70, 140],
    read: (v) => v.blood_glucose,
    format: (v) => (v.blood_glucose != null ? String(v.blood_glucose) : '—'),
  },
  {
    key: 'respiratory_rate',
    label: 'Resp. rate',
    unit: '/min',
    icon: Wind,
    accent: 'text-teal-500',
    tint: 'bg-teal-500/10',
    chartColor: '#0d9488',
    normal: [12, 20],
    read: (v) => v.respiratory_rate,
    format: (v) => (v.respiratory_rate != null ? String(v.respiratory_rate) : '—'),
  },
];

const STATUS_META: Record<Status, { label: string; className: string }> = {
  normal: { label: 'In range', className: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20' },
  high: { label: 'High', className: 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20' },
  low: { label: 'Low', className: 'bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20' },
  unknown: { label: 'No data', className: 'bg-white/60 text-muted-foreground ring-1 ring-border' },
};

const TONE_META: Record<InsightTone, { icon: LucideIcon; panel: string; iconClass: string }> = {
  warn: { icon: AlertTriangle, panel: 'border-amber-500/25 bg-amber-500/[0.07]', iconClass: 'text-amber-600' },
  info: { icon: Info, panel: 'border-sky-500/25 bg-sky-500/[0.06]', iconClass: 'text-sky-600' },
  good: { icon: CheckCircle2, panel: 'border-emerald-500/25 bg-emerald-500/[0.06]', iconClass: 'text-emerald-600' },
};

const STEP_GOAL = 8000;
const SLEEP_GOAL = 8;

function statusOf(value: number | null, normal: [number, number]): Status {
  if (value == null) return 'unknown';
  if (value < normal[0]) return 'low';
  if (value > normal[1]) return 'high';
  return 'normal';
}

function sourceLabel(source: string) {
  if (source === 'manual') return 'Manual';
  if (['apple_watch', 'fitbit', 'garmin'].includes(source)) return 'Wearable';
  return source.replace(/_/g, ' ');
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <div className="mt-2 h-7" aria-hidden="true" />;
  }

  const width = 120;
  const height = 28;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / (values.length - 1);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${height} L${points[0][0].toFixed(1)} ${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-7 w-full" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} fillOpacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2.2} fill={color} />
    </svg>
  );
}

function GoalBar({ icon: Icon, label, value, target, pct, barClass }: {
  icon: LucideIcon;
  label: string;
  value: string;
  target: string;
  pct: number;
  barClass: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="font-semibold text-foreground">
          {value} <span className="font-normal text-muted-foreground">/ {target}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
        <div className={cn('h-full rounded-full transition-all duration-700', barClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PatientHealthDashboard({
  patientUserId,
  onLogVitals,
  onBookSession,
}: {
  patientUserId: string;
  onLogVitals: () => void;
  onBookSession: () => void;
}) {
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [activeMeds, setActiveMeds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSample, setIsSample] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [metricKey, setMetricKey] = useState<VitalKey>('heart_rate');
  const [rangeDays, setRangeDays] = useState(14);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const [vitalsRes, medsRes] = await Promise.all([
        supabase
          .from('patient_vitals')
          .select('*')
          .eq('patient_user_id', patientUserId)
          .gte('recorded_at', subDays(new Date(), 30).toISOString())
          .order('recorded_at', { ascending: false })
          .limit(VITALS_SERIES_LIMIT),
        supabase
          .from('patient_medications')
          .select('id', { count: 'exact', head: true })
          .eq('patient_user_id', patientUserId)
          .eq('status', 'active'),
      ]);

      if (cancelled) return;

      const rows = (vitalsRes.data as VitalRow[]) ?? [];
      if (rows.length > 0) {
        setVitals(rows);
        setTruncated(rows.length >= VITALS_SERIES_LIMIT);
        setIsSample(false);
      } else if (isDemoPatientId(patientUserId)) {
        setVitals(buildSampleVitals());
        setIsSample(true);
      }
      setActiveMeds(medsRes.count ?? 0);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`patient-health-${patientUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'patient_vitals', filter: `patient_user_id=eq.${patientUserId}` },
        (payload) => {
          setVitals((prev) => [payload.new as VitalRow, ...prev]);
          setIsSample(false);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [patientUserId]);

  const latest = vitals[0] ?? null;
  const chartMetric = METRICS.find((metric) => metric.key === metricKey) ?? METRICS[0];

  const latestReadingFor = (metric: MetricConfig) => vitals.find((vital) => metric.read(vital) != null) ?? null;
  const readingsFor = (metric: MetricConfig) =>
    vitals.map((vital) => metric.read(vital)).filter((value): value is number => value != null);

  const windowVitals = useMemo(
    () => vitals.filter((vital) => new Date(vital.recorded_at) >= subDays(new Date(), rangeDays)),
    [vitals, rangeDays],
  );

  const chartData = useMemo(
    () =>
      [...windowVitals].reverse().map((vital) => ({
        label: format(parseISO(vital.recorded_at), rangeDays <= 7 ? 'EEE HH:mm' : 'MMM d'),
        primary: chartMetric.read(vital),
        secondary: chartMetric.secondary ? chartMetric.secondary.read(vital) : null,
      })),
    [windowVitals, chartMetric, rangeDays],
  );

  const insights = useMemo<Insight[]>(() => {
    if (!latest) return [];

    const weekVitals = vitals.filter((vital) => new Date(vital.recorded_at) >= subDays(new Date(), 7));
    const warnings: Insight[] = [];
    const notes: Insight[] = [];

    for (const metric of METRICS) {
      const reading = latestReadingFor(metric);
      const value = reading ? metric.read(reading) : null;
      const status = statusOf(value, metric.normal);
      if ((status === 'high' || status === 'low') && reading) {
        warnings.push({
          tone: 'warn',
          title: `${metric.label} ${status === 'high' ? 'above' : 'below'} range`,
          detail: `Latest reading ${metric.format(reading)} ${metric.unit}; healthy range is ${metric.normal[0]}–${metric.normal[1]} ${metric.unit}. Re-check when rested and mention it in your next consultation.`,
        });
      }
    }

    const bpReadings = weekVitals
      .map((vital) => vital.blood_pressure_systolic)
      .filter((value): value is number => value != null);
    const bpHigh = bpReadings.filter((value) => value > 129).length;
    if (!warnings.some((warning) => warning.title.startsWith('Blood pressure')) && bpHigh >= 2) {
      notes.push({
        tone: 'info',
        title: 'Blood pressure spikes this week',
        detail: `${bpHigh} of ${bpReadings.length} readings above 129 mmHg. Sit quietly for five minutes before you measure again.`,
      });
    }

    if (latest.sleep_hours != null && latest.sleep_hours < 7) {
      notes.push({
        tone: 'info',
        title: 'Short night of sleep',
        detail: `${latest.sleep_hours.toFixed(1)} h logged — adults do best with 7–9 h. Poor sleep can nudge your blood pressure and blood sugar.`,
      });
    }

    if (latest.steps != null && latest.steps < 5000) {
      notes.push({
        tone: 'info',
        title: 'Low step count today',
        detail: `${latest.steps.toLocaleString()} steps so far — a 15-minute walk would close most of the gap to your daily goal.`,
      });
    }

    if (warnings.length === 0) {
      warnings.push({
        tone: 'good',
        title: 'All key vitals in range',
        detail: 'Your latest heart rate, oxygen, temperature and glucose readings are within healthy ranges. Keep logging to keep the trend accurate.',
      });
    }

    return [...warnings, ...notes].slice(0, 3);
  }, [latest, vitals]);

  const stepsToday = latest?.steps ?? null;
  const sleepLast = latest?.sleep_hours ?? null;
  const stepPct = stepsToday != null ? Math.min(100, Math.round((stepsToday / STEP_GOAL) * 100)) : 0;
  const sleepPct = sleepLast != null ? Math.min(100, Math.round((sleepLast / SLEEP_GOAL) * 100)) : 0;

  const weightChange = (() => {
    const readings = vitals.filter((vital) => vital.weight != null);
    if (readings.length < 2) return null;
    return Number((readings[0].weight! - readings[readings.length - 1].weight!).toFixed(1));
  })();

  const lastUpdated = latest?.recorded_at ?? null;
  const readingsLabel = truncated
    ? `latest ${VITALS_SERIES_LIMIT.toLocaleString()} readings of the last 30 days`
    : `${vitals.length} reading${vitals.length === 1 ? '' : 's'} in the last 30 days`;

  return (
    <section className="space-y-4" aria-label="Health overview" aria-busy={loading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Health overview</h2>
            {isSample && (
              <Badge variant="outline" className="gap-1 border-amber-400/60 bg-amber-50/80 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <Sparkles className="h-3 w-3" /> Sample data
              </Badge>
            )}
            {activeMeds > 0 && (
              <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/5 text-[10px] font-semibold text-primary">
                <Pill className="h-3 w-3" /> {activeMeds} active medication{activeMeds === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lastUpdated
              ? `Last reading ${formatDistanceToNow(parseISO(lastUpdated), { addSuffix: true })} · ${readingsLabel}`
              : 'Track trends across your vitals, activity and sleep.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 border-white/70 bg-white/60 hover:bg-white/80" onClick={onLogVitals}>
            <ClipboardPlus className="h-4 w-4" /> Log vitals
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onBookSession}>
            <CalendarPlus className="h-4 w-4" /> Book a session
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel flex items-center justify-center gap-2 rounded-2xl py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your health data…
        </div>
      ) : !latest ? (
        <div className="glass-panel flex flex-col items-center gap-2 rounded-2xl px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Heart className="h-7 w-7" />
          </span>
          <p className="font-semibold text-foreground">No vitals recorded yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Log a reading or connect a wearable and this dashboard will fill with trends, goals and personalised insights.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button size="sm" className="gap-1.5" onClick={onLogVitals}>
              <ClipboardPlus className="h-4 w-4" /> Log your first reading
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-white/70 bg-white/60" onClick={onBookSession}>
              <CalendarPlus className="h-4 w-4" /> Book a session
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {METRICS.map((metric, index) => {
              const series = readingsFor(metric);
              const reading = latestReadingFor(metric);
              const value = series[0] ?? null;
              const previous = series[1] ?? null;
              const status = statusOf(value, metric.normal);
              const delta = value != null && previous != null ? Number((value - previous).toFixed(1)) : null;
              const spark = series.slice(0, 14).reverse();
              const Icon = metric.icon;
              const DeltaIcon = delta == null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;

              return (
                <Card
                  key={metric.key}
                  className="tx-hover animate-rise overflow-hidden rounded-2xl"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', metric.tint, metric.accent)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', STATUS_META[status].className)}>
                        {STATUS_META[status].label}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                    <p className="text-xl font-bold leading-tight text-foreground">
                      {reading ? metric.format(reading) : '—'}
                      <span className="ml-1 text-[11px] font-medium text-muted-foreground">{metric.unit}</span>
                    </p>
                    <Sparkline values={spark} color={metric.chartColor} />
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <DeltaIcon className="h-3 w-3" />
                      {delta == null
                        ? 'First reading'
                        : delta === 0
                          ? 'No change vs previous'
                          : `${delta > 0 ? '+' : ''}${delta} vs previous`}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <Card className="animate-rise rounded-2xl lg:col-span-2">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Activity className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Vitals trend</p>
                      <p className="text-[11px] text-muted-foreground">
                        {chartData.filter((point) => point.primary != null).length} readings · shaded band is the healthy range
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={metricKey} onValueChange={(value) => setMetricKey(value as VitalKey)}>
                      <SelectTrigger className="h-8 w-[150px] rounded-lg bg-white/70 text-xs" aria-label="Choose vital to chart">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METRICS.map((metric) => (
                          <SelectItem key={metric.key} value={metric.key} className="text-xs">
                            {metric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Tabs value={String(rangeDays)} onValueChange={(value) => setRangeDays(Number(value))}>
                      <TabsList className="h-8 rounded-lg border-white/70 bg-white/60 p-0.5">
                        {[7, 14, 30].map((days) => (
                          <TabsTrigger key={days} value={String(days)} className="h-6 rounded-md px-2 text-[11px]">
                            {days}d
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                <div className="mt-3">
                  {chartData.length < 2 ? (
                    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                      Not enough {chartMetric.label.toLowerCase()} readings in this range yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart data={chartData} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`vital-fill-${chartMetric.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartMetric.chartColor} stopOpacity={0.32} />
                            <stop offset="95%" stopColor={chartMetric.chartColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.7} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={26} />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={44}
                          domain={['auto', 'auto']}
                          padding={{ top: 12, bottom: 8 }}
                        />
                        <ReferenceArea
                          y1={chartMetric.normal[0]}
                          y2={chartMetric.normal[1]}
                          fill={chartMetric.chartColor}
                          fillOpacity={0.07}
                        />
                        <Tooltip
                          cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }}
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 12,
                            fontSize: 12,
                            boxShadow: '0 18px 40px -20px rgba(15, 23, 42, 0.55)',
                          }}
                          labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          formatter={(value: any, name: any) => [`${value} ${chartMetric.unit}`, name]}
                        />
                        <Area
                          type="monotone"
                          dataKey="primary"
                          name={chartMetric.label}
                          stroke={chartMetric.chartColor}
                          strokeWidth={2.2}
                          fill={`url(#vital-fill-${chartMetric.key})`}
                          dot={false}
                          activeDot={{ r: 3.5 }}
                          connectNulls
                          isAnimationActive={false}
                        />
                        {chartMetric.secondary && (
                          <Line
                            type="monotone"
                            dataKey="secondary"
                            name={chartMetric.secondary.label}
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={1.6}
                            strokeDasharray="4 3"
                            dot={false}
                            connectNulls
                            isAnimationActive={false}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="animate-rise rounded-2xl" style={{ animationDelay: '90ms' }}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">What to watch</p>
                    <p className="text-[11px] text-muted-foreground">From your latest readings</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {insights.map((insight) => {
                    const tone = TONE_META[insight.tone];
                    const ToneIcon = tone.icon;
                    return (
                      <div key={insight.title} className={cn('flex gap-2.5 rounded-xl border p-2.5', tone.panel)}>
                        <ToneIcon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.iconClass)} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{insight.title}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{insight.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="animate-rise rounded-2xl lg:col-span-2" style={{ animationDelay: '135ms' }}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Recent readings</p>
                      <p className="text-[11px] text-muted-foreground">Your last five entries</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onLogVitals}>
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {vitals.slice(0, 5).map((vital) => (
                    <div
                      key={vital.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/60 bg-white/50 px-3 py-2"
                    >
                      <span className="w-[94px] shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                        {format(parseISO(vital.recorded_at), 'MMM d, HH:mm')}
                      </span>
                      <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-foreground">
                        {vital.heart_rate != null && (
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-rose-500" /> {vital.heart_rate} bpm
                          </span>
                        )}
                        {vital.blood_pressure_systolic != null && vital.blood_pressure_diastolic != null && (
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3 w-3 text-violet-500" /> {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}
                          </span>
                        )}
                        {vital.spo2 != null && (
                          <span className="flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-sky-500" /> {vital.spo2}%
                          </span>
                        )}
                        {vital.temperature != null && (
                          <span className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3 text-amber-500" /> {vital.temperature.toFixed(1)}°F
                          </span>
                        )}
                        {vital.blood_glucose != null && (
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-emerald-500" /> {vital.blood_glucose} mg/dL
                          </span>
                        )}
                      </div>
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground ring-1 ring-border">
                        {sourceLabel(vital.source)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="animate-rise rounded-2xl" style={{ animationDelay: '180ms' }}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Gauge className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">Daily goals</p>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Latest day</span>
                </div>
                <GoalBar
                  icon={Footprints}
                  label="Steps"
                  value={stepsToday != null ? stepsToday.toLocaleString() : '—'}
                  target={STEP_GOAL.toLocaleString()}
                  pct={stepPct}
                  barClass="bg-primary"
                />
                <GoalBar
                  icon={Moon}
                  label="Sleep"
                  value={sleepLast != null ? `${sleepLast.toFixed(1)} h` : '—'}
                  target={`${SLEEP_GOAL} h`}
                  pct={sleepPct}
                  barClass="bg-indigo-500"
                />
                <div className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" /> Weight (30 days)
                  </span>
                  <span className="font-semibold text-foreground">
                    {weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lb` : '—'}
                  </span>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-1.5 border-white/70 bg-white/60 text-xs" onClick={onLogVitals}>
                  Update today&apos;s numbers <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
