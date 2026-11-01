import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bed,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  FlaskConical,
  Package,
  Pill,
  Radio,
  Stethoscope,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type {
  Appointment,
  BedOccupancy,
  DashboardStats,
  Notification,
  Patient,
  PatientStatus,
  PrescriptionStatus,
  UserRole,
} from '@/types/dhos';
import { canAccessRoute } from '@/lib/access';
import {
  BillingDashboardSummary,
  FrontDeskSummary,
  LaboratoryDashboardSummary,
  PharmacyDashboardSummary,
  RadiologyDashboardSummary,
} from '@/lib/moduleSummaries';
import { cn } from '@/lib/utils';

export interface ModuleData {
  role: UserRole;
  stats: DashboardStats;
  scope: { department: string | null; narrowed: boolean };
  bedOccupancy: BedOccupancy[];
  appointments: Appointment[];
  criticalPatients: Patient[];
  notifications: Notification[];
  pharmacy: PharmacyDashboardSummary;
  laboratory: LaboratoryDashboardSummary;
  radiology: RadiologyDashboardSummary;
  billing: BillingDashboardSummary;
  frontDesk: FrontDeskSummary;
}

export const MODULE_META: Record<UserRole, { title: string; subtitle: string }> = {
  admin: { title: 'Hospital operations', subtitle: 'Cross-module command view' },
  physician: { title: 'Clinical dashboard', subtitle: 'Your caseload, orders and results' },
  nurse: { title: 'Ward dashboard', subtitle: 'In-patient census, acuity and rounds' },
  pharmacist: { title: 'Pharmacy dashboard', subtitle: 'Dispensing queue and stock health' },
  radiologist: { title: 'Radiology dashboard', subtitle: 'Imaging worklist and reporting' },
  lab_technician: { title: 'Laboratory dashboard', subtitle: 'Samples, analyzers and validation' },
  receptionist: { title: 'Front desk', subtitle: 'Arrivals, scheduling and registration' },
  billing: { title: 'Revenue cycle', subtitle: 'Invoices, collections and claims' },
  patient: { title: 'Dashboard', subtitle: 'Patient portal' },
};

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------- primitives

type Tone = 'primary' | 'success' | 'warning' | 'info' | 'destructive';

