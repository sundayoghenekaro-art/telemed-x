import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Bed,
  Building2,
  Calendar,
  CreditCard,
  FlaskConical,
  MessageSquare,
  Pill,
  Radio,
  Users,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { canAccessRoute, departmentMatches } from '@/lib/access';
import {
  summarizeBilling,
  summarizeFrontDesk,
  summarizeLaboratory,
  summarizePharmacy,
  summarizeRadiology,
} from '@/lib/moduleSummaries';
import type {
  Appointment,
  BedOccupancy,
  DashboardStats,
  LabAnalyzer,
  LabOrder,
  LabResult,
  LabSample,
  Notification,
  Patient,
  PharmacyInventoryItem,
  Prescription,
  RadiologyOrder,
  RadiologyReport,
  RadiologyStudy,
  UserRole,
} from '@/types/dhos';
import { MODULE_META, ModuleBody, ModuleData } from './moduleDashboards';

export interface DashboardBillingInvoice {
  id: string;
  invoice_number: string;
  patient_name: string;
  department: string;
  status: string;
  total: number;
  balance_due: number;
  due_date: string;
}

export interface DashboardBillingPayment {
  invoice_id: string;
  amount: number;
  payment_date: string;
}

export interface DashboardProps {
  role: UserRole;
  stats: DashboardStats;
  bedOccupancy: BedOccupancy[];
  appointments: Appointment[];
  criticalPatients: Patient[];
  notifications: Notification[];
  departmentScope: string | null;
  prescriptions: Prescription[];
  inventory: PharmacyInventoryItem[];
  labOrders: LabOrder[];
  labSamples: LabSample[];
  labAnalyzers: LabAnalyzer[];
  pendingResults: Array<{ sample: LabSample; order: LabOrder; results: LabResult[] }>;
  processingSamples: Array<{ sampleId: string }>;
  radiologyOrders: RadiologyOrder[];
  radiologyStudies: RadiologyStudy[];
  radiologyReports: RadiologyReport[];
  invoices: DashboardBillingInvoice[];
  payments: DashboardBillingPayment[];
}

const SHORTCUTS = [
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/appointments', label: 'Appointments', icon: Calendar },
  { path: '/pharmacy', label: 'Prescriptions', icon: Pill },
  { path: '/inpatient', label: 'In-Patient', icon: Bed },
  { path: '/laboratory', label: 'Laboratory', icon: FlaskConical },
  { path: '/radiology', label: 'Radiology', icon: Radio },
  { path: '/billing', label: 'Billing', icon: CreditCard },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
];

