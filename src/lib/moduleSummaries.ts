import { isSameDay } from 'date-fns';
import type {
  Appointment,
  AnalyzerStatus,
  LabAnalyzer,
  LabOrder,
  LabResult,
  LabSample,
  PharmacyInventoryItem,
  Prescription,
  PrescriptionStatus,
  RadiologyOrder,
  RadiologyReport,
  RadiologyStudy,
} from '@/types/dhos';

// Department-facing figures for the module dashboards. Each summary is derived
// from the same state the module page uses, so the landing page and the module
// cannot disagree.

export interface PharmacyQueueEntry {
  id: string;
  patientName: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: PrescriptionStatus;
  medicationCount: number;
  prescribedBy: string;
}

export interface LowStockEntry {
  id: string;
  name: string;
  stockQuantity: number;
  reorderLevel: number;
  location: string;
}

export interface PharmacyDashboardSummary {
  pending: number;
  verified: number;
  dispensed: number;
  onHold: number;
  lowStock: number;
  urgentQueue: number;
  controlledQueue: number;
  queue: PharmacyQueueEntry[];
  lowStockItems: LowStockEntry[];
}

export const EMPTY_PHARMACY_SUMMARY: PharmacyDashboardSummary = {
  pending: 0, verified: 0, dispensed: 0, onHold: 0, lowStock: 0,
  urgentQueue: 0, controlledQueue: 0, queue: [], lowStockItems: [],
};

const PRIORITY_RANK = { stat: 0, urgent: 1, routine: 2 } as const;

