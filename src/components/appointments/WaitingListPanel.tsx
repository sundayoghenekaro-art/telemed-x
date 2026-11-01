import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  ListOrdered,
  UserX,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WaitingEntry, mockWaitingList } from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const DEMO_NOW = new Date('2026-11-01T09:00:00');

const PRIORITY_STYLE: Record<WaitingEntry['priority'], string> = {
  routine: 'bg-muted text-muted-foreground border-border',
  urgent: 'bg-warning/10 text-warning border-warning/30',
  'two-week': 'bg-destructive/10 text-destructive border-destructive/30',
};

const STATUS_STYLE: Record<WaitingEntry['status'], string> = {
  waiting: 'bg-muted text-muted-foreground border-border',
  offered: 'bg-info/10 text-info border-info/30',
  booked: 'bg-success/10 text-success border-success/30',
  removed: 'bg-destructive/10 text-destructive border-destructive/30',
};

const DNA_STYLE: Record<WaitingEntry['dnaRisk'], string> = {
  low: 'text-muted-foreground',
  medium: 'text-warning',
  high: 'text-destructive',
};

function weeksWaiting(referralDate: string) {
  return Math.max(0, Math.floor((DEMO_NOW.getTime() - new Date(referralDate).getTime()) / (7 * 24 * 3600 * 1000)));
}

export function WaitingListPanel({ canManage = false }: { canManage?: boolean }) {
  const [entries, setEntries] = useState<WaitingEntry[]>(mockWaitingList);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const stats = useMemo(() => {
    const active = entries.filter((entry) => entry.status !== 'removed');
    const breaches = active.filter((entry) => weeksWaiting(entry.referralDate) > entry.targetWeeks);
    return {
      waiting: entries.filter((entry) => entry.status === 'waiting').length,
      offered: entries.filter((entry) => entry.status === 'offered').length,
      breaches: breaches.length,
      twoWeek: active.filter((entry) => entry.priority === 'two-week').length,
    };
  }, [entries]);

  const visible = entries.filter((entry) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return entry.status !== 'removed';
    return entry.status === statusFilter;
  });

  const offer = (entry: WaitingEntry) => {
    const slot = format(addDays(DEMO_NOW, 3), "yyyy-MM-dd'T'HH:mm:ss");
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'offered', offeredSlot: slot } : item)),
    );
    toast.success('Appointment slot offered', {
      description: `${entry.patientName} · ${format(new Date(slot), 'dd MMM yyyy HH:mm')}. The patient can confirm by SMS.`,
    });
  };

  const book = (entry: WaitingEntry) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'booked' } : item)),
    );
    toast.success('Slot booked', {
      description: `${entry.patientName} · ${entry.service} · ${entry.offeredSlot ? format(new Date(entry.offeredSlot), 'dd MMM yyyy HH:mm') : 'confirmed slot'}`,
    });
  };

  const remove = (entry: WaitingEntry) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'removed', offeredSlot: undefined } : item)),
    );
    toast.success('Removed from the waiting list', { description: `${entry.patientName} · ${entry.service}` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ListOrdered className="h-5 w-5 text-primary" />
            Waiting list &amp; capacity booking
          </h2>
          <p className="text-sm text-muted-foreground">
            Referral-to-treatment targets, two-week cancer pathways and no-show risk
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="all">All entries</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="offered">Offered</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{stats.waiting}</p>
            <p className="text-xs text-muted-foreground">Waiting for a slot</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-info">{stats.offered}</p>
            <p className="text-xs text-muted-foreground">Slots offered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-destructive">{stats.breaches}</p>
            <p className="text-xs text-muted-foreground">Past target date</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{stats.twoWeek}</p>
            <p className="text-xs text-muted-foreground">Two-week pathways</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No entries in this view.</p>
        )}
        {visible.map((entry) => {
          const waited = weeksWaiting(entry.referralDate);
          const breach = entry.status !== 'removed' && waited > entry.targetWeeks;
          return (
            <Card key={entry.id} className={cn(breach && 'border-destructive/30')}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {entry.patientName}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {entry.service}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {entry.id} · {entry.specialty} · referred {format(new Date(entry.referralDate), 'dd MMM yyyy')} ·
                      waited {waited} w / target {entry.targetWeeks} w
                    </p>
                    <p className={cn('text-[11px]', DNA_STYLE[entry.dnaRisk])}>
                      <UserX className="mr-1 inline h-3 w-3" />
                      {entry.dnaRisk} no-show risk
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {breach && <Badge variant="destructive" className="text-[10px]">target breached</Badge>}
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', PRIORITY_STYLE[entry.priority])}>
                      {entry.priority}
                    </span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLE[entry.status])}>
                      {entry.status}
                    </span>
                  </div>
                </div>

                {entry.offeredSlot && (
                  <p className="text-[11px] text-muted-foreground">
                    <CalendarClock className="mr-1 inline h-3 w-3" />
                    Offered {format(new Date(entry.offeredSlot), 'dd MMM yyyy HH:mm')}
                  </p>
                )}

                {entry.status !== 'removed' && (
                  <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
                    {entry.status === 'waiting' && (
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={!canManage}
                        onClick={() => offer(entry)}
                      >
                        <CalendarPlus className="h-3 w-3" /> Offer next slot
                      </Button>
                    )}
                    {entry.status === 'offered' && (
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={!canManage}
                        onClick={() => book(entry)}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Book
                      </Button>
                    )}
                    {entry.status === 'booked' && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-success">
                        <CheckCircle2 className="h-3 w-3" /> confirmed appointment
                      </span>
                    )}
                    {(entry.status === 'waiting' || entry.status === 'offered') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                        disabled={!canManage}
                        onClick={() => remove(entry)}
                      >
                        Remove
                      </Button>
                    )}
                    {!canManage && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> queue management rights required
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
