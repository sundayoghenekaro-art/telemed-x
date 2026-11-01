import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Baby,
  CalendarHeart,
  ClipboardCheck,
  HeartPulse,
  MailPlus,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AntenatalRecord,
  ScreeningRecall,
  mockAntenatalRecords,
  mockChildHealthChecks,
  mockScreeningRecalls,
} from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const RISK_STYLE: Record<AntenatalRecord['risk'], string> = {
  low: 'bg-success/10 text-success border-success/30',
  moderate: 'bg-warning/10 text-warning border-warning/30',
  high: 'bg-destructive/10 text-destructive border-destructive/30',
};

const RECALL_STYLE: Record<ScreeningRecall['status'], string> = {
  due: 'bg-info/10 text-info border-info/30',
  invited: 'bg-warning/10 text-warning border-warning/30',
  attended: 'bg-success/10 text-success border-success/30',
  overdue: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function MaternityScreeningPanel({ canManage = false }: { canManage?: boolean }) {
  const [antenatal, setAntenatal] = useState(mockAntenatalRecords);
  const [recalls, setRecalls] = useState(mockScreeningRecalls);
  const [booked, setBooked] = useState<Record<string, string>>({});

  const stats = useMemo(() => ({
    antenatal: antenatal.length,
    highRisk: antenatal.filter((entry) => entry.risk === 'high').length,
    recallsDue: recalls.filter((entry) => entry.status === 'due' || entry.status === 'overdue').length,
    childChecks: mockChildHealthChecks.filter((entry) => entry.status === 'due').length,
  }), [antenatal, recalls]);

  const bookNextVisit = (entry: AntenatalRecord) => {
    const next = new Date(entry.nextVisit);
    setBooked((prev) => ({ ...prev, [entry.id]: next.toISOString() }));
    toast.success('Next antenatal visit confirmed', {
      description: `${entry.patientName} · ${format(next, 'dd MMM yyyy')} · midwife-led clinic.`,
    });
  };

  const invite = (entry: ScreeningRecall) => {
    setRecalls((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'invited' } : item)),
    );
    toast.success('Screening invitation sent', {
      description: `${entry.patientName} · ${entry.programme} screening · invite by post and portal.`,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Baby className="h-5 w-5 text-primary" />
          Maternity, child health &amp; screening
        </h2>
        <p className="text-sm text-muted-foreground">
          Antenatal risk pathways, child health reviews and population screening recalls
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{stats.antenatal}</p>
            <p className="text-xs text-muted-foreground">Antenatal records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-destructive">{stats.highRisk}</p>
            <p className="text-xs text-muted-foreground">High-risk pregnancies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-warning">{stats.recallsDue}</p>
            <p className="text-xs text-muted-foreground">Screening recalls due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{stats.childChecks}</p>
            <p className="text-xs text-muted-foreground">Child health reviews due</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="antenatal">
        <TabsList>
          <TabsTrigger value="antenatal" className="gap-2">
            <HeartPulse className="h-4 w-4" /> Antenatal
          </TabsTrigger>
          <TabsTrigger value="child" className="gap-2">
            <Stethoscope className="h-4 w-4" /> Child health
          </TabsTrigger>
          <TabsTrigger value="screening" className="gap-2">
            <ShieldAlert className="h-4 w-4" /> Screening recalls
            {stats.recallsDue > 0 && (
              <span className="ml-1 rounded-full bg-warning px-1.5 py-0.5 text-xs text-warning-foreground">{stats.recallsDue}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="antenatal" className="mt-4 space-y-2">
          {antenatal.map((entry) => (
            <Card key={entry.id} className={cn(entry.risk === 'high' && 'border-destructive/30')}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {entry.patientName}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {entry.upid}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      G{entry.gravida}P{entry.para} · {entry.gestationWeeks} weeks · EDD {format(new Date(entry.edd), 'dd MMM yyyy')} ·
                      BP {entry.bp} · fundal height {entry.fundalHeight} cm
                    </p>
                    <p className="text-[11px] text-muted-foreground">{entry.notes}</p>
                  </div>
                  <span className={cn('w-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', RISK_STYLE[entry.risk])}>
                    {entry.risk} risk
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={!canManage}
                    onClick={() => bookNextVisit(entry)}
                  >
                    <CalendarHeart className="h-3 w-3" /> Confirm next visit {format(new Date(entry.nextVisit), 'dd MMM')}
                  </Button>
                  {booked[entry.id] && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <ClipboardCheck className="h-3 w-3" /> confirmed
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="child" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Child</th>
                      <th className="py-2 pr-3 font-medium">Review</th>
                      <th className="py-2 pr-3 font-medium">Due</th>
                      <th className="py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockChildHealthChecks.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3 font-medium">{entry.childName}</td>
                        <td className="py-2 pr-3 text-xs">{entry.visit}</td>
                        <td className="py-2 pr-3 text-xs">
                          {entry.due === '—' ? '—' : format(new Date(entry.due), 'dd MMM yyyy')}
                        </td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={entry.status === 'due' ? 'destructive' : entry.status === 'completed' ? 'secondary' : 'outline'}
                            className="text-[10px] capitalize"
                          >
                            {entry.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screening" className="mt-4 space-y-2">
          {recalls.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {entry.patientName}
                    <span className="ml-1.5 font-normal text-muted-foreground">· {entry.programme} screening</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.id} · due {format(new Date(entry.dueDate), 'dd MMM yyyy')} · last result {entry.lastResult}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', RECALL_STYLE[entry.status])}>
                    {entry.status}
                  </span>
                  {(entry.status === 'due' || entry.status === 'overdue') && (
                    <Button
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={!canManage}
                      onClick={() => invite(entry)}
                    >
                      <MailPlus className="h-3 w-3" /> Invite
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Recalls follow national programme intervals; overdue invitations are escalated to the screening coordinator.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
