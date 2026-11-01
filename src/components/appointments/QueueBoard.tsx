import { useMemo, useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';
import {
  BellRing,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  Hourglass,
  PhoneCall,
  Plus,
  UserX,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { QueuePriority, QueueStatus, QueueTicket, mockQueueTickets } from '@/data/capabilityMockData';
import { departmentMatches } from '@/lib/access';
import { cn } from '@/lib/utils';

interface QueueBoardProps {
  departmentScope?: string | null;
  canManage?: boolean;
}

const PRIORITY_STYLE: Record<QueuePriority, string> = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/30',
  assisted: 'bg-info/10 text-info border-info/30',
  routine: 'bg-muted text-muted-foreground border-border',
};

const STATUS_STYLE: Record<QueueStatus, string> = {
  waiting: 'bg-warning/10 text-warning',
  called: 'bg-info/10 text-info',
  serving: 'bg-primary/10 text-primary',
  done: 'bg-success/10 text-success',
  'no-show': 'bg-muted text-muted-foreground',
};

const COLUMNS: { status: QueueStatus; title: string; icon: typeof Hourglass }[] = [
  { status: 'waiting', title: 'Waiting', icon: Hourglass },
  { status: 'called', title: 'Called', icon: PhoneCall },
  { status: 'serving', title: 'In room', icon: DoorOpen },
  { status: 'done', title: 'Completed', icon: CheckCircle2 },
  { status: 'no-show', title: 'No-show', icon: UserX },
];

function waitMinutes(ticket: QueueTicket): number | null {
  if (ticket.status === 'done' || ticket.status === 'no-show') return null;
  return Math.max(0, differenceInMinutes(new Date(), new Date(ticket.checkedInAt)));
}

function nextTicketNumber(department: string, existing: QueueTicket[]): string {
  const prefix = department.charAt(0).toUpperCase();
  const highest = existing
    .filter((ticket) => ticket.department === department)
    .map((ticket) => Number(ticket.ticketNumber.split('-')[1]) || 0)
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}-${String(highest + 1).padStart(2, '0')}`;
}

export function QueueBoard({ departmentScope = null, canManage = false }: QueueBoardProps) {
  const [tickets, setTickets] = useState<QueueTicket[]>(mockQueueTickets);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInDepartment, setWalkInDepartment] = useState('Internal Medicine');
  const [walkInPriority, setWalkInPriority] = useState<QueuePriority>('routine');

  const scopedTickets = useMemo(
    () =>
      departmentScope
        ? tickets.filter((ticket) => departmentMatches(departmentScope, ticket.department))
        : tickets,
    [tickets, departmentScope],
  );

  const departments = useMemo(() => {
    const unique = [...new Set(tickets.map((ticket) => ticket.department))];
    return unique.sort();
  }, [tickets]);

  const activeTickets = scopedTickets.filter((t) => t.status === 'waiting' || t.status === 'called' || t.status === 'serving');
  const waitingCount = scopedTickets.filter((t) => t.status === 'waiting').length;
  const calledCount = scopedTickets.filter((t) => t.status === 'called').length;
  const servingCount = scopedTickets.filter((t) => t.status === 'serving').length;
  const noShowCount = scopedTickets.filter((t) => t.status === 'no-show').length;
  const averageWait = activeTickets.length
    ? Math.round(
        activeTickets.reduce((sum, ticket) => sum + (waitMinutes(ticket) ?? 0), 0) / activeTickets.length,
      )
    : 0;

  const patchTicket = (id: string, patch: Partial<QueueTicket>) => {
    setTickets((prev) => prev.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket)));
  };

  const advance = (ticket: QueueTicket, status: QueueStatus) => {
    const now = new Date().toISOString();
    if (status === 'called') patchTicket(ticket.id, { status, calledAt: now });
    if (status === 'serving') patchTicket(ticket.id, { status });
    if (status === 'done') patchTicket(ticket.id, { status, completedAt: now });
    if (status === 'no-show') patchTicket(ticket.id, { status });
  };

  const sendReminder = (ticket: QueueTicket) => {
    patchTicket(ticket.id, { reminderSentAt: new Date().toISOString() });
    toast.success(`Reminder sent to ${ticket.patientName}`, {
      description: 'SMS and in-app push queued. Patient is 3 positions away.',
    });
  };

  const handleCheckIn = () => {
    const name = walkInName.trim();
    if (!name) {
      toast.error('Patient name is required');
      return;
    }
    const ticket: QueueTicket = {
      id: `Q-${Date.now()}`,
      patientUpid: 'WALK-IN',
      patientName: name,
      department: walkInDepartment,
      physician: 'Next available',
      room: 'Triage',
      ticketNumber: nextTicketNumber(walkInDepartment, tickets),
      priority: walkInPriority,
      checkedInAt: new Date().toISOString(),
      status: 'waiting',
    };
    setTickets((prev) => [ticket, ...prev]);
    setCheckInOpen(false);
    setWalkInName('');
    setWalkInPriority('routine');
    toast.success(`${name} checked in`, { description: `Ticket ${ticket.ticketNumber} · ${walkInDepartment}` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Registration-to-consult queue
          </h2>
          <p className="text-sm text-muted-foreground">
            Live check-in, call-next and wait times
            {departmentScope ? ` · ${departmentScope}` : ' · all departments'}
          </p>
        </div>
        {canManage && (
          <Button className="gap-2" onClick={() => setCheckInOpen(true)}>
            <Plus className="h-4 w-4" />
            Check in patient
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Waiting', value: waitingCount, icon: Hourglass, tone: 'text-warning' },
          { label: 'Called', value: calledCount, icon: PhoneCall, tone: 'text-info' },
          { label: 'In room', value: servingCount, icon: DoorOpen, tone: 'text-primary' },
          { label: 'Average wait', value: `${averageWait} min`, icon: Users, tone: 'text-foreground' },
          { label: 'No-shows', value: noShowCount, icon: UserX, tone: 'text-muted-foreground' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-4">
              <stat.icon className={cn('h-5 w-5', stat.tone)} />
              <div>
                <p className="text-xl font-bold leading-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {COLUMNS.map((column) => {
          const columnTickets = scopedTickets
            .filter((ticket) => ticket.status === column.status)
            .sort((a, b) => {
              const priorityWeight: Record<QueuePriority, number> = { urgent: 0, assisted: 1, routine: 2 };
              if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
                return priorityWeight[a.priority] - priorityWeight[b.priority];
              }
              return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
            });

          return (
            <div key={column.status} className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <column.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{column.title}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{columnTickets.length}</Badge>
              </div>
              <div className="min-h-[120px] space-y-2 p-2">
                {columnTickets.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">No patients</p>
                )}
                {columnTickets.map((ticket) => {
                  const wait = waitMinutes(ticket);
                  return (
                    <div
                      key={ticket.id}
                      className={cn(
                        'rounded-lg border p-2.5',
                        ticket.status === 'serving' ? 'border-primary/40 bg-primary/5' : 'border-border',
                        ticket.status === 'no-show' && 'opacity-70',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            <span className="font-mono text-primary">{ticket.ticketNumber}</span>{' '}
                            {ticket.patientName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {ticket.department} · {ticket.room}
                          </p>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_STYLE[ticket.status])}>
                          {ticket.status === 'no-show' ? 'No-show' : ticket.status}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className={cn('rounded-full border px-1.5 py-0.5 font-medium', PRIORITY_STYLE[ticket.priority])}>
                          {ticket.priority}
                        </span>
                        <span>In at {format(new Date(ticket.checkedInAt), 'HH:mm')}</span>
                        {wait !== null && ticket.status !== 'serving' && (
                          <span className={cn(wait > 30 && 'font-semibold text-destructive')}>{wait} min wait</span>
                        )}
                        {ticket.reminderSentAt && (
                          <span className="inline-flex items-center gap-0.5 text-primary">
                            <BellRing className="h-3 w-3" /> reminded
                          </span>
                        )}
                      </div>
                      {ticket.note && <p className="mt-1 text-[11px] text-muted-foreground">{ticket.note}</p>}
                      {canManage && ticket.status !== 'done' && ticket.status !== 'no-show' && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ticket.status === 'waiting' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => advance(ticket, 'called')}>
                                <PhoneCall className="mr-1 h-3 w-3" /> Call
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => sendReminder(ticket)}>
                                <BellRing className="mr-1 h-3 w-3" /> Remind
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => advance(ticket, 'no-show')}>
                                <UserX className="mr-1 h-3 w-3" /> No-show
                              </Button>
                            </>
                          )}
                          {ticket.status === 'called' && (
                            <>
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => advance(ticket, 'serving')}>
                                <DoorOpen className="mr-1 h-3 w-3" /> Send in
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => advance(ticket, 'no-show')}>
                                <UserX className="mr-1 h-3 w-3" /> No-show
                              </Button>
                            </>
                          )}
                          {ticket.status === 'serving' && (
                            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => advance(ticket, 'done')}>
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check in patient</DialogTitle>
            <DialogDescription>
              Walk-in or unbooked arrival. A queue ticket and wait-time clock start immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="walkin-name">Patient name</label>
              <Input
                id="walkin-name"
                value={walkInName}
                onChange={(event) => setWalkInName(event.target.value)}
                placeholder="e.g. Ada Nwankwo"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="walkin-department">Department</label>
                <Select value={walkInDepartment} onValueChange={setWalkInDepartment}>
                  <SelectTrigger id="walkin-department"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department} value={department}>{department}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="walkin-priority">Priority</label>
                <Select value={walkInPriority} onValueChange={(value) => setWalkInPriority(value as QueuePriority)}>
                  <SelectTrigger id="walkin-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="assisted">Assisted (elderly / mobility)</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckIn}>Check in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
