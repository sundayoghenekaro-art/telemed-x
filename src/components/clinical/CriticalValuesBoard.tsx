import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { BellRing, CheckCheck, CircleAlert, Megaphone, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CriticalValue, CriticalValueStatus, mockCriticalValues } from '@/data/capabilityMockData';
import { cn } from '@/lib/utils';

interface CriticalValuesBoardProps {
  mode: 'notify' | 'acknowledge';
  canAct?: boolean;
  clinicianName?: string;
}

const STATUS_STYLE: Record<CriticalValueStatus, string> = {
  'not-notified': 'bg-destructive/10 text-destructive border-destructive/30',
  notified: 'bg-warning/10 text-warning border-warning/30',
  acknowledged: 'bg-success/10 text-success border-success/30',
};

const STATUS_LABEL: Record<CriticalValueStatus, string> = {
  'not-notified': 'Not notified',
  notified: 'Notified — awaiting acknowledgement',
  acknowledged: 'Acknowledged',
};

const CLINICIANS = [
  'Dr. Fatima Yusuf',
  'Dr. Sarah Chen',
  'Dr. Ada Obi',
  'Dr. Ngozi Eze',
  'Dr. Michael Adebayo',
];

export function CriticalValuesBoard({
  mode,
  canAct = false,
  clinicianName = 'Clinician',
}: CriticalValuesBoardProps) {
  const [values, setValues] = useState<CriticalValue[]>(mockCriticalValues);
  const [notifyId, setNotifyId] = useState<string | null>(null);
  const [notifyTarget, setNotifyTarget] = useState(CLINICIANS[0]);

  const active = values.find((value) => value.id === notifyId);

  const ordered = [...values].sort((a, b) => {
    const weight: Record<CriticalValueStatus, number> = {
      'not-notified': 0,
      notified: 1,
      acknowledged: 2,
    };
    return weight[a.status] - weight[b.status];
  });

  const pendingNotification = values.filter((value) => value.status === 'not-notified').length;
  const awaitingAck = values.filter((value) => value.status === 'notified').length;
  const acknowledged = values.filter((value) => value.status === 'acknowledged').length;

  const notify = () => {
    if (!active) return;
    setValues((prev) =>
      prev.map((value) =>
        value.id === active.id
          ? {
              ...value,
              status: 'notified',
              notifiedTo: notifyTarget,
              notifiedAt: new Date().toISOString(),
            }
          : value,
      ),
    );
    setNotifyId(null);
    toast.success('Critical result escalated', {
      description: `${active.test} · ${active.patientName} → ${notifyTarget} (SMS + in-app)`,
    });
  };

  const acknowledge = (value: CriticalValue) => {
    setValues((prev) =>
      prev.map((entry) =>
        entry.id === value.id
          ? {
              ...entry,
              status: 'acknowledged',
              acknowledgedBy: clinicianName,
              acknowledgedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
    toast.success('Critical value acknowledged', {
      description: `${value.test} · ${value.patientName} acknowledged by ${clinicianName}`,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Siren className="h-5 w-5 text-destructive" />
          Critical value loop
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === 'notify'
            ? 'Escalate abnormal results to the responsible clinician and track acknowledgement'
            : 'Acknowledge critical results escalated to you — closes the loop with the reporting lab'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Awaiting notification', value: pendingNotification, tone: 'text-destructive' },
          { label: 'Awaiting acknowledgement', value: awaitingAck, tone: 'text-warning' },
          { label: 'Acknowledged', value: acknowledged, tone: 'text-success' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className={cn('text-xl font-bold leading-tight', stat.tone)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Critical results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ordered.map((value) => (
            <div key={value.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <CircleAlert className="h-4 w-4 shrink-0 text-destructive" />
                    {value.patientName}
                    <span className="font-normal text-muted-foreground">· {value.test}</span>
                  </p>
                  <p className="mt-0.5 text-sm">
                    <span className="font-bold text-destructive">{value.value}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      (reference {value.referenceRange})
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground capitalize">
                    {value.source === 'lab' ? 'Laboratory' : 'Imaging'} · {value.patientUpid}
                    {value.notifiedTo && value.notifiedAt
                      ? ` · escalated to ${value.notifiedTo} at ${format(new Date(value.notifiedAt), 'dd MMM HH:mm')}`
                      : ''}
                    {value.acknowledgedBy && value.acknowledgedAt
                      ? ` · acknowledged by ${value.acknowledgedBy} at ${format(new Date(value.acknowledgedAt), 'HH:mm')}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', STATUS_STYLE[value.status])}>
                    {STATUS_LABEL[value.status]}
                  </span>
                  {canAct && mode === 'notify' && value.status === 'not-notified' && (
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => setNotifyId(value.id)}>
                      <Megaphone className="mr-1 h-3 w-3" /> Escalate
                    </Button>
                  )}
                  {canAct && mode === 'acknowledge' && value.status === 'notified' && (
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => acknowledge(value)}>
                      <CheckCheck className="mr-1 h-3 w-3" /> Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setNotifyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-destructive" /> Escalate critical result
            </DialogTitle>
            <DialogDescription>
              {active?.patientName} · {active?.test} · {active?.value}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="notify-target">Notify clinician</label>
            <Select value={notifyTarget} onValueChange={setNotifyTarget}>
              <SelectTrigger id="notify-target"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLINICIANS.map((clinician) => (
                  <SelectItem key={clinician} value={clinician}>{clinician}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Escalation sends an SMS and in-app alert. The result stays open until the clinician acknowledges it.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyId(null)}>Cancel</Button>
            <Button onClick={notify}>Send escalation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