const TONE_BG: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
};

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  subtitle,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: Tone;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn('relative overflow-hidden', highlight && 'border-warning/50 bg-warning/5')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn('p-2 rounded-lg flex-shrink-0', TONE_BG[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
          {title}
        </CardTitle>
        {action && (
          <Button variant="ghost" size="sm" className="gap-1" onClick={action.onClick}>
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-6 text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

const PRESCRIPTION_STATUS_STYLES: Record<PrescriptionStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  verified: 'bg-primary/10 text-primary',
  dispensed: 'bg-success/10 text-success',
  'partially-dispensed': 'bg-primary/10 text-primary',
  cancelled: 'bg-muted text-muted-foreground',
  'on-hold': 'bg-destructive/10 text-destructive',
};

function PrescriptionPill({ status }: { status: PrescriptionStatus }) {
  return (
    <span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', PRESCRIPTION_STATUS_STYLES[status])}>
      {status.replace('-', ' ')}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  stat: 'bg-destructive text-destructive-foreground',
  urgent: 'bg-warning text-warning-foreground',
  asap: 'bg-warning text-warning-foreground',
  routine: 'bg-muted text-muted-foreground',
};

function PriorityPill({ priority }: { priority: string }) {
  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wide', PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.routine)}>
      {priority}
    </span>
  );
}

const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-success/10 text-success',
  'in-progress': 'bg-primary/10 text-primary',
  scheduled: 'bg-muted text-muted-foreground',
  'checked-in': 'bg-info/10 text-info',
  'no-show': 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

function AppointmentPill({ status }: { status: string }) {
  return (
    <span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', APPOINTMENT_STATUS_STYLES[status] ?? APPOINTMENT_STATUS_STYLES.scheduled)}>
      {status.replace('-', ' ')}
    </span>
  );
}

// ------------------------------------------------------------ shared panels

function AlertsPanel({ role, notifications }: { role: UserRole; notifications: Notification[] }) {
  const visible = notifications.filter(
    (notification) => !notification.actionUrl || canAccessRoute(role, notification.actionUrl),
  );

  return (
    <Panel title="Recent alerts">
      {visible.length === 0 ? (
        <EmptyState icon={AlertTriangle} message="No alerts for your department" />
      ) : (
        <div className="space-y-3">
          {visible.slice(0, 4).map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                !notification.read && 'bg-primary/5 border-primary/20',
              )}
            >
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                  notification.type === 'alert' ? 'bg-destructive/10'
                    : notification.type === 'warning' ? 'bg-warning/10'
                    : notification.type === 'success' ? 'bg-success/10'
                    : 'bg-info/10',
                )}
              >
                <AlertTriangle
                  className={cn(
                    'h-4 w-4',
                    notification.type === 'alert' ? 'text-destructive'
                      : notification.type === 'warning' ? 'text-warning'
                      : notification.type === 'success' ? 'text-success'
                      : 'text-info',
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{notification.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AppointmentsPanel({
  appointments,
  title = "Today's schedule",
}: {
  appointments: Appointment[];
  title?: string;
}) {
  const navigate = useNavigate();
  return (
    <Panel
      title={title}
      icon={CalendarClock}
      action={{ label: 'Open appointments', onClick: () => navigate('/appointments') }}
    >
      {appointments.length === 0 ? (
        <EmptyState icon={CalendarClock} message="No appointments scheduled" />
      ) : (
        <div className="space-y-3">
          {appointments.slice(0, 5).map((appointment) => (
            <div key={appointment.id} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{appointment.patientName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatTime(appointment.scheduledTime)} • {appointment.duration} min • {appointment.type}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{appointment.physician} • {appointment.department}</p>
                </div>
              </div>
              <AppointmentPill status={appointment.status} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function BedOccupancyPanel({ beds, rate, caption }: { beds: BedOccupancy[]; rate: number; caption?: string }) {
  return (
    <Panel title="Bed occupancy" icon={Bed}>
      {caption && <p className="mb-3 text-xs text-muted-foreground">{caption}</p>}
      <div className="space-y-3">
        {beds.slice(0, 6).map((ward) => {
          const occupancy = (ward.occupiedBeds / ward.totalBeds) * 100;
          return (
            <div key={ward.wardId} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="font-medium truncate">{ward.wardName}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {ward.occupiedBeds}/{ward.totalBeds}
                  <span className="ml-2 text-xs">({ward.availableBeds} free)</span>
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    occupancy > 90 ? 'bg-destructive' : occupancy > 75 ? 'bg-warning' : 'bg-primary',
                  )}
                  style={{ width: `${occupancy}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Overall occupancy <span className={cn('font-semibold', rate > 85 ? 'text-warning' : 'text-foreground')}>{rate}%</span>
      </p>
    </Panel>
  );
}

const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  stable: 'Stable',
  monitoring: 'Monitoring',
  critical: 'Critical',
  discharged: 'Discharged',
};

function CriticalPatientsPanel({ patients }: { patients: Patient[] }) {
  const navigate = useNavigate();
  return (
    <Panel
      title="Critical patients"
      icon={Activity}
      className="border-destructive/30 bg-destructive/5"
      action={patients.length > 0 ? { label: 'Patient list', onClick: () => navigate('/patients') } : undefined}
    >
      {patients.length === 0 ? (
        <EmptyState icon={Activity} message="No critical patients" />
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => (
            <div key={patient.upid} className="flex items-center justify-between gap-2 p-3 bg-card rounded-lg border border-border">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {patient.firstName} {patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate">{patient.upid}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {patient.wardLocation} • Bed {patient.bedNumber} • {PATIENT_STATUS_LABELS[patient.status]}
                </p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                Critical
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------ admin module

function AdminDashboard({ data }: { data: ModuleData }) {
  const navigate = useNavigate();
  const modules = [
    {
      label: 'Pharmacy',
      detail: `${data.pharmacy.pending} pending • ${data.pharmacy.verified} verified`,
      icon: Pill,
      path: '/pharmacy',
      alert: data.pharmacy.urgentQueue > 0,
    },
    {
      label: 'Laboratory',
      detail: `${data.laboratory.pendingOrders} orders • ${data.laboratory.pendingValidation} to validate`,
      icon: FlaskConical,
      path: '/laboratory',
      alert: data.laboratory.statOrders > 0 || data.laboratory.analyzerErrors > 0,
    },
    {
      label: 'Radiology',
      detail: `${data.radiology.openOrders} open • ${data.radiology.awaitingReport} awaiting report`,
      icon: Radio,
      path: '/radiology',
      alert: data.radiology.statOpen > 0 || data.radiology.criticalReports > 0,
    },
    {
      label: 'Billing',
      detail: `${currency.format(data.billing.outstanding)} outstanding • ${data.billing.overdueCount} overdue`,
      icon: CreditCard,
      path: '/billing',
      alert: data.billing.overdueCount > 0,
    },
  ];

  return (
    <>
      {data.scope.narrowed ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Appointments today" value={data.frontDesk.todayTotal} icon={CalendarClock} tone="primary" subtitle={`${data.frontDesk.completed} completed`} />
          <KpiCard label="Critical patients" value={data.criticalPatients.length} icon={Activity} tone="destructive" subtitle="Needs active monitoring" highlight={data.criticalPatients.length > 0} />
          <KpiCard label="Pending prescriptions" value={data.pharmacy.pending} icon={Pill} tone="warning" subtitle={`${data.pharmacy.urgentQueue} urgent or stat`} />
          <KpiCard label="Lab orders open" value={data.laboratory.pendingOrders} icon={FlaskConical} tone="info" subtitle={`${data.laboratory.pendingValidation} to validate`} />
          <KpiCard label="Outstanding" value={currency.format(data.billing.outstanding)} icon={CreditCard} tone="warning" subtitle={`${data.billing.overdueCount} overdue`} highlight={data.billing.overdueCount > 0} />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Total patients" value={data.stats.totalPatients.toLocaleString()} icon={Users} subtitle="Registered" />
          <KpiCard label="Today's OPD" value={data.stats.outpatientsToday} icon={Stethoscope} tone="success" subtitle={`${data.stats.avgWaitTime} min avg wait`} />
          <KpiCard label="Emergency" value={data.stats.emergencies} icon={Activity} tone="warning" subtitle={`${data.stats.criticalPatients} critical`} highlight={data.stats.criticalPatients > 0} />
          <KpiCard label="In-patients" value={data.stats.inpatients} icon={Bed} tone="info" subtitle={`${data.stats.pendingDischarges} pending discharge`} />
          <KpiCard label="Bed occupancy" value={`${data.stats.bedOccupancyRate}%`} icon={TrendingUp} tone={data.stats.bedOccupancyRate > 85 ? 'warning' : 'primary'} highlight={data.stats.bedOccupancyRate > 85} />
        </div>
      )}

      <Panel title="Module status" icon={ClipboardList}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modules.map((module) => (
            <button
              key={module.label}
              type="button"
              onClick={() => navigate(module.path)}
              className={cn(
                'rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/60',
                module.alert ? 'border-warning/50' : 'border-border',
              )}
            >
              <div className="flex items-center gap-2">
                <module.icon className={cn('h-4 w-4', module.alert ? 'text-warning' : 'text-muted-foreground')} />
                <span className="font-medium text-sm">{module.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{module.detail}</p>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BedOccupancyPanel beds={data.bedOccupancy} rate={data.stats.bedOccupancyRate} caption="All wards · hospital-wide, not tied to a department" />
        </div>
        <CriticalPatientsPanel patients={data.criticalPatients} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AppointmentsPanel appointments={data.appointments} />
        <AlertsPanel role={data.role} notifications={data.notifications} />
      </div>
    </>
  );
}

// --------------------------------------------------------- physician module

function PhysicianDashboard({ data }: { data: ModuleData }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Critical patients" value={data.criticalPatients.length} icon={Activity} tone="destructive" subtitle="Across your scope" highlight={data.criticalPatients.length > 0} />
        <KpiCard label="Today's appointments" value={data.frontDesk.todayTotal} icon={CalendarClock} tone="primary" subtitle={`${data.frontDesk.remaining} remaining`} />
        <KpiCard label="Results awaiting review" value={data.laboratory.pendingValidation} icon={FlaskConical} tone="info" subtitle={`${data.laboratory.processing} samples processing`} />
        <KpiCard label="Prescriptions pending" value={data.pharmacy.pending} icon={Pill} tone="warning" subtitle={`${data.pharmacy.urgentQueue} urgent or stat`} highlight={data.pharmacy.urgentQueue > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AppointmentsPanel appointments={data.appointments} title="Your clinic today" />
        </div>
        <CriticalPatientsPanel patients={data.criticalPatients} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel
          title="Results awaiting release"
          icon={FlaskConical}
          action={{ label: 'Open laboratory', onClick: () => navigate('/laboratory') }}
        >
          {data.laboratory.validationQueue.length === 0 ? (
            <EmptyState icon={CheckCircle2} message="No results waiting for validation" />
          ) : (
            <div className="space-y-3">
              {data.laboratory.validationQueue.map((entry) => (
                <div key={entry.sampleId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{entry.patientName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{entry.sampleId}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-info/10 text-info">
                    {entry.testCount} tests
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <AlertsPanel role={data.role} notifications={data.notifications} />
      </div>
    </>
  );
}

// -------------------------------------------------------------- nurse module

function NurseDashboard({ data }: { data: ModuleData }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="In-patients" value={data.stats.inpatients} icon={Bed} tone="info" subtitle={`${data.stats.pendingDischarges} pending discharge · hospital-wide`} />
        <KpiCard label="Bed occupancy" value={`${data.stats.bedOccupancyRate}%`} icon={TrendingUp} tone={data.stats.bedOccupancyRate > 85 ? 'warning' : 'primary'} subtitle="All wards · hospital-wide" highlight={data.stats.bedOccupancyRate > 85} />
        <KpiCard label="Critical patients" value={data.criticalPatients.length} icon={Activity} tone="destructive" highlight={data.criticalPatients.length > 0} subtitle="Needs active monitoring" />
        <KpiCard label="Appointments today" value={data.frontDesk.todayTotal} icon={CalendarClock} tone="success" subtitle={`${data.frontDesk.inProgress} in progress`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BedOccupancyPanel beds={data.bedOccupancy} rate={data.stats.bedOccupancyRate} caption="All wards · hospital-wide, not tied to a department" />
        </div>
        <CriticalPatientsPanel patients={data.criticalPatients} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AppointmentsPanel appointments={data.appointments} />
        <AlertsPanel role={data.role} notifications={data.notifications} />
      </div>
    </>
  );
}

// ----------------------------------------------------------- pharmacy module

function PharmacyDashboard({ data }: { data: ModuleData }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Pending prescriptions" value={data.pharmacy.pending} icon={ClipboardList} tone="warning" subtitle={`${data.pharmacy.urgentQueue} urgent or stat`} highlight={data.pharmacy.urgentQueue > 0} />
        <KpiCard label="Verified" value={data.pharmacy.verified} icon={CheckCircle2} tone="primary" subtitle="Awaiting dispense" />
        <KpiCard label="Dispensed" value={data.pharmacy.dispensed} icon={Pill} tone="success" subtitle={`${data.pharmacy.onHold} on hold`} />
        <KpiCard label="Controlled items" value={data.pharmacy.controlledQueue} icon={AlertTriangle} tone="destructive" subtitle="In active queue" highlight={data.pharmacy.controlledQueue > 0} />
        <KpiCard label="Low stock" value={data.pharmacy.lowStock} icon={Package} tone={data.pharmacy.lowStock > 0 ? 'warning' : 'info'} subtitle="Below reorder level" highlight={data.pharmacy.lowStock > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel
            title="Dispensing queue"
            icon={ClipboardList}
            action={{ label: 'Open pharmacy', onClick: () => navigate('/pharmacy') }}
          >
            {data.pharmacy.queue.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="Queue is clear" />
            ) : (
              <div className="space-y-2">
                {data.pharmacy.queue.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <PriorityPill priority={entry.priority} />
                        <p className="font-medium text-sm truncate">{entry.patientName}</p>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {entry.id} • {entry.medicationCount} item{entry.medicationCount === 1 ? '' : 's'} • {entry.prescribedBy}
                      </p>
                    </div>
                    <PrescriptionPill status={entry.status} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Reorder list" icon={Package} action={{ label: 'Inventory', onClick: () => navigate('/pharmacy') }}>
          {data.pharmacy.lowStockItems.length === 0 ? (
            <EmptyState icon={Package} message="Stock levels are healthy" />
          ) : (
            <div className="space-y-2">
              {data.pharmacy.lowStockItems.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border border-warning/40 bg-warning/5">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.stockQuantity} in stock • reorder at {item.reorderLevel}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.location}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <AlertsPanel role={data.role} notifications={data.notifications} />
    </>
  );
}

// ---------------------------------------------------------- radiology module

function RadiologyDashboard({ data }: { data: ModuleData }) {
  const navigate = useNavigate();
  const maxModality = Math.max(1, ...data.radiology.modalityMix.map((entry) => entry.count));

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Open orders" value={data.radiology.openOrders} icon={Radio} tone="primary" subtitle="Scheduled or scanning" />
        <KpiCard label="STAT cases" value={data.radiology.statOpen} icon={AlertTriangle} tone="destructive" subtitle="Requires immediate read" highlight={data.radiology.statOpen > 0} />
        <KpiCard label="Awaiting report" value={data.radiology.awaitingReport} icon={FileText} tone="warning" subtitle="Acquired, not reported" />
        <KpiCard label="Critical findings" value={data.radiology.criticalReports} icon={Activity} tone="destructive" subtitle="Unfinalised reports" highlight={data.radiology.criticalReports > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel
            title="Imaging worklist"
            icon={Radio}
            action={{ label: 'Open radiology', onClick: () => navigate('/radiology') }}
          >
            {data.radiology.worklist.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="Worklist is clear" />
            ) : (
              <div className="space-y-2">
                {data.radiology.worklist.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <PriorityPill priority={entry.priority} />
                        <p className="font-medium text-sm truncate">{entry.patientName}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.modality} • {entry.bodyPart} • {entry.id}
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                      {entry.status.replace('-', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Modality mix" icon={TrendingUp}>
          {data.radiology.modalityMix.length === 0 ? (
            <EmptyState icon={Radio} message="No imaging orders" />
          ) : (
            <div className="space-y-3">
              {data.radiology.modalityMix.map((entry) => (
                <div key={entry.modality} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{entry.modality}</span>
                    <span className="text-muted-foreground">{entry.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(entry.count / maxModality) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <AlertsPanel role={data.role} notifications={data.notifications} />
    </>
  );
}

// --------------------------------------------------------- laboratory module

const ANALYZER_TONES: Record<string, string> = {
  online: 'bg-success/10 text-success',
  offline: 'bg-muted text-muted-foreground',
  maintenance: 'bg-warning/10 text-warning',
  calibrating: 'bg-info/10 text-info',
  error: 'bg-destructive/10 text-destructive',
};

function LaboratoryDashboard({ data }: { data: ModuleData }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Pending orders" value={data.laboratory.pendingOrders} icon={ClipboardList} tone="warning" subtitle={`${data.laboratory.statOrders} stat`} highlight={data.laboratory.statOrders > 0} />
        <KpiCard label="Samples in lab" value={data.laboratory.samplesInLab} icon={FlaskConical} tone="primary" subtitle={`${data.laboratory.processing} on analyzers`} />
        <KpiCard label="Awaiting validation" value={data.laboratory.pendingValidation} icon={CheckCircle2} tone="info" subtitle="Ready for release" />
        <KpiCard label="Analyzers online" value={`${data.laboratory.analyzersOnline}/${data.laboratory.analyzersTotal}`} icon={Wrench} tone={data.laboratory.analyzerErrors > 0 ? 'destructive' : 'success'} subtitle={data.laboratory.analyzerErrors > 0 ? `${data.laboratory.analyzerErrors} in error` : 'All healthy'} />
        <KpiCard label="In progress" value={data.laboratory.inProgressOrders} icon={Clock} tone="info" subtitle="Orders being run" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel
            title="Validation queue"
            icon={CheckCircle2}
            action={{ label: 'Open laboratory', onClick: () => navigate('/laboratory') }}
          >
            {data.laboratory.validationQueue.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="No results waiting for validation" />
            ) : (
              <div className="space-y-2">
                {data.laboratory.validationQueue.map((entry) => (
                  <div key={entry.sampleId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{entry.patientName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{entry.sampleId}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-info/10 text-info">
                      {entry.testCount} tests
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Analyzer status" icon={Wrench}>
          {data.laboratory.analyzers.length === 0 ? (
            <EmptyState icon={Wrench} message="No analyzers registered" />
          ) : (
            <div className="space-y-2">
              {data.laboratory.analyzers.map((analyzer) => (
                <div key={analyzer.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{analyzer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {analyzer.currentQueue} queued • {analyzer.avgProcessingTime} min avg
                    </p>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-full capitalize', ANALYZER_TONES[analyzer.status])}>
                    {analyzer.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <AlertsPanel role={data.role} notifications={data.notifications} />
    </>
  );
}

// ---------------------------------------------------------- front desk module

function ReceptionDashboard({ data }: { data: ModuleData }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Appointments today" value={data.frontDesk.todayTotal} icon={CalendarClock} tone="primary" subtitle="Booked for today" />
        <KpiCard label="Scheduled" value={data.frontDesk.scheduled} icon={Clock} tone="info" subtitle="Not yet arrived" />
        <KpiCard label="In progress" value={data.frontDesk.inProgress} icon={Stethoscope} tone="success" subtitle="With clinician" />
        <KpiCard label="Completed" value={data.frontDesk.completed} icon={CheckCircle2} tone="success" subtitle="Checked out" />
        <KpiCard label="Remaining" value={data.frontDesk.remaining} icon={ClipboardList} tone="warning" subtitle="Still expected" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AppointmentsPanel appointments={data.appointments} title="Arrivals and schedule" />
        </div>
        <AlertsPanel role={data.role} notifications={data.notifications} />
      </div>
    </>
  );
}

// ------------------------------------------------------------- billing module

function BillingDashboardPanel({ data }: { data: ModuleData }) {
  const navigate = useNavigate();
  const canOpenBilling = canAccessRoute(data.role, '/billing');

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Outstanding" value={currency.format(data.billing.outstanding)} icon={CreditCard} tone="warning" subtitle={`${data.billing.sentCount} invoices sent`} highlight={data.billing.overdueCount > 0} />
        <KpiCard label="Overdue" value={data.billing.overdueCount} icon={AlertTriangle} tone="destructive" subtitle="Past due date" />
        <KpiCard label="Drafts" value={data.billing.draftCount} icon={FileText} tone="info" subtitle="Not issued" />
        <KpiCard label="Payments today" value={data.billing.paymentsToday} icon={CheckCircle2} tone="success" subtitle={currency.format(data.billing.paymentsTodayTotal)} />
        <KpiCard label="Collection rate" value={`${data.billing.collectionRate}%`} icon={TrendingUp} tone={data.billing.collectionRate >= 80 ? 'success' : 'warning'} subtitle="Of billed amount" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel
            title="Invoices needing attention"
            icon={CreditCard}
            action={canOpenBilling ? { label: 'Open billing', onClick: () => navigate('/billing') } : undefined}
          >
            {data.billing.attention.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="No invoices need follow-up" />
            ) : (
              <div className="space-y-2">
                {data.billing.attention.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{invoice.patientName}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {invoice.number} • due {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm tabular-nums">{currency.format(invoice.balanceDue)}</p>
                      <span
                        className={cn(
                          'text-xs font-medium capitalize',
                          invoice.status === 'overdue' ? 'text-destructive'
                            : invoice.status === 'partial' ? 'text-warning'
                            : 'text-muted-foreground',
                        )}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
        <AlertsPanel role={data.role} notifications={data.notifications} />
      </div>
    </>
  );
}

// ----------------------------------------------------------------- dispatcher

export function ModuleBody({ data }: { data: ModuleData }) {
  switch (data.role) {
    case 'admin':
      return <AdminDashboard data={data} />;
    case 'physician':
      return <PhysicianDashboard data={data} />;
    case 'nurse':
      return <NurseDashboard data={data} />;
    case 'pharmacist':
      return <PharmacyDashboard data={data} />;
    case 'radiologist':
      return <RadiologyDashboard data={data} />;
    case 'lab_technician':
      return <LaboratoryDashboard data={data} />;
    case 'receptionist':
      return <ReceptionDashboard data={data} />;
    case 'billing':
      return <BillingDashboardPanel data={data} />;
    default:
      return null;
  }
}