export function summarizePharmacy(
  prescriptions: Prescription[],
  inventory: PharmacyInventoryItem[],
): PharmacyDashboardSummary {
  const active = prescriptions.filter((rx) =>
    ['pending', 'verified', 'on-hold'].includes(rx.status),
  );
  const controlledIds = new Set(inventory.filter((item) => item.controlled).map((item) => item.id));

  const queue = [...active]
    .sort((a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      || new Date(a.prescribedAt).getTime() - new Date(b.prescribedAt).getTime(),
    )
    .slice(0, 6)
    .map((rx) => ({
      id: rx.id,
      patientName: rx.patientName,
      priority: rx.priority,
      status: rx.status,
      medicationCount: rx.items.length,
      prescribedBy: rx.prescribedBy,
    }));

  const lowStockItems = inventory
    .filter((item) => item.stockQuantity <= item.reorderLevel)
    .map((item) => ({
      id: item.id,
      name: item.name,
      stockQuantity: item.stockQuantity,
      reorderLevel: item.reorderLevel,
      location: item.location,
    }));

  return {
    pending: prescriptions.filter((rx) => rx.status === 'pending').length,
    verified: prescriptions.filter((rx) => rx.status === 'verified').length,
    dispensed: prescriptions.filter((rx) => rx.status === 'dispensed' || rx.status === 'partially-dispensed').length,
    onHold: prescriptions.filter((rx) => rx.status === 'on-hold').length,
    lowStock: lowStockItems.length,
    urgentQueue: active.filter((rx) => rx.priority !== 'routine').length,
    controlledQueue: active.filter((rx) => rx.items.some((item) => controlledIds.has(item.medicationId))).length,
    queue,
    lowStockItems,
  };
}

export interface LabValidationEntry {
  sampleId: string;
  patientName: string;
  testCount: number;
}

export interface AnalyzerEntry {
  id: string;
  name: string;
  status: AnalyzerStatus;
  currentQueue: number;
  avgProcessingTime: number;
}

export interface LaboratoryDashboardSummary {
  pendingOrders: number;
  inProgressOrders: number;
  statOrders: number;
  samplesInLab: number;
  processing: number;
  pendingValidation: number;
  analyzersOnline: number;
  analyzersTotal: number;
  analyzerErrors: number;
  analyzers: AnalyzerEntry[];
  validationQueue: LabValidationEntry[];
}

export const EMPTY_LAB_SUMMARY: LaboratoryDashboardSummary = {
  pendingOrders: 0, inProgressOrders: 0, statOrders: 0, samplesInLab: 0, processing: 0,
  pendingValidation: 0, analyzersOnline: 0, analyzersTotal: 0, analyzerErrors: 0,
  analyzers: [], validationQueue: [],
};

export function summarizeLaboratory(
  orders: LabOrder[],
  samples: LabSample[],
  analyzers: LabAnalyzer[],
  pendingResults: Array<{ sample: LabSample; order: LabOrder; results: LabResult[] }>,
  processingSamples: number,
): LaboratoryDashboardSummary {
  return {
    pendingOrders: orders.filter((order) => order.status === 'pending').length,
    inProgressOrders: orders.filter((order) => order.status === 'in-progress').length,
    statOrders: orders.filter((order) => order.priority === 'stat' && order.status !== 'completed').length,
    samplesInLab: samples.filter((sample) => ['received', 'processing', 'analyzed'].includes(sample.status)).length,
    processing: processingSamples,
    pendingValidation: pendingResults.length,
    analyzersOnline: analyzers.filter((analyzer) => analyzer.status === 'online').length,
    analyzersTotal: analyzers.length,
    analyzerErrors: analyzers.filter((analyzer) => analyzer.status === 'error').length,
    analyzers: analyzers.map((analyzer) => ({
      id: analyzer.id,
      name: analyzer.name,
      status: analyzer.status,
      currentQueue: analyzer.currentQueue,
      avgProcessingTime: analyzer.avgProcessingTime,
    })),
    validationQueue: pendingResults.slice(0, 5).map((entry) => ({
      sampleId: entry.sample.id,
      patientName: entry.sample.patientName,
      testCount: entry.results.length,
    })),
  };
}

export interface RadiologyWorklistEntry {
  id: string;
  patientName: string;
  modality: string;
  bodyPart: string;
  priority: RadiologyOrder['priority'];
  status: RadiologyOrder['status'];
}

export interface RadiologyDashboardSummary {
  openOrders: number;
  statOpen: number;
  inProgress: number;
  completed: number;
  awaitingReport: number;
  criticalReports: number;
  modalityMix: Array<{ modality: string; count: number }>;
  worklist: RadiologyWorklistEntry[];
}

export const EMPTY_RADIOLOGY_SUMMARY: RadiologyDashboardSummary = {
  openOrders: 0, statOpen: 0, inProgress: 0, completed: 0, awaitingReport: 0,
  criticalReports: 0, modalityMix: [], worklist: [],
};

export function summarizeRadiology(
  orders: RadiologyOrder[],
  studies: RadiologyStudy[],
  reports: RadiologyReport[],
): RadiologyDashboardSummary {
  const open = orders.filter((order) => ['scheduled', 'in-progress'].includes(order.status));
  const modalityCounts = new Map<string, number>();
  for (const order of orders) {
    modalityCounts.set(order.modality, (modalityCounts.get(order.modality) ?? 0) + 1);
  }
  const worklist = [...open]
    .sort((a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      || (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''),
    )
    .slice(0, 6)
    .map((order) => ({
      id: order.id,
      patientName: order.patientName,
      modality: order.modality,
      bodyPart: order.bodyPart,
      priority: order.priority,
      status: order.status,
    }));

  return {
    openOrders: open.length,
    statOpen: open.filter((order) => order.priority === 'stat').length,
    inProgress: orders.filter((order) => order.status === 'in-progress').length,
    completed: orders.filter((order) => order.status === 'completed').length,
    awaitingReport: studies.filter((study) => study.status === 'completed').length,
    criticalReports: reports.filter((report) => report.critical && report.status !== 'final').length,
    modalityMix: [...modalityCounts.entries()]
      .map(([modality, count]) => ({ modality, count }))
      .sort((a, b) => b.count - a.count),
    worklist,
  };
}

export interface BillingInvoiceEntry {
  id: string;
  number: string;
  patientName: string;
  status: string;
  total: number;
  balanceDue: number;
  dueDate: string;
}

export interface BillingDashboardSummary {
  outstanding: number;
  overdueCount: number;
  draftCount: number;
  sentCount: number;
  paymentsToday: number;
  paymentsTodayTotal: number;
  collectionRate: number;
  attention: BillingInvoiceEntry[];
}

export const EMPTY_BILLING_SUMMARY: BillingDashboardSummary = {
  outstanding: 0, overdueCount: 0, draftCount: 0, sentCount: 0,
  paymentsToday: 0, paymentsTodayTotal: 0, collectionRate: 0, attention: [],
};

export function summarizeBilling(
  invoices: Array<{
    id: string; invoice_number: string; patient_name: string; status: string;
    total: number; balance_due: number; due_date: string;
  }>,
  payments: Array<{ amount: number; payment_date: string }>,
): BillingDashboardSummary {
  const billable = invoices.filter((invoice) => invoice.status !== 'cancelled');
  const outstanding = billable.reduce((sum, invoice) => sum + invoice.balance_due, 0);
  const billed = billable.reduce((sum, invoice) => sum + invoice.total, 0);
  const collected = billable.reduce((sum, invoice) => sum + (invoice.total - invoice.balance_due), 0);
  const todayPayments = payments.filter((payment) => isSameDay(new Date(payment.payment_date), new Date()));

  const attention = billable
    .filter((invoice) => ['overdue', 'sent', 'partial'].includes(invoice.status))
    .sort((a, b) => b.balance_due - a.balance_due)
    .slice(0, 6)
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.invoice_number,
      patientName: invoice.patient_name,
      status: invoice.status,
      total: invoice.total,
      balanceDue: invoice.balance_due,
      dueDate: invoice.due_date,
    }));

  return {
    outstanding,
    overdueCount: invoices.filter((invoice) => invoice.status === 'overdue').length,
    draftCount: invoices.filter((invoice) => invoice.status === 'draft').length,
    sentCount: invoices.filter((invoice) => invoice.status === 'sent').length,
    paymentsToday: todayPayments.length,
    paymentsTodayTotal: todayPayments.reduce((sum, payment) => sum + payment.amount, 0),
    collectionRate: billed > 0 ? Math.round((collected / billed) * 100) : 0,
    attention,
  };
}

export interface FrontDeskSummary {
  todayTotal: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  remaining: number;
}

export const EMPTY_FRONT_DESK_SUMMARY: FrontDeskSummary = {
  todayTotal: 0, scheduled: 0, inProgress: 0, completed: 0, remaining: 0,
};

// Callers pass the day's schedule already (the dashboard apportions "today"),
// so this summarises the given list rather than re-filtering by clock date.
export function summarizeFrontDesk(appointments: Appointment[]): FrontDeskSummary {
  const completed = appointments.filter((appointment) => appointment.status === 'completed').length;
  return {
    todayTotal: appointments.length,
    scheduled: appointments.filter((appointment) => appointment.status === 'scheduled').length,
    inProgress: appointments.filter((appointment) => appointment.status === 'in-progress').length,
    completed,
    remaining: appointments.length - completed,
  };
}
