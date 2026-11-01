import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import {
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  Inbox,
  Network,
  Send,
  Share2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NetworkReferral, ReferralStatus, mockNetworkReferrals } from '@/data/capabilityMockData';
import { cn } from '@/lib/utils';

interface ReferralNetworkPanelProps {
  canManage?: boolean;
  homeFacility?: string;
}

const HOME_FACILITY = 'Trika General Hospital';

const STATUS_STYLE: Record<ReferralStatus, string> = {
  sent: 'bg-warning/10 text-warning border-warning/30',
  accepted: 'bg-info/10 text-info border-info/30',
  scheduled: 'bg-primary/10 text-primary border-primary/30',
  completed: 'bg-success/10 text-success border-success/30',
  declined: 'bg-destructive/10 text-destructive border-destructive/30',
};

const URGENCY_STYLE: Record<NetworkReferral['urgency'], string> = {
  emergency: 'bg-destructive/10 text-destructive border-destructive/30',
  urgent: 'bg-warning/10 text-warning border-warning/30',
  routine: 'bg-muted text-muted-foreground border-border',
};

function isIncoming(referral: NetworkReferral, home: string) {
  return referral.toFacility === home;
}

export function ReferralNetworkPanel({
  canManage = false,
  homeFacility = HOME_FACILITY,
}: ReferralNetworkPanelProps) {
  const [referrals, setReferrals] = useState<NetworkReferral[]>(mockNetworkReferrals);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const home = homeFacility;
  const incoming = referrals.filter((referral) => referral.toFacility === home);
  const outgoing = referrals.filter((referral) => referral.fromFacility === home);
  const declineTarget = referrals.find((referral) => referral.id === declineId);

  const update = (id: string, patch: Partial<NetworkReferral>, message: string, detail: string) => {
    setReferrals((prev) => prev.map((referral) => (referral.id === id ? { ...referral, ...patch } : referral)));
    toast.success(message, { description: detail });
  };

  const accept = (referral: NetworkReferral) =>
    update(referral.id, { status: 'accepted' }, 'Referral accepted', `${referral.patientName} · ${referral.fromFacility}`);

  const schedule = (referral: NetworkReferral) => {
    const appointmentAt = addDays(new Date(), 2).toISOString();
    update(
      referral.id,
      { status: 'scheduled', appointmentAt },
      'Appointment scheduled',
      `${referral.patientName} · ${format(new Date(appointmentAt), 'dd MMM yyyy')}`,
    );
  };

  const complete = (referral: NetworkReferral) =>
    update(referral.id, { status: 'completed' }, 'Referral closed', `${referral.patientName} · care handed back`);

  const attachFhir = (referral: NetworkReferral) =>
    update(
      referral.id,
      { fhirAttached: true },
      'FHIR record bundle shared',
      `${referral.patientName} · encounter summary, results and medication list`,
    );

  const confirmDecline = () => {
    if (!declineTarget) return;
    update(
      declineTarget.id,
      { status: 'declined', declineReason: declineReason.trim() || 'Capacity unavailable' },
      'Referral declined',
      declineReason.trim() || 'Capacity unavailable',
    );
    setDeclineId(null);
    setDeclineReason('');
  };

  const renderReferral = (referral: NetworkReferral) => (
    <Card key={referral.id}>
      <CardContent className="space-y-2 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {referral.patientName}
              <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">{referral.referralNumber}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {referral.fromFacility} → {referral.toFacility}
            </p>
            <p className="mt-1 text-sm">{referral.reason}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Requested {format(new Date(referral.requestedAt), 'dd MMM yyyy HH:mm')}
              {referral.appointmentAt ? ` · booked ${format(new Date(referral.appointmentAt), 'dd MMM yyyy')}` : ''}
              {referral.declineReason ? ` · ${referral.declineReason}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', URGENCY_STYLE[referral.urgency])}>
              {referral.urgency}
            </span>
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLE[referral.status])}>
              {referral.status}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
          {referral.fhirAttached ? (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <FileCheck2 className="h-3 w-3" /> FHIR bundle attached
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={!canManage}
              onClick={() => attachFhir(referral)}
            >
              <Share2 className="mr-1 h-3 w-3" /> Share FHIR record
            </Button>
          )}

          {canManage && isIncoming(referral, home) && referral.status === 'sent' && (
            <>
              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => accept(referral)}>
                <CheckCircle2 className="mr-1 h-3 w-3" /> Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-destructive"
                onClick={() => {
                  setDeclineId(referral.id);
                  setDeclineReason('');
                }}
              >
                <XCircle className="mr-1 h-3 w-3" /> Decline
              </Button>
            </>
          )}

          {canManage && referral.status === 'accepted' && (
            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => schedule(referral)}>
              <CalendarClock className="mr-1 h-3 w-3" /> Schedule visit
            </Button>
          )}

          {canManage && referral.status === 'scheduled' && (
            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => complete(referral)}>
              <CheckCircle2 className="mr-1 h-3 w-3" /> Close referral
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Network className="h-5 w-5 text-primary" />
          Referral network
        </h2>
        <p className="text-sm text-muted-foreground">
          Accept, schedule and close referrals between {home} and network facilities, with FHIR record sharing
        </p>
      </div>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming" className="gap-2">
            <Inbox className="h-4 w-4" />
            Incoming
            {incoming.filter((r) => r.status === 'sent').length > 0 && (
              <span className="ml-1 rounded-full bg-warning px-1.5 py-0.5 text-xs text-warning-foreground">
                {incoming.filter((r) => r.status === 'sent').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-2">
            <Send className="h-4 w-4" />
            Outgoing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="incoming" className="mt-4 space-y-3">
          {incoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No incoming referrals.</p>
          ) : (
            incoming.map(renderReferral)
          )}
        </TabsContent>
        <TabsContent value="outgoing" className="mt-4 space-y-3">
          {outgoing.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No outgoing referrals.</p>
          ) : (
            outgoing.map(renderReferral)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(declineTarget)} onOpenChange={(open) => !open && setDeclineId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline referral</DialogTitle>
            <DialogDescription>
              {declineTarget?.patientName} · {declineTarget?.referralNumber}. The referring facility sees your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="decline-reason">Reason</label>
            <Input
              id="decline-reason"
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              placeholder="e.g. No capacity until next month"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDecline}>Decline referral</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
