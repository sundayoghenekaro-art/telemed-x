import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  BookLock,
  Download,
  FileLock2,
  FlaskConical,
  Gavel,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DataSubjectRequest,
  mockDataSubjectRequests,
  mockDpiaEntries,
  mockRopaEntries,
  mockSecondaryUsePermits,
} from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const DSR_STATUS_STYLE: Record<DataSubjectRequest['status'], string> = {
  received: 'bg-info/10 text-info border-info/30',
  'in-progress': 'bg-warning/10 text-warning border-warning/30',
  completed: 'bg-success/10 text-success border-success/30',
  overdue: 'bg-destructive/10 text-destructive border-destructive/30',
};

const RISK_STYLE: Record<string, string> = {
  High: 'bg-destructive/10 text-destructive border-destructive/30',
  Medium: 'bg-warning/10 text-warning border-warning/30',
  Low: 'bg-success/10 text-success border-success/30',
};

const PERMIT_STYLE: Record<string, string> = {
  approved: 'bg-success/10 text-success border-success/30',
  pending: 'bg-warning/10 text-warning border-warning/30',
  declined: 'bg-destructive/10 text-destructive border-destructive/30',
};

const DSR_LABEL: Record<DataSubjectRequest['type'], string> = {
  access: 'Access',
  portability: 'Portability',
  erasure: 'Erasure',
  rectification: 'Rectification',
  restriction: 'Restriction',
};

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function GovernanceRegistersPanel({ canManage = false }: { canManage?: boolean }) {
  const [requests, setRequests] = useState<DataSubjectRequest[]>(mockDataSubjectRequests);
  const [permits, setPermits] = useState(mockSecondaryUsePermits);

  const openRequests = useMemo(
    () => requests.filter((entry) => entry.status !== 'completed').length,
    [requests],
  );
  const overdue = requests.filter((entry) => entry.status === 'overdue').length;

  const advance = (entry: DataSubjectRequest) => {
    const next: Record<DataSubjectRequest['status'], DataSubjectRequest['status']> = {
      received: 'in-progress',
      'in-progress': 'completed',
      overdue: 'completed',
      completed: 'completed',
    };
    const status = next[entry.status];
    setRequests((prev) => prev.map((item) => (item.id === entry.id ? { ...item, status } : item)));
    toast.success(status === 'completed' ? 'Request completed' : 'Request started', {
      description: `${entry.id} · ${DSR_LABEL[entry.type]} for ${entry.patientName}. Statutory deadline ${format(new Date(entry.dueAt), 'dd MMM yyyy')}.`,
    });
  };

  const decidePermit = (id: string, status: 'approved' | 'declined') => {
    setPermits((prev) => prev.map((entry) => (entry.id === id ? { ...entry, status } : entry)));
    toast.success(`Secondary-use permit ${status}`, {
      description: `${id} · the health data access body has recorded the decision.`,
    });
  };

  const exportRegister = () => {
    downloadJson('gdpr-ehds-registers.json', {
      generatedAt: new Date().toISOString(),
      dataSubjectRequests: requests,
      ropa: mockRopaEntries,
      dpia: mockDpiaEntries,
      secondaryUsePermits: permits,
    });
    toast.success('Governance registers exported', { description: 'DSR, RoPA, DPIA and secondary-use permits' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BookLock className="h-5 w-5 text-primary" />
            GDPR &amp; EHDS registers
          </h2>
          <p className="text-sm text-muted-foreground">
            Data-subject requests, processing records, impact assessments and secondary-use permits
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportRegister}>
          <Download className="h-4 w-4" /> Export registers
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{openRequests}</p>
            <p className="text-xs text-muted-foreground">Open data-subject requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className={cn('text-xl font-bold leading-tight', overdue > 0 ? 'text-destructive' : 'text-success')}>{overdue}</p>
            <p className="text-xs text-muted-foreground">Past the one-month deadline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{mockRopaEntries.length}</p>
            <p className="text-xs text-muted-foreground">Processing activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{permits.filter((entry) => entry.status === 'approved').length}</p>
            <p className="text-xs text-muted-foreground">Active secondary-use permits</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dsr">
        <TabsList>
          <TabsTrigger value="dsr" className="gap-2">
            <UserCheck className="h-4 w-4" /> Data-subject requests
            {openRequests > 0 && (
              <span className="ml-1 rounded-full bg-warning px-1.5 py-0.5 text-xs text-warning-foreground">{openRequests}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ropa" className="gap-2">
            <FileLock2 className="h-4 w-4" /> RoPA
          </TabsTrigger>
          <TabsTrigger value="dpia" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> DPIA
          </TabsTrigger>
          <TabsTrigger value="ehds" className="gap-2">
            <FlaskConical className="h-4 w-4" /> Secondary use
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dsr" className="mt-4 space-y-2">
          {requests.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {DSR_LABEL[entry.type]}
                    <span className="ml-1.5 font-normal text-muted-foreground">· {entry.patientName}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.id} · received {format(new Date(entry.receivedAt), 'dd MMM yyyy')} · due{' '}
                    <span className={cn(entry.status === 'overdue' && 'font-semibold text-destructive')}>
                      {format(new Date(entry.dueAt), 'dd MMM yyyy')}
                    </span>{' '}
                    · {entry.assignee}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', DSR_STATUS_STYLE[entry.status])}>
                    {entry.status.replace('-', ' ')}
                  </span>
                  {entry.status !== 'completed' && (
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={!canManage}
                      onClick={() => advance(entry)}
                    >
                      {entry.status === 'received' ? 'Start' : 'Complete'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Requests must be answered within one month; extensions to three months require documented justification.
          </p>
        </TabsContent>

        <TabsContent value="ropa" className="mt-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              {mockRopaEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{entry.purpose}</p>
                    <Badge variant="outline" className="font-mono text-[10px]">{entry.id}</Badge>
                  </div>
                  <dl className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                    <div><dt className="font-medium text-foreground">Lawful basis</dt><dd>{entry.lawfulBasis}</dd></div>
                    <div><dt className="font-medium text-foreground">Data categories</dt><dd>{entry.data}</dd></div>
                    <div><dt className="font-medium text-foreground">Retention</dt><dd>{entry.retention}</dd></div>
                    <div><dt className="font-medium text-foreground">Recipients</dt><dd>{entry.recipients}</dd></div>
                  </dl>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dpia" className="mt-4 space-y-2">
          {mockDpiaEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{entry.processing}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.id} · last reviewed {format(new Date(entry.reviewed), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', RISK_STYLE[entry.risk])}>
                    {entry.risk} risk
                  </span>
                  <Badge variant={entry.status === 'approved' ? 'secondary' : 'outline'} className="text-[10px] capitalize">
                    {entry.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ehds" className="mt-4 space-y-2">
          {permits.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {entry.applicant}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {entry.id}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">{entry.purpose}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Dataset: {entry.dataset} · valid until {entry.validUntil}
                    </p>
                  </div>
                  <span className={cn('w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', PERMIT_STYLE[entry.status])}>
                    {entry.status}
                  </span>
                </div>
                {entry.status === 'pending' && (
                  <div className="flex gap-1.5 border-t border-border pt-2">
                    <Button
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={!canManage}
                      onClick={() => decidePermit(entry.id, 'approved')}
                    >
                      <Gavel className="h-3 w-3" /> Approve permit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      disabled={!canManage}
                      onClick={() => decidePermit(entry.id, 'declined')}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Secondary use under the European Health Data Space requires a permit from the national health data access body.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
