import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Ambulance,
  ArrowRightFromLine,
  BedDouble,
  HeartPulse,
  PhoneCall,
  Siren,
  Stethoscope,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EdArrival, mockDispatchCalls, mockEdArrivals } from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const TRIAGE_LABEL: Record<EdArrival['triage'], string> = {
  1: 'Immediate',
  2: 'Very urgent',
  3: 'Urgent',
  4: 'Standard',
  5: 'Non-urgent',
};

const TRIAGE_STYLE: Record<EdArrival['triage'], string> = {
  1: 'bg-destructive text-destructive-foreground border-destructive',
  2: 'bg-warning text-warning-foreground border-warning',
  3: 'bg-info text-info-foreground border-info',
  4: 'bg-success text-success-foreground border-success',
  5: 'bg-muted text-muted-foreground border-border',
};

const STATUS_STYLE: Record<EdArrival['status'], string> = {
  waiting: 'bg-muted text-muted-foreground border-border',
  'in-treatment': 'bg-warning/10 text-warning border-warning/30',
  admitted: 'bg-info/10 text-info border-info/30',
  discharged: 'bg-success/10 text-success border-success/30',
};

const CALL_STYLE: Record<string, string> = {
  arrived: 'bg-success/10 text-success border-success/30',
  'en route': 'bg-warning/10 text-warning border-warning/30',
  dispatched: 'bg-info/10 text-info border-info/30',
};

export function EmergencyTriagePanel({
  canTreat = false,
  canAdmit = false,
}: {
  canTreat?: boolean;
  canAdmit?: boolean;
}) {
  const [arrivals, setArrivals] = useState<EdArrival[]>(mockEdArrivals);

  const stats = useMemo(() => {
    const active = arrivals.filter((entry) => entry.status !== 'discharged');
    return {
      waiting: arrivals.filter((entry) => entry.status === 'waiting').length,
      inTreatment: arrivals.filter((entry) => entry.status === 'in-treatment').length,
      admitted: arrivals.filter((entry) => entry.status === 'admitted').length,
      resus: active.filter((entry) => entry.triage === 1 && entry.status !== 'admitted').length,
    };
  }, [arrivals]);

  const startTreatment = (entry: EdArrival) => {
    const bay = `Majors ${arrivals.filter((item) => item.status === 'in-treatment').length + 1}`;
    setArrivals((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'in-treatment', bay } : item)),
    );
    toast.success('Treatment started', { description: `${entry.patientName} moved to ${bay}.` });
  };

  const admit = (entry: EdArrival) => {
    setArrivals((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'admitted' } : item)),
    );
    toast.success('Admission requested', {
      description: `${entry.patientName} · bed request sent to the ward.`,
    });
  };

  const discharge = (entry: EdArrival) => {
    setArrivals((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'discharged' } : item)),
    );
    toast.success('Discharged from emergency', { description: `${entry.patientName} · ED episode closed.` });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Siren className="h-5 w-5 text-primary" />
          Emergency department triage
        </h2>
        <p className="text-sm text-muted-foreground">
          Five-level triage, treatment bays, admission and the 112 dispatch log
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{stats.waiting}</p>
            <p className="text-xs text-muted-foreground">Waiting to be seen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-warning">{stats.inTreatment}</p>
            <p className="text-xs text-muted-foreground">In treatment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-info">{stats.admitted}</p>
            <p className="text-xs text-muted-foreground">Admitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className={cn('text-xl font-bold leading-tight', stats.resus > 0 ? 'text-destructive' : 'text-success')}>
              {stats.resus}
            </p>
            <p className="text-xs text-muted-foreground">Triage 1 active</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {arrivals.map((entry) => (
          <Card key={entry.id} className={cn(entry.triage <= 2 && entry.status === 'waiting' && 'border-destructive/30')}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                    {entry.patientName}
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', TRIAGE_STYLE[entry.triage])}>
                      T{entry.triage} · {TRIAGE_LABEL[entry.triage]}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.id} · {entry.complaint} · arrived {format(new Date(entry.arrivedAt), 'HH:mm')} ·{' '}
                    {entry.arrivalMode === '112' ? 'emergency call' : entry.arrivalMode}
                    {entry.bay && ` · ${entry.bay}`}
                  </p>
                </div>
                <span className={cn('w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLE[entry.status])}>
                  {entry.status.replace('-', ' ')}
                </span>
              </div>

              {(entry.status === 'waiting' || entry.status === 'in-treatment') && (
                <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
                  {entry.status === 'waiting' && (
                    <Button
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={!canTreat}
                      onClick={() => startTreatment(entry)}
                    >
                      <Stethoscope className="h-3 w-3" /> Start treatment
                    </Button>
                  )}
                  {entry.status === 'in-treatment' && (
                    <>
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={!canAdmit}
                        onClick={() => admit(entry)}
                      >
                        <BedDouble className="h-3 w-3" /> Admit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={!canTreat}
                        onClick={() => discharge(entry)}
                      >
                        <ArrowRightFromLine className="h-3 w-3" /> Discharge
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneCall className="h-4 w-4 text-primary" /> 112 dispatch log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Call</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 font-medium">Complaint</th>
                  <th className="py-2 pr-3 font-medium">Unit</th>
                  <th className="py-2 pr-3 font-medium">ETA</th>
                  <th className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockDispatchCalls.map((call) => (
                  <tr key={call.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{call.id}</td>
                    <td className="py-2 pr-3 text-xs">{call.location}</td>
                    <td className="py-2 pr-3 text-xs">{call.chiefComplaint}</td>
                    <td className="py-2 pr-3 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Ambulance className="h-3 w-3" /> {call.unit}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs">{call.etaMinutes === null ? '—' : `${call.etaMinutes} min`}</td>
                    <td className="py-2 text-right">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', CALL_STYLE[call.status])}>
                        {call.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
            <HeartPulse className="h-3 w-3" /> Dispatch events are linked to the patient record when the ambulance arrives.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
