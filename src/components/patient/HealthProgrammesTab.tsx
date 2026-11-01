import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Baby,
  CalendarClock,
  CalendarPlus,
  HeartPulse,
  ShieldCheck,
  Syringe,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ConditionStatus,
  ImmunisationStatus,
  mockCheckupPackages,
  mockChronicConditions,
  mockDependants,
  mockImmunisations,
} from '@/data/programmeOpsMockData';
import { cn } from '@/lib/utils';
import { mockScreeningRecalls } from '@/data/europeMockData';

interface HealthProgrammesTabProps {
  patientUserId: string;
  patientName: string;
}

const IMMUNISATION_STYLE: Record<ImmunisationStatus, string> = {
  completed: 'bg-success/10 text-success border-success/30',
  due: 'bg-info/10 text-info border-info/30',
  overdue: 'bg-destructive/10 text-destructive border-destructive/30',
};

const CONDITION_STYLE: Record<ConditionStatus, string> = {
  'on-track': 'bg-success/10 text-success border-success/30',
  'review-due': 'bg-warning/10 text-warning border-warning/30',
  'out-of-range': 'bg-destructive/10 text-destructive border-destructive/30',
};

const CONDITION_LABEL: Record<ConditionStatus, string> = {
  'on-track': 'On track',
  'review-due': 'Review due',
  'out-of-range': 'Out of range',
};

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export function HealthProgrammesTab({ patientUserId, patientName }: HealthProgrammesTabProps) {
  const [accountId, setAccountId] = useState('self');
  const [bookedPackage, setBookedPackage] = useState<string | null>(null);

  const dependant = mockDependants.find((entry) => entry.id === accountId);
  const viewingName = dependant?.name ?? patientName;
  const packages = dependant
    ? mockCheckupPackages.filter((pkg) =>
        dependant.relationship.toLowerCase().includes('son') ||
        dependant.relationship.toLowerCase().includes('daughter')
          ? pkg.id === 'PKG-04'
          : pkg.id !== 'PKG-04',
      )
    : mockCheckupPackages;

  const overdue = mockImmunisations.filter((record) => record.status === 'overdue').length;
  const reviewDue = mockChronicConditions.filter((condition) => condition.status !== 'on-track').length;
  const screeningRecalls = mockScreeningRecalls.filter((entry) => entry.patientName === viewingName);

  const requestReview = (detail: string) => {
    toast.success('Review request sent', {
      description: `${detail} · the care team will confirm an appointment within one working day.`,
    });
  };

  const bookImmunisation = (detail: string) => {
    toast.success('Immunisation booked', {
      description: `${detail} · the clinic will confirm the vaccination slot.`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Health Programmes</h2>
          <p className="text-sm text-muted-foreground">
            Chronic care, immunisation schedule and check-up packages
          </p>
        </div>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="self">{patientName} (you)</SelectItem>
            {mockDependants.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.name} · {entry.relationship}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {dependant && (
        <Card className="border-info/40 bg-info/5">
          <CardContent className="flex items-start gap-3 pt-4">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <div>
              <p className="text-sm font-semibold">
                Viewing {dependant.name}&apos;s records as guardian
              </p>
              <p className="text-xs text-muted-foreground">
                Born {format(new Date(dependant.dateOfBirth), 'dd MMM yyyy')} · {dependant.programmeNote}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="h-4 w-4 text-primary" /> Immunisation schedule
            {overdue > 0 && (
              <Badge variant="destructive" className="text-[10px]">{overdue} overdue</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {mockImmunisations.map((record) => (
            <div key={record.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {record.vaccine}
                  <span className="ml-1.5 font-normal text-muted-foreground">· dose {record.doseNumber}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {record.status === 'completed'
                    ? `Given ${record.administeredAt ? format(new Date(record.administeredAt), 'dd MMM yyyy') : ''}${record.site ? ` · ${record.site}` : ''}`
                    : `Due ${format(new Date(record.dueDate), 'dd MMM yyyy')}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', IMMUNISATION_STYLE[record.status])}>
                  {record.status}
                </span>
                {record.status !== 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => bookImmunisation(`${record.vaccine} dose ${record.doseNumber} for ${viewingName}`)}
                  >
                    <CalendarPlus className="mr-1 h-3 w-3" /> Book
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {!dependant && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4 text-primary" /> Chronic conditions
              {reviewDue > 0 && (
                <Badge variant="outline" className="text-[10px]">{reviewDue} need attention</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {mockChronicConditions.map((condition) => (
              <div key={condition.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{condition.name}</p>
                  <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', CONDITION_STYLE[condition.status])}>
                    {CONDITION_LABEL[condition.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Target: {condition.target}</p>
                <p className="text-sm font-medium">{condition.latestReading}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Last review {format(new Date(condition.lastReview), 'dd MMM yyyy')} · next{' '}
                  <span className={condition.status === 'review-due' ? 'font-semibold text-destructive' : ''}>
                    {format(new Date(condition.nextReview), 'dd MMM yyyy')}
                  </span>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 px-2 text-xs"
                  onClick={() => requestReview(`${condition.name} review for ${patientName}`)}
                >
                  <CalendarClock className="mr-1 h-3 w-3" /> Request review
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {dependant ? <Baby className="h-4 w-4 text-primary" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
            Health check-up packages
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{pkg.name}</p>
                  <p className="text-[11px] text-muted-foreground">{pkg.description}</p>
                </div>
                <p className="shrink-0 text-sm font-bold">{naira.format(pkg.price)}</p>
              </div>
              <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {pkg.includes.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setBookedPackage(pkg.id);
                    toast.success(`${pkg.name} requested`, {
                      description: `${viewingName} · ${pkg.durationMinutes} minutes · ${naira.format(pkg.price)}. The clinic will call to confirm.`,
                    });
                  }}
                >
                  <CalendarPlus className="mr-1 h-3 w-3" /> Book check-up
                </Button>
                <span className="text-[11px] text-muted-foreground">{pkg.durationMinutes} min</span>
                {bookedPackage === pkg.id && <Badge variant="secondary" className="text-[10px]">requested</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Population screening recalls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {screeningRecalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No screening recall is currently due for {viewingName}. Invitations follow the national programme interval.
            </p>
          ) : (
            screeningRecalls.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {entry.programme} screening
                    <span className="ml-1.5 font-normal text-muted-foreground">· due {format(new Date(entry.dueDate), 'dd MMM yyyy')}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Last result: {entry.lastResult}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                      entry.status === 'overdue'
                        ? 'bg-destructive/10 text-destructive border-destructive/30'
                        : entry.status === 'attended'
                          ? 'bg-success/10 text-success border-success/30'
                          : 'bg-info/10 text-info border-info/30',
                    )}
                  >
                    {entry.status}
                  </span>
                  {(entry.status === 'due' || entry.status === 'overdue') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        toast.success('Screening booking requested', {
                          description: `${entry.programme} screening for ${viewingName} · the screening unit will confirm the appointment.`,
                        })
                      }
                    >
                      <CalendarPlus className="mr-1 h-3 w-3" /> Book
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Records shown for {viewingName} ({patientUserId.slice(0, 8)}…). Programme data is shared with your care team under your consent preferences.
      </p>
    </div>
  );
}
