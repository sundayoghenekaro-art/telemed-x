import { addDays, subDays, subMonths, format } from 'date-fns';

// ------------------------------------------------------------- health programmes

export type ImmunisationStatus = 'due' | 'overdue' | 'completed';

export interface ImmunisationRecord {
  id: string;
  vaccine: string;
  doseNumber: number;
  dueDate: string;
  status: ImmunisationStatus;
  administeredAt?: string;
  site?: string;
}

export const mockImmunisations: ImmunisationRecord[] = [
  { id: 'IM-001', vaccine: 'Influenza (seasonal)', doseNumber: 1, dueDate: addDays(new Date(), 12).toISOString(), status: 'due' },
  { id: 'IM-002', vaccine: 'Tetanus-diphtheria booster', doseNumber: 1, dueDate: subDays(new Date(), 40).toISOString(), status: 'overdue' },
  { id: 'IM-003', vaccine: 'Hepatitis B', doseNumber: 3, dueDate: subDays(new Date(), 300).toISOString(), status: 'completed', administeredAt: subDays(new Date(), 300).toISOString(), site: 'Left deltoid' },
  { id: 'IM-004', vaccine: 'COVID-19 booster', doseNumber: 2, dueDate: subDays(new Date(), 120).toISOString(), status: 'completed', administeredAt: subDays(new Date(), 118).toISOString(), site: 'Right deltoid' },
];

export type ConditionStatus = 'on-track' | 'review-due' | 'out-of-range';

export interface ChronicCondition {
  id: string;
  name: string;
  diagnosedOn: string;
  target: string;
  latestReading: string;
  lastReview: string;
  nextReview: string;
  status: ConditionStatus;
}

export const mockChronicConditions: ChronicCondition[] = [
  {
    id: 'CC-001', name: 'Hypertension', diagnosedOn: '2021-04-12', target: 'BP below 130/80',
    latestReading: '128/82 mmHg', lastReview: subDays(new Date(), 30).toISOString(),
    nextReview: addDays(new Date(), 60).toISOString(), status: 'on-track',
  },
  {
    id: 'CC-002', name: 'Type 2 diabetes', diagnosedOn: '2019-11-03', target: 'HbA1c below 7%',
    latestReading: 'HbA1c 8.4%', lastReview: subDays(new Date(), 95).toISOString(),
    nextReview: subDays(new Date(), 5).toISOString(), status: 'review-due',
  },
  {
    id: 'CC-003', name: 'Asthma', diagnosedOn: '2015-02-20', target: 'No night-time symptoms',
    latestReading: '2 rescue inhaler uses / week', lastReview: subDays(new Date(), 55).toISOString(),
    nextReview: addDays(new Date(), 35).toISOString(), status: 'out-of-range',
  },
];

export interface CheckupPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  includes: string[];
}

export const mockCheckupPackages: CheckupPackage[] = [
  {
    id: 'PKG-01', name: 'Basic wellness', description: 'Annual screening for healthy adults',
    price: 45000, durationMinutes: 90,
    includes: ['Full blood count', 'Blood sugar', 'Blood pressure', 'Urinalysis', 'Physician review'],
  },
  {
    id: 'PKG-02', name: 'Cardiac screening', description: 'Heart risk assessment with ECG and lipids',
    price: 120000, durationMinutes: 150,
    includes: ['ECG', 'Lipid profile', 'Blood pressure', 'Cardiologist review', 'Chest X-ray'],
  },
  {
    id: 'PKG-03', name: "Women's health", description: 'Screening package for women 30 and above',
    price: 85000, durationMinutes: 120,
    includes: ['Cervical screening', 'Breast examination', 'Pelvic ultrasound', 'Haemoglobin', 'Gynecologist review'],
  },
  {
    id: 'PKG-04', name: 'Child wellness', description: 'Growth and development review for children',
    price: 35000, durationMinutes: 60,
    includes: ['Growth charting', 'Immunisation review', 'Vision screen', 'Paediatric review'],
  },
];

export interface DependantAccount {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth: string;
  upid: string;
  programmeNote: string;
}

export const mockDependants: DependantAccount[] = [
  { id: 'DEP-001', name: 'Zainab Ibrahim', relationship: 'Daughter', dateOfBirth: '2018-06-14', upid: 'UPID-DEP-1001', programmeNote: 'Child wellness package due' },
  { id: 'DEP-002', name: 'Musa Ibrahim', relationship: 'Father', dateOfBirth: '1948-01-09', upid: 'UPID-DEP-1002', programmeNote: 'Hypertension review every 3 months' },
];

// ------------------------------------------------------------------- procurement

export interface Supplier {
  id: string;
  name: string;
  leadTimeDays: number;
  rating: number;
  categories: string[];
}

export const mockSuppliers: Supplier[] = [
  { id: 'SUP-01', name: 'Emzor Pharmaceuticals', leadTimeDays: 5, rating: 4.6, categories: ['Analgesics', 'Antibiotics'] },
  { id: 'SUP-02', name: 'Fidson Healthcare', leadTimeDays: 7, rating: 4.4, categories: ['Cardiovascular', 'Antidiabetics'] },
  { id: 'SUP-03', name: 'Dana Pharma', leadTimeDays: 3, rating: 4.8, categories: ['Emergency drugs', 'IV fluids'] },
];

