import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadiologyOrder, RadiologyStudy, RadiologyReport, RadiologyModality } from '@/types/dhos';
import { modalityLabels } from '@/data/radiologyMockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle2, Timer } from 'lucide-react';

interface Props {
  orders: RadiologyOrder[];
  studies: RadiologyStudy[];
  reports: RadiologyReport[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function RadiologyDashboard({ orders, studies, reports }: Props) {
  const modalityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.modality] = (counts[o.modality] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value, label: modalityLabels[name as RadiologyModality] || name }));
  }, [orders]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const priorityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.priority] = (counts[o.priority] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [orders]);

  const totalOrders = orders.length;
  const totalStudies = studies.length;
  const totalReports = reports.length;
  const criticalFindings = reports.filter(r => r.critical).length;
  const avgImagesPerStudy = studies.length ? Math.round(studies.reduce((sum, s) => sum + s.imageCount, 0) / studies.length) : 0;

  // TAT calculations
  const tatData = useMemo(() => {
    return orders
      .filter(o => o.status === 'reported' || o.status === 'verified')
      .map(order => {
        const study = studies.find(s => s.orderId === order.id);
        const report = study ? reports.find(r => r.studyId === study.id) : undefined;
        const orderTime = new Date(order.orderedAt).getTime();
        const reportTime = report ? new Date(report.createdAt).getTime() : study?.reportedAt ? new Date(study.reportedAt).getTime() : null;
        const tatMinutes = reportTime ? Math.round((reportTime - orderTime) / 60000) : null;
        return {
          orderId: order.id,
          patientName: order.patientName,
          modality: order.modality,
          bodyPart: order.bodyPart,
          priority: order.priority,
          orderedAt: order.orderedAt,
          reportedAt: reportTime ? new Date(reportTime).toISOString() : null,
          tatMinutes,
          critical: report?.critical || false,
        };
      })
      .filter(t => t.tatMinutes !== null)
      .sort((a, b) => (b.tatMinutes || 0) - (a.tatMinutes || 0));
  }, [orders, studies, reports]);

  const avgTat = tatData.length ? Math.round(tatData.reduce((sum, t) => sum + (t.tatMinutes || 0), 0) / tatData.length) : 0;
  const statTat = useMemo(() => {
    const statItems = tatData.filter(t => t.priority === 'stat');
    return statItems.length ? Math.round(statItems.reduce((s, t) => s + (t.tatMinutes || 0), 0) / statItems.length) : 0;
  }, [tatData]);

  const tatByModality = useMemo(() => {
    const groups: Record<string, number[]> = {};
    tatData.forEach(t => {
      if (!groups[t.modality]) groups[t.modality] = [];
      groups[t.modality].push(t.tatMinutes || 0);
    });
    return Object.entries(groups).map(([mod, vals]) => ({
      name: mod,
      avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));
  }, [tatData]);

  function formatTat(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  const tatThreshold = 120; // 2 hours target

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Orders', value: totalOrders },
          { label: 'Studies Acquired', value: totalStudies },
          { label: 'Reports Filed', value: totalReports },
          { label: 'Avg Images/Study', value: avgImagesPerStudy },
          { label: 'Critical Findings', value: criticalFindings, highlight: criticalFindings > 0 },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${kpi.highlight ? 'text-destructive' : ''}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TAT Monitor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4" /> Turnaround Time (TAT) Monitor
            </CardTitle>
            <div className="flex gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Avg TAT:</span>
                <span className="font-semibold">{formatTat(avgTat)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-muted-foreground">STAT Avg:</span>
                <span className="font-semibold">{formatTat(statTat)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TAT by Modality Chart */}
          {tatByModality.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Average TAT by Modality (minutes)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={tatByModality}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} unit="m" />
                  <Tooltip formatter={(value: number) => [formatTat(value), 'Avg TAT']} />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                    {tatByModality.map((entry, i) => (
                      <Cell key={i} fill={entry.avg > tatThreshold ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Individual TAT Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">TAT</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tatData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No completed studies to calculate TAT
                    </TableCell>
                  </TableRow>
                ) : tatData.map(t => (
                  <TableRow key={t.orderId}>
                    <TableCell className="font-medium">
                      {t.patientName}
                      {t.critical && (
                        <Badge variant="outline" className="ml-1.5 text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                          CRITICAL
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.modality}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium uppercase ${t.priority === 'stat' ? 'text-destructive' : t.priority === 'urgent' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {t.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(t.orderedAt), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.reportedAt ? format(new Date(t.reportedAt), 'MMM d, HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatTat(t.tatMinutes || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(t.tatMinutes || 0) > tatThreshold ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                          Over Target
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> On Target
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Modality Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Orders by Modality</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modalityDistribution}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number, name: string) => [value, 'Orders']} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Priority Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={priorityDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {priorityDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Overview */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Order Status Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusDistribution} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value, 'Orders']} />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