// Landing page per module. The department filter narrows the dashboard inside
// the area the user may already see: clinicians are locked to their own
// department, cross-department roles can switch between any department.
export function Dashboard(props: DashboardProps) {
  const navigate = useNavigate();
  const {
    role, stats, bedOccupancy, appointments, criticalPatients, notifications,
    departmentScope, prescriptions, inventory, labOrders, labSamples, labAnalyzers,
    pendingResults, processingSamples, radiologyOrders, radiologyStudies,
    radiologyReports, invoices, payments,
  } = props;

  const meta = MODULE_META[role];
  const shortcuts = SHORTCUTS.filter((item) => canAccessRoute(role, item.path));

  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const departments = useMemo(() => {
    const values = new Set<string>();
    appointments.forEach((appointment) => appointment.department && values.add(appointment.department));
    invoices.forEach((invoice) => invoice.department && values.add(invoice.department));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [appointments, invoices]);

  useEffect(() => {
    if (selectedDepartment !== 'all' && !departments.includes(selectedDepartment)) {
      setSelectedDepartment('all');
    }
  }, [departments, selectedDepartment]);

  const effectiveDepartment = departmentScope ?? selectedDepartment;

  const moduleData = useMemo<ModuleData>(() => {
    const matches = (department?: string | null) =>
      effectiveDepartment === 'all'
      || (department ? departmentMatches(effectiveDepartment, department) : false);

    const filteredAppointments = effectiveDepartment === 'all'
      ? appointments
      : appointments.filter((appointment) => matches(appointment.department));

    const patientUpids = new Set(filteredAppointments.map((appointment) => appointment.patientUpid));
    const byPatient = <T extends { patientUpid: string }>(rows: T[]): T[] =>
      effectiveDepartment === 'all' ? rows : rows.filter((row) => patientUpids.has(row.patientUpid));

    const filteredInvoices = effectiveDepartment === 'all'
      ? invoices
      : invoices.filter((invoice) => matches(invoice.department));
    const invoiceIds = new Set(filteredInvoices.map((invoice) => invoice.id));
    const filteredPayments = effectiveDepartment === 'all'
      ? payments
      : payments.filter((payment) => invoiceIds.has(payment.invoice_id));

    const filteredPendingResults = effectiveDepartment === 'all'
      ? pendingResults
      : pendingResults.filter((entry) => patientUpids.has(entry.sample.patientUpid));

    const sampleUpids = new Map(labSamples.map((sample) => [sample.id, sample.patientUpid]));
    const processingCount = effectiveDepartment === 'all'
      ? processingSamples.length
      : processingSamples.filter((entry) => {
          const upid = sampleUpids.get(entry.sampleId);
          return upid ? patientUpids.has(upid) : false;
        }).length;

    return {
      role,
      stats,
      scope: {
        department: effectiveDepartment === 'all' ? null : effectiveDepartment,
        narrowed: effectiveDepartment !== 'all',
      },
      bedOccupancy,
      appointments: filteredAppointments,
      criticalPatients: effectiveDepartment === 'all'
        ? criticalPatients
        : criticalPatients.filter((patient) => patientUpids.has(patient.upid)),
      notifications,
      pharmacy: summarizePharmacy(byPatient(prescriptions), inventory),
      laboratory: summarizeLaboratory(
        byPatient(labOrders),
        byPatient(labSamples),
        labAnalyzers,
        filteredPendingResults,
        processingCount,
      ),
      radiology: summarizeRadiology(
        byPatient(radiologyOrders),
        byPatient(radiologyStudies),
        byPatient(radiologyReports),
      ),
      billing: summarizeBilling(filteredInvoices, filteredPayments),
      frontDesk: summarizeFrontDesk(filteredAppointments),
    };
  }, [
    role, stats, bedOccupancy, appointments, criticalPatients, notifications,
    prescriptions, inventory, labOrders, labSamples, labAnalyzers, pendingResults,
    processingSamples, radiologyOrders, radiologyStudies, radiologyReports,
    invoices, payments, effectiveDepartment,
  ]);

  const departmentLabel = effectiveDepartment === 'all' ? 'All departments' : effectiveDepartment;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#0b2737] via-[#0a2b38] to-[#072623] p-5 shadow-soft lg:p-6">
        <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-60" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(94,234,212,.22),transparent_45%),radial-gradient(circle_at_10%_110%,rgba(56,189,248,.18),transparent_50%)]"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5eead4]" />
              {format(new Date(), 'EEEE, d MMMM yyyy')}
              <span className="text-white/30">·</span>
              <span className="capitalize">{role.replace('_', ' ')}</span>
            </p>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{meta.title}</h1>
            <p className="mt-1.5 text-sm text-white/65">{meta.subtitle}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[11px] text-amber-100">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                Demo data · illustrative figures
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
                {departmentLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {departmentScope ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2 text-sm text-white/80 backdrop-blur">
                <Building2 className="h-4 w-4 text-[#9df5e7]" />
                <span className="text-white/55">Department</span>
                <span className="font-medium text-white">{departmentScope}</span>
              </div>
            ) : departments.length > 0 ? (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger
                  className="w-full border-white/20 bg-white/95 text-foreground sm:w-[240px]"
                  aria-label="Department filter"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All departments" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2 text-sm text-white/80 backdrop-blur">
                <Building2 className="h-4 w-4 text-[#9df5e7]" />
                <span className="text-white/55">Scope</span>
                <span className="font-medium text-white">All departments</span>
              </div>
            )}

            <img
              src="/assets/network-command.jpg"
              alt=""
              aria-hidden
              loading="lazy"
              className="hidden h-[92px] w-40 rounded-xl object-cover ring-1 ring-white/15 xl:block"
            />
          </div>
        </div>
      </div>

      {(departmentScope !== null || departments.length > 0) && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{departmentLabel}</span>
          {departmentScope === null
            ? ' · switch departments to narrow the panels below'
            : ' · panels below follow this department'}
        </p>
      )}

      {shortcuts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.path}
              type="button"
              onClick={() => navigate(shortcut.path)}
              className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary-strong">
                <shortcut.icon className="h-3.5 w-3.5" />
              </span>
              {shortcut.label}
            </button>
          ))}
        </div>
      )}

      <ModuleBody data={moduleData} />
    </div>
  );
}