export type PurchaseOrderStatus = 'draft' | 'submitted' | 'in-transit' | 'received';

export interface PurchaseOrderItem {
  medicationName: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  status: PurchaseOrderStatus;
  createdAt: string;
  expectedAt: string;
  centralPriceApplied: boolean;
}

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'PO-2026-0007', supplierId: 'SUP-01', supplierName: 'Emzor Pharmaceuticals',
    items: [{ medicationName: 'Amoxicillin 500 mg', quantity: 2000, unitPrice: 320 }],
    status: 'submitted', createdAt: subDays(new Date(), 2).toISOString(),
    expectedAt: addDays(new Date(), 3).toISOString(), centralPriceApplied: true,
  },
  {
    id: 'PO-2026-0008', supplierId: 'SUP-03', supplierName: 'Dana Pharma',
    items: [{ medicationName: 'Insulin glargine 100 IU/ml', quantity: 200, unitPrice: 4200 }],
    status: 'in-transit', createdAt: subDays(new Date(), 4).toISOString(),
    expectedAt: addDays(new Date(), 1).toISOString(), centralPriceApplied: true,
  },
  {
    id: 'PO-2026-0009', supplierId: 'SUP-02', supplierName: 'Fidson Healthcare',
    items: [{ medicationName: 'Amlodipine 5 mg', quantity: 1500, unitPrice: 280 }],
    status: 'draft', createdAt: subDays(new Date(), 1).toISOString(),
    expectedAt: addDays(new Date(), 7).toISOString(), centralPriceApplied: false,
  },
];

export type DeliveryStatus = 'preparing' | 'dispatched' | 'in-transit' | 'delivered';

export interface PrescriptionDelivery {
  id: string;
  prescriptionId: string;
  patientName: string;
  address: string;
  status: DeliveryStatus;
  courier: string;
  trackingCode: string;
  eta: string;
}

export const mockPrescriptionDeliveries: PrescriptionDelivery[] = [
  {
    id: 'DEL-001', prescriptionId: 'RX-005', patientName: 'Amina Ibrahim',
    address: '12 Ademola Street, Wuse II, Abuja', status: 'preparing',
    courier: 'Trika Logistics', trackingCode: 'TRK-77120', eta: addDays(new Date(), 1).toISOString(),
  },
  {
    id: 'DEL-002', prescriptionId: 'RX-002', patientName: 'Chidi Okonkwo',
    address: '8 Gwarinpa Avenue, Abuja', status: 'in-transit',
    courier: 'SwiftRx', trackingCode: 'TRK-77118', eta: new Date().toISOString(),
  },
  {
    id: 'DEL-003', prescriptionId: 'RX-003', patientName: 'David Chukwu',
    address: '3 Kubwa Road, Abuja', status: 'delivered',
    courier: 'Trika Logistics', trackingCode: 'TRK-77101', eta: subDays(new Date(), 1).toISOString(),
  },
];

// ---------------------------------------------------------------- operations

export interface MonthlyOperationsMetric {
  month: string;
  bedTurnover: number;
  averageLengthOfStay: number;
  costPerCase: number;
  caseMixIndex: number;
  noShowRate: number;
  averageWaitMinutes: number;
  occupancyPercent: number;
}

export const mockOperationsHistory: MonthlyOperationsMetric[] = Array.from({ length: 6 }, (_, index) => {
  const monthDate = subMonths(new Date(), 5 - index);
  const series = [
    { bedTurnover: 3.1, alos: 4.6, cost: 182000, cmi: 1.02, noShow: 12.4, wait: 34, occupancy: 72 },
    { bedTurnover: 3.2, alos: 4.4, cost: 188500, cmi: 1.04, noShow: 11.8, wait: 31, occupancy: 74 },
    { bedTurnover: 3.3, alos: 4.3, cost: 191000, cmi: 1.03, noShow: 10.9, wait: 29, occupancy: 76 },
    { bedTurnover: 3.4, alos: 4.1, cost: 196500, cmi: 1.07, noShow: 10.2, wait: 27, occupancy: 78 },
    { bedTurnover: 3.5, alos: 3.9, cost: 201000, cmi: 1.09, noShow: 9.7, wait: 24, occupancy: 79 },
    { bedTurnover: 3.6, alos: 3.8, cost: 205500, cmi: 1.11, noShow: 9.1, wait: 22, occupancy: 80 },
  ][index];
  return {
    month: format(monthDate, 'MMM yyyy'),
    bedTurnover: series.bedTurnover,
    averageLengthOfStay: series.alos,
    costPerCase: series.cost,
    caseMixIndex: series.cmi,
    noShowRate: series.noShow,
    averageWaitMinutes: series.wait,
    occupancyPercent: series.occupancy,
  };
});

export interface DepartmentScorecard {
  department: string;
  discharges: number;
  averageLengthOfStay: number;
  noShowRate: number;
  averageWaitMinutes: number;
  marginPercent: number;
}

