import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Download,
  FileWarning,
  Radio,
  ShieldAlert,
  Syringe,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  mockImmunisationCoverage,
  mockNotifiableDiseases,
  mockScreeningUptake,
  mockWaitingTimeReturn,
} from '@/data/europeMockData';
import { cn } from '@/lib/utils';

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

export function StatutoryReturnsPanel({ canSubmit = false }: { canSubmit?: boolean }) {
  const [notifications, setNotifications] = useState(mockNotifiableDiseases);

  const pending = notifications.filter((entry) => entry.status === 'pending').length;
  const belowTargetImmunisation = mockImmunisationCoverage.filter((entry) => entry.coverage < entry.target).length;
  const belowTargetScreening = mockScreeningUptake.filter((entry) => entry.uptake < entry.target).length;

  const reportDisease = (id: string) => {
    setNotifications((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, status: 'reported', reportedAt: new Date().toISOString() }
          : entry,
      ),
    );
    toast.success('Notification sent to the public health authority', {
      description: `${id} · statutory notification within the required 24-hour window.`,
    });
  };

  const exportNotifications = () => {
    downloadFile(
      'notifiable-diseases.csv',
      toCsv(
        notifications.map((entry) => ({
          id: entry.id,
          disease: entry.disease,
          patient: entry.patientRef,
          onset: entry.onset,
          status: entry.status,
          jurisdiction: entry.jurisdiction,
        })),
      ),
      'text/csv',
    );
    toast.success('Notifications exported', { description: `${notifications.length} rows · CSV` });
  };

  const exportReturns = () => {
    downloadFile(
      'statutory-returns-2026-11.json',
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          notifiableDiseases: notifications,
          immunisation: mockImmunisationCoverage,
          screening: mockScreeningUptake,
          waitingTimes: mockWaitingTimeReturn,
        },
        null,
        2,
      ),
      'application/json',
    );
    toast.success('Statutory returns packed', {
      description: 'Immunisation, screening, waiting times and notifications in one JSON file.',
    });
  };

  const coverageRows = useMemo(
    () => mockImmunisationCoverage.map((entry) => ({
      vaccine: entry.vaccine,
      eligible: entry.eligible,
      given: entry.dosesGiven,
      coverage: entry.coverage,
      target: entry.target,
    })),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileWarning className="h-5 w-5 text-primary" />
            Statutory returns &amp; public health registries
          </h2>
          <p className="text-sm text-muted-foreground">
            Notifiable disease reporting, immunisation coverage, screening uptake and waiting-time returns
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportReturns}>
          <Download className="h-4 w-4" /> Export returns pack
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-destructive">{pending}</p>
            <p className="text-xs text-muted-foreground">Notifications pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{mockImmunisationCoverage.length}</p>
            <p className="text-xs text-muted-foreground">Immunisation programmes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-warning">{belowTargetImmunisation + belowTargetScreening}</p>
            <p className="text-xs text-muted-foreground">Below national target</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{mockWaitingTimeReturn.length}</p>
            <p className="text-xs text-muted-foreground">Waiting-time returns</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifiable">
        <TabsList>
          <TabsTrigger value="notifiable" className="gap-2">
            <Radio className="h-4 w-4" /> Notifiable diseases
            {pending > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">{pending}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="immunisation" className="gap-2">
            <Syringe className="h-4 w-4" /> Immunisation
          </TabsTrigger>
          <TabsTrigger value="screening" className="gap-2">
            <ShieldAlert className="h-4 w-4" /> Screening
          </TabsTrigger>
          <TabsTrigger value="waiting" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Waiting times
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifiable" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={exportNotifications}>
              <Download className="h-3 w-3" /> Export CSV
            </Button>
          </div>
          {notifications.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {entry.disease}
                    <span className="ml-1.5 font-normal text-muted-foreground">· {entry.patientRef}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.id} · onset {format(new Date(entry.onset), 'dd MMM yyyy')} · {entry.jurisdiction}
                    {entry.reportedAt && <> · reported {format(new Date(entry.reportedAt), 'dd MMM yyyy HH:mm')}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={entry.status === 'reported' ? 'secondary' : 'destructive'} className="text-[10px] capitalize">
                    {entry.status}
                  </Badge>
                  {entry.status === 'pending' && (
                    <Button
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={!canSubmit}
                      onClick={() => reportDisease(entry.id)}
                    >
                      <Radio className="h-3 w-3" /> Report
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Notifications are transmitted to the regional authority; legal reporting windows are 24 hours for measles and tuberculosis.
          </p>
        </TabsContent>

        <TabsContent value="immunisation" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Programme</th>
                      <th className="py-2 pr-3 text-right font-medium">Eligible</th>
                      <th className="py-2 pr-3 text-right font-medium">Given</th>
                      <th className="py-2 pr-3 text-right font-medium">Coverage</th>
                      <th className="py-2 text-right font-medium">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverageRows.map((entry) => (
                      <tr key={entry.vaccine} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3">{entry.vaccine}</td>
                        <td className="py-2 pr-3 text-right">{entry.eligible}</td>
                        <td className="py-2 pr-3 text-right">{entry.given}</td>
                        <td className={cn('py-2 pr-3 text-right font-semibold', entry.coverage < entry.target ? 'text-destructive' : 'text-success')}>
                          {entry.coverage.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right text-xs text-muted-foreground">{entry.target}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screening" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Programme</th>
                      <th className="py-2 pr-3 text-right font-medium">Invited</th>
                      <th className="py-2 pr-3 text-right font-medium">Attended</th>
                      <th className="py-2 pr-3 text-right font-medium">Uptake</th>
                      <th className="py-2 text-right font-medium">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockScreeningUptake.map((entry) => (
                      <tr key={entry.programme} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3">{entry.programme}</td>
                        <td className="py-2 pr-3 text-right">{entry.invited}</td>
                        <td className="py-2 pr-3 text-right">{entry.attended}</td>
                        <td className={cn('py-2 pr-3 text-right font-semibold', entry.uptake < entry.target ? 'text-warning' : 'text-success')}>
                          {entry.uptake.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right text-xs text-muted-foreground">{entry.target}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waiting" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {mockWaitingTimeReturn.map((entry) => (
                  <div key={entry.specialty}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{entry.specialty}</span>
                      <span className={cn(entry.pct < entry.target ? 'text-destructive' : 'text-success')}>
                        {entry.pct.toFixed(1)}% within target
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', entry.pct < entry.target ? 'bg-destructive' : 'bg-success')}
                        style={{ width: `${Math.min(100, entry.pct)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {entry.withinTarget} of {entry.total} patients · target {entry.target}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
