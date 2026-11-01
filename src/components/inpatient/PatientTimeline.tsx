import { format, differenceInDays } from 'date-fns';
import { X, Printer, UserPlus, ArrowRightLeft, Activity, Pill, FileText, Stethoscope, AlertTriangle, BedDouble } from 'lucide-react';
import { openDischargeSummary } from '@/lib/dischargeSummaryReport';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Bed } from '@/data/inpatientMockData';

interface PatientTimelineProps {
  bed: Bed;
  onClose: () => void;
}

export interface TimelineEvent {
  id: string;
  type: 'admission' | 'transfer' | 'vitals' | 'medication' | 'note' | 'procedure' | 'alert';
  title: string;
  description?: string;
  timestamp: Date;
  actor?: string;
}

const typeConfig: Record<TimelineEvent['type'], { icon: React.ElementType; color: string; bg: string }> = {
  admission: { icon: UserPlus, color: 'text-success', bg: 'bg-success/10 border-success/30' },
  transfer: { icon: ArrowRightLeft, color: 'text-info', bg: 'bg-info/10 border-info/30' },
  vitals: { icon: Activity, color: 'text-primary', bg: 'bg-primary/10 border-primary/30' },
  medication: { icon: Pill, color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  note: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  procedure: { icon: Stethoscope, color: 'text-accent-foreground', bg: 'bg-accent/10 border-accent/30' },
  alert: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
};

export function generateMockTimeline(bed: Bed): TimelineEvent[] {
  if (!bed.admissionDate) return [];

  const admitDate = new Date(bed.admissionDate);
  const now = new Date();
  const daysSince = differenceInDays(now, admitDate);
  const events: TimelineEvent[] = [];

  // Admission event
  events.push({
    id: 'evt-admission',
    type: 'admission',
    title: `Admitted to ${bed.wardName}`,
    description: `Bed ${bed.bedNumber} • ${bed.physician || 'Attending physician'}`,
    timestamp: admitDate,
    actor: bed.physician,
  });

  // Initial vitals
  const initVitals = new Date(admitDate);
  initVitals.setMinutes(initVitals.getMinutes() + 30);
  events.push({
    id: 'evt-vitals-init',
    type: 'vitals',
    title: 'Initial vitals recorded',
    description: 'BP 138/85, HR 92, Temp 37.2°C, SpO₂ 96%',
    timestamp: initVitals,
    actor: 'Nurse Adaeze',
  });

  // Medication started
  const medStart = new Date(admitDate);
  medStart.setHours(medStart.getHours() + 2);
  events.push({
    id: 'evt-med-1',
    type: 'medication',
    title: 'Medication started',
    description: 'IV Normal Saline 1L, Paracetamol 1g PO',
    timestamp: medStart,
    actor: bed.physician,
  });

  // Daily events for each day since admission
  for (let d = 1; d <= Math.min(daysSince, 5); d++) {
    const dayDate = new Date(admitDate);
    dayDate.setDate(dayDate.getDate() + d);

    // Morning vitals
    const morningVitals = new Date(dayDate);
    morningVitals.setHours(7, 0);
    events.push({
      id: `evt-vitals-d${d}-am`,
      type: 'vitals',
      title: 'Vitals check',
      description: `BP ${130 + d * 2}/${80 + d}, HR ${88 - d}, Temp 36.${8 + (d % 3)}°C`,
      timestamp: morningVitals,
      actor: 'Nurse Blessing',
    });

    // Clinical note on even days
    if (d % 2 === 0) {
      const noteTime = new Date(dayDate);
      noteTime.setHours(10, 30);
      events.push({
        id: `evt-note-d${d}`,
        type: 'note',
        title: 'Clinical note added',
        description: 'Patient progressing well. Continue current management plan.',
        timestamp: noteTime,
        actor: bed.physician,
      });
    }

    // Procedure on day 2
    if (d === 2) {
      const procTime = new Date(dayDate);
      procTime.setHours(14, 0);
      events.push({
        id: 'evt-proc-1',
        type: 'procedure',
        title: 'Diagnostic procedure',
        description: 'Chest X-ray completed — no acute findings',
        timestamp: procTime,
        actor: 'Dr. Ngozi Eze',
      });
    }

    // Transfer on day 3 for critical patients
    if (d === 3 && bed.acuity === 'critical') {
      const xferTime = new Date(dayDate);
      xferTime.setHours(11, 0);
      events.push({
        id: 'evt-transfer-1',
        type: 'transfer',
        title: 'Transferred from ICU',
        description: `Step-down to ${bed.wardName} — patient stabilized`,
        timestamp: xferTime,
        actor: bed.physician,
      });
    }

    // Alert on day 4 for high/critical acuity
    if (d === 4 && (bed.acuity === 'high' || bed.acuity === 'critical')) {
      const alertTime = new Date(dayDate);
      alertTime.setHours(3, 15);
      events.push({
        id: 'evt-alert-1',
        type: 'alert',
        title: 'Abnormal vitals alert',
        description: 'Heart rate elevated to 118 bpm — physician notified',
        timestamp: alertTime,
        actor: 'System',
      });
    }
  }

  // Sort descending
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return events;
}

export function PatientTimeline({ bed, onClose }: PatientTimelineProps) {
  const events = generateMockTimeline(bed);
  const daysAdmitted = bed.admissionDate
    ? differenceInDays(new Date(), new Date(bed.admissionDate))
    : 0;

  return (
    <div className="border rounded-xl bg-card shadow-lg overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BedDouble className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{bed.patientName || 'Unknown Patient'}</h3>
              <p className="text-xs text-muted-foreground">
                {bed.bedNumber} • {bed.wardName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDischargeSummary(bed)} title="Print Summary">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {bed.acuity && (
            <Badge variant="outline" className={cn(
              "text-[10px]",
              bed.acuity === 'critical' && 'bg-destructive/10 text-destructive border-destructive/30',
              bed.acuity === 'high' && 'bg-warning/10 text-warning border-warning/30',
              bed.acuity === 'medium' && 'bg-info/10 text-info border-info/30',
              bed.acuity === 'low' && 'bg-success/10 text-success border-success/30',
            )}>
              {bed.acuity} acuity
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            Day {daysAdmitted} of stay
          </Badge>
          {bed.physician && (
            <Badge variant="outline" className="text-[10px]">
              {bed.physician}
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[420px]">
        <div className="p-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No events recorded</p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-4">
                {events.map((evt, i) => {
                  const cfg = typeConfig[evt.type];
                  const Icon = cfg.icon;
                  const showDate = i === 0 || format(evt.timestamp, 'yyyy-MM-dd') !== format(events[i - 1].timestamp, 'yyyy-MM-dd');

                  return (
                    <div key={evt.id}>
                      {showDate && (
                        <div className="flex items-center gap-2 mb-3 ml-9">
                          <Separator className="flex-1" />
                          <span className="text-[10px] font-medium text-muted-foreground px-2">
                            {format(evt.timestamp, 'EEE, MMM d')}
                          </span>
                          <Separator className="flex-1" />
                        </div>
                      )}
                      <div className="flex gap-3 relative">
                        <div className={cn(
                          "h-[30px] w-[30px] rounded-full border flex items-center justify-center flex-shrink-0 z-10 bg-card",
                          cfg.bg
                        )}>
                          <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-sm font-medium leading-tight">{evt.title}</p>
                          {evt.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{evt.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {format(evt.timestamp, 'h:mm a')}
                            </span>
                            {evt.actor && (
                              <>
                                <span className="text-[10px] text-muted-foreground">•</span>
                                <span className="text-[10px] text-muted-foreground">{evt.actor}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