export const mockDepartmentScorecards: DepartmentScorecard[] = [
  { department: 'Internal Medicine', discharges: 184, averageLengthOfStay: 4.2, noShowRate: 8.4, averageWaitMinutes: 21, marginPercent: 18 },
  { department: 'Cardiology', discharges: 96, averageLengthOfStay: 3.4, noShowRate: 6.9, averageWaitMinutes: 19, marginPercent: 24 },
  { department: 'Obstetrics & Gynecology', discharges: 142, averageLengthOfStay: 2.8, noShowRate: 7.6, averageWaitMinutes: 17, marginPercent: 21 },
  { department: 'Pediatrics', discharges: 118, averageLengthOfStay: 3.1, noShowRate: 11.2, averageWaitMinutes: 26, marginPercent: 12 },
  { department: 'Emergency / CCU', discharges: 74, averageLengthOfStay: 2.2, noShowRate: 14.8, averageWaitMinutes: 9, marginPercent: 9 },
];

// ----------------------------------------------------------------- compliance

export type ConsentMethod = 'e-signature' | 'otp' | 'paper';

export interface ConsentRecord {
  id: string;
  patientName: string;
  purpose: string;
  method: ConsentMethod;
  signedBy: string;
  signedAt: string;
  hash: string;
  status: 'active' | 'withdrawn' | 'expired';
}

export const mockConsentRecords: ConsentRecord[] = [
  {
    id: 'CS-001', patientName: 'Amina Ibrahim', purpose: 'Telemedicine consultation recording',
    method: 'e-signature', signedBy: 'Amina Ibrahim', signedAt: subDays(new Date(), 3).toISOString(),
    hash: 'SHA256:9f2c41e8b7a0d3…', status: 'active',
  },
  {
    id: 'CS-002', patientName: 'Emmanuel Nwosu', purpose: 'Transfer of records to National Cardiac Centre',
    method: 'e-signature', signedBy: 'Emmanuel Nwosu', signedAt: subDays(new Date(), 2).toISOString(),
    hash: 'SHA256:41ab77c90d12f8…', status: 'active',
  },
  {
    id: 'CS-003', patientName: 'Chidi Okonkwo', purpose: 'Insurance claim data sharing',
    method: 'otp', signedBy: 'Chidi Okonkwo', signedAt: subDays(new Date(), 8).toISOString(),
    hash: 'SHA256:c0d5e33a7b6042…', status: 'active',
  },
  {
    id: 'CS-004', patientName: 'Grace Adekunle', purpose: 'Marketing communications',
    method: 'paper', signedBy: 'Grace Adekunle', signedAt: subDays(new Date(), 45).toISOString(),
    hash: 'SHA256:77e2b19f4c8d05…', status: 'withdrawn',
  },
];

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actor: string;
  action: string;
  subject: string;
  detail: string;
}

export const mockAuditEvents: AuditEvent[] = [
  { id: 'AUD-001', occurredAt: new Date().toISOString(), actor: 'pharmacist@trika.health', action: 'Dispensed prescription', subject: 'RX-001', detail: 'Controlled substance witness recorded' },
  { id: 'AUD-002', occurredAt: subDays(new Date(), 1).toISOString(), actor: 'billing@trika.health', action: 'Settled insurance claim', subject: 'CLM-2026-0002', detail: 'NHIS settlement posted' },
  { id: 'AUD-003', occurredAt: subDays(new Date(), 1).toISOString(), actor: 'nurse@trika.health', action: 'Administered medication', subject: 'MA-002', detail: 'Barcode MED-PARA-1G verified' },
  { id: 'AUD-004', occurredAt: subDays(new Date(), 2).toISOString(), actor: 'admin@trika.health', action: 'Verified provider credential', subject: 'CRED-014', detail: 'Annual licence check' },
];

export interface DicomStudy {
  id: string;
  studyInstanceUid: string;
  patientName: string;
  modality: string;
  bodyPart: string;
  acquiredAt: string;
  seriesCount: number;
  imageCount: number;
  reportStatus: 'draft' | 'preliminary' | 'final' | 'amended';
}

export const mockDicomStudies: DicomStudy[] = [
  { id: 'DCM-001', studyInstanceUid: '1.2.840.113619.2.55.3.604688.1142', patientName: 'Amina Ibrahim', modality: 'CT', bodyPart: 'Head', acquiredAt: subDays(new Date(), 1).toISOString(), seriesCount: 3, imageCount: 214, reportStatus: 'final' },
  { id: 'DCM-002', studyInstanceUid: '1.2.840.113619.2.55.3.604688.1149', patientName: 'Emmanuel Nwosu', modality: 'CR', bodyPart: 'Chest', acquiredAt: subDays(new Date(), 2).toISOString(), seriesCount: 1, imageCount: 2, reportStatus: 'final' },
  { id: 'DCM-003', studyInstanceUid: '1.2.840.113619.2.55.3.604688.1153', patientName: 'Grace Adekunle', modality: 'US', bodyPart: 'Abdomen', acquiredAt: new Date().toISOString(), seriesCount: 2, imageCount: 46, reportStatus: 'preliminary' },
];
