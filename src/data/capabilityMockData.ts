import { addDays, subDays } from 'date-fns';

// ------------------------------------------------------------------ queueing

export type QueueStatus = 'waiting' | 'called' | 'serving' | 'done' | 'no-show';
export type QueuePriority = 'routine' | 'urgent' | 'assisted';

export interface QueueTicket {
  id: string;
  appointmentId?: string;
  patientUpid: string;
  patientName: string;
  department: string;
  physician: string;
  room: string;
  ticketNumber: string;
  priority: QueuePriority;
  checkedInAt: string;
  status: QueueStatus;
  reminderSentAt?: string;
  calledAt?: string;
  completedAt?: string;
  note?: string;
}

export const mockQueueTickets: QueueTicket[] = [
  {
    id: 'Q-001', appointmentId: 'APT-001', patientUpid: 'UPID-9P1L6W8R', patientName: 'Emmanuel Nwosu',
    department: 'Cardiology', physician: 'Dr. Fatima Yusuf', room: 'Cardio 2',
    ticketNumber: 'C-01', priority: 'urgent', checkedInAt: atToday(8, 55), status: 'waiting',
  },
  {
    id: 'Q-002', appointmentId: 'APT-002', patientUpid: 'UPID-4M8T2R6Y', patientName: 'Chioma Eze',
    department: 'Internal Medicine', physician: 'Dr. Sarah Chen', room: 'IM 1',
    ticketNumber: 'I-02', priority: 'urgent', checkedInAt: atToday(9, 5), status: 'called', calledAt: atToday(9, 18),
  },
  {
    id: 'Q-003', appointmentId: 'APT-003', patientUpid: 'UPID-7Q3N5V1B', patientName: 'Fatima Musa',
    department: 'Internal Medicine', physician: 'Dr. Sarah Chen', room: 'IM 1',
    ticketNumber: 'I-03', priority: 'routine', checkedInAt: atToday(9, 20), status: 'waiting',
  },
  {
    id: 'Q-004', appointmentId: 'APT-004', patientUpid: 'UPID-2V5D9J4C', patientName: 'Grace Adekunle',
    department: 'Obstetrics & Gynecology', physician: 'Dr. Ngozi Eze', room: 'OB 3',
    ticketNumber: 'O-01', priority: 'assisted', checkedInAt: atToday(8, 40), status: 'serving',
  },
  {
    id: 'Q-005', appointmentId: 'APT-005', patientUpid: 'UPID-6H1S8K3D', patientName: 'David Chukwu',
    department: 'Pediatrics', physician: 'Dr. Ada Obi', room: 'Paeds 2',
    ticketNumber: 'P-01', priority: 'routine', checkedInAt: atToday(9, 0), status: 'no-show',
  },
  {
    id: 'Q-006', appointmentId: 'APT-006', patientUpid: 'UPID-3B7G4L9M', patientName: 'Aisha Mohammed',
    department: 'Internal Medicine', physician: 'Dr. Sarah Chen', room: 'IM 2',
    ticketNumber: 'I-04', priority: 'routine', checkedInAt: atToday(8, 30), status: 'done', completedAt: atToday(8, 52),
  },
];

// ------------------------------------------------------- insurance settlement

export type EligibilityStatus = 'verified' | 'pending' | 'ineligible';
export type ClaimStatus = 'none' | 'draft' | 'submitted' | 'approved' | 'denied';

export interface PayerPolicy {
  id: string;
  patientName: string;
  payer: string;
  policyNumber: string;
  coveragePercent: number;
  exclusions: string[];
  eligibility: EligibilityStatus;
  checkedAt?: string;
  claimStatus: ClaimStatus;
  settledAmount?: number;
}

export const mockPayerPolicies: PayerPolicy[] = [
  {
    id: 'POL-001', patientName: 'Amina Ibrahim', payer: 'NHIS', policyNumber: 'NHIS-2234567',
    coveragePercent: 80, exclusions: ['Cosmetic procedures', 'Private room upgrade'],
    eligibility: 'verified', checkedAt: subDays(new Date(), 2).toISOString(), claimStatus: 'none',
  },
  {
    id: 'POL-002', patientName: 'Chidi Okonkwo', payer: 'Reliance HMO', policyNumber: 'RH-4471902',
    coveragePercent: 70, exclusions: ['Dental', 'Optical'],
    eligibility: 'pending', claimStatus: 'none',
  },
  {
    id: 'POL-003', patientName: 'Fatima Bello', payer: 'Hygeia HMO', policyNumber: 'HY-8812340',
    coveragePercent: 90, exclusions: ['Pre-existing conditions in year one'],
    eligibility: 'ineligible', checkedAt: subDays(new Date(), 1).toISOString(), claimStatus: 'none',
  },
  {
    id: 'POL-004', patientName: 'Emeka Nwosu', payer: 'NHIS', policyNumber: 'NHIS-5567812',
    coveragePercent: 80, exclusions: ['Cosmetic procedures'],
    eligibility: 'verified', checkedAt: subDays(new Date(), 5).toISOString(), claimStatus: 'submitted',
  },
  {
    id: 'POL-005', patientName: 'Ngozi Adeyemi', payer: 'AXA Mansard', policyNumber: 'AXA-3390117',
    coveragePercent: 60, exclusions: ['Maternity waiting period'],
    eligibility: 'verified', checkedAt: subDays(new Date(), 9).toISOString(), claimStatus: 'none',
  },
];

export interface TariffItem {
  code: string;
  description: string;
  category: 'consultation' | 'procedure' | 'lab' | 'radiology' | 'pharmacy' | 'room';
  price: number;
  covered: boolean;
}

export const mockTariffItems: TariffItem[] = [
  { code: 'CONS-01', description: 'Specialist consultation', category: 'consultation', price: 15000, covered: true },
  { code: 'CONS-02', description: 'Follow-up consultation', category: 'consultation', price: 8000, covered: true },
  { code: 'LAB-FBC', description: 'Full blood count', category: 'lab', price: 9500, covered: true },
  { code: 'LAB-MPS', description: 'Malaria parasite screen', category: 'lab', price: 4500, covered: true },
  { code: 'LAB-EUC', description: 'Electrolytes, urea & creatinine', category: 'lab', price: 12500, covered: true },
  { code: 'IMG-CXR', description: 'Chest X-ray, PA view', category: 'radiology', price: 25000, covered: true },
  { code: 'IMG-CTH', description: 'CT head without contrast', category: 'radiology', price: 95000, covered: true },
  { code: 'PROC-ECG', description: '12-lead ECG', category: 'procedure', price: 18000, covered: true },
  { code: 'PROC-DRESS', description: 'Wound dressing', category: 'procedure', price: 6000, covered: true },
  { code: 'PH-ART', description: 'Artemether/lumefantrine pack', category: 'pharmacy', price: 3200, covered: true },
  { code: 'PH-IVF', description: 'IV fluids, 500 ml', category: 'pharmacy', price: 2800, covered: true },
  { code: 'ROOM-PVT', description: 'Private room, per night', category: 'room', price: 45000, covered: false },
  { code: 'ROOM-GEN', description: 'General ward, per night', category: 'room', price: 12000, covered: true },
];

export interface PaymentLink {
  id: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  channel: 'card' | 'bank_transfer' | 'mobile_money' | 'insurance';
  reference: string;
  status: 'created' | 'paid' | 'expired';
  createdAt: string;
}

export const mockPaymentLinks: PaymentLink[] = [
  {
    id: 'PL-001', invoiceNumber: 'INV-2026-0003', patientName: 'Fatima Bello', amount: 188875,
    channel: 'card', reference: 'PAY-LNK-27411', status: 'created', createdAt: atToday(8, 15),
  },
];

// ------------------------------------------------- closed-loop administration

export type MedAdminStatus = 'due' | 'given' | 'held' | 'refused';

export interface MedicationAdministration {
  id: string;
  patientUpid: string;
  patientName: string;
  ward: string;
  bed: string;
  medication: string;
  dose: string;
  route: 'oral' | 'iv' | 'im' | 'sc' | 'topical' | 'inhalation';
  dueAt: string;
  status: MedAdminStatus;
  barcode: string;
  administeredBy?: string;
  administeredAt?: string;
  note?: string;
}

export const mockMedicationAdministrations: MedicationAdministration[] = [
  {
    id: 'MA-001', patientUpid: 'UPID-9P1L6W8R', patientName: 'Emmanuel Nwosu', ward: 'CCU', bed: 'CCU-01',
    medication: 'Ceftriaxone', dose: '1 g', route: 'iv', dueAt: atToday(12, 0), status: 'due', barcode: 'MED-CEFT-1G',
  },
  {
    id: 'MA-002', patientUpid: 'UPID-9P1L6W8R', patientName: 'Emmanuel Nwosu', ward: 'CCU', bed: 'CCU-01',
    medication: 'Paracetamol', dose: '1 g', route: 'iv', dueAt: atToday(10, 0), status: 'given',
    barcode: 'MED-PARA-1G', administeredBy: 'Nurse Adaeze Okafor', administeredAt: atToday(10, 5),
  },
  {
    id: 'MA-003', patientUpid: 'UPID-2V5D9J4C', patientName: 'Grace Adekunle', ward: 'Maternity', bed: 'MAT-04',
    medication: 'Oxytocin', dose: '10 IU', route: 'im', dueAt: atToday(11, 30), status: 'due', barcode: 'MED-OXY-10IU',
  },
  {
    id: 'MA-004', patientUpid: 'UPID-2V5D9J4C', patientName: 'Grace Adekunle', ward: 'Maternity', bed: 'MAT-04',
    medication: 'Amlodipine', dose: '5 mg', route: 'oral', dueAt: atToday(8, 0), status: 'held',
    barcode: 'MED-AMLO-5MG', note: 'Held — systolic BP 96 mmHg, clinician notified',
  },
  {
    id: 'MA-005', patientUpid: 'UPID-6H1S8K3D', patientName: 'David Chukwu', ward: 'Pediatrics', bed: 'PAED-03',
    medication: 'Ondansetron', dose: '2 mg', route: 'iv', dueAt: atToday(14, 0), status: 'due', barcode: 'MED-ONDA-2MG',
  },
  {
    id: 'MA-006', patientUpid: 'UPID-6H1S8K3D', patientName: 'David Chukwu', ward: 'Pediatrics', bed: 'PAED-03',
    medication: 'Enoxaparin', dose: '20 mg', route: 'sc', dueAt: atToday(9, 0), status: 'refused',
    barcode: 'MED-ENOX-20MG', note: 'Parent declined injection; clinician informed',
  },
];

// ------------------------------------------------------- critical value loop

export type CriticalValueStatus = 'not-notified' | 'notified' | 'acknowledged';

export interface CriticalValue {
  id: string;
  source: 'lab' | 'imaging';
  patientUpid: string;
  patientName: string;
  test: string;
  value: string;
  referenceRange: string;
  status: CriticalValueStatus;
  notifiedTo?: string;
  notifiedAt?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export const mockCriticalValues: CriticalValue[] = [
  {
    id: 'CV-001', source: 'lab', patientUpid: 'UPID-9P1L6W8R', patientName: 'Emmanuel Nwosu',
    test: 'Potassium', value: '6.8 mEq/L', referenceRange: '3.5 – 5.1',
    status: 'notified', notifiedTo: 'Dr. Fatima Yusuf', notifiedAt: atToday(8, 42),
  },
  {
    id: 'CV-002', source: 'lab', patientUpid: 'UPID-2V5D9J4C', patientName: 'Grace Adekunle',
    test: 'INR', value: '4.9', referenceRange: '0.8 – 1.2',
    status: 'acknowledged', notifiedTo: 'Dr. Ngozi Eze', notifiedAt: atToday(7, 55),
    acknowledgedBy: 'Dr. Ngozi Eze', acknowledgedAt: atToday(8, 6),
  },
  {
    id: 'CV-003', source: 'imaging', patientUpid: 'UPID-W1X2Y3Z4', patientName: 'Amina Ibrahim',
    test: 'CT head — large MCA infarct', value: 'Acute infarct, 4.2 cm', referenceRange: 'No acute finding',
    status: 'acknowledged', notifiedTo: 'Dr. Michael Adebayo', notifiedAt: subDays(new Date(), 1).toISOString(),
    acknowledgedBy: 'Dr. Michael Adebayo', acknowledgedAt: subDays(new Date(), 1).toISOString(),
  },
  {
    id: 'CV-004', source: 'lab', patientUpid: 'UPID-2V5D9J4C', patientName: 'Grace Adekunle',
    test: 'Blood glucose', value: '1.9 mmol/L', referenceRange: '3.9 – 7.8',
    status: 'not-notified',
  },
  {
    id: 'CV-005', source: 'lab', patientUpid: 'UPID-6H1S8K3D', patientName: 'David Chukwu',
    test: 'Haemoglobin', value: '4.8 g/dL', referenceRange: '11.5 – 15.5',
    status: 'notified', notifiedTo: 'Dr. Ada Obi', notifiedAt: atToday(9, 12),
  },
];

// ---------------------------------------------------------- referral network

export type ReferralStatus = 'sent' | 'accepted' | 'declined' | 'scheduled' | 'completed';

export interface NetworkReferral {
  id: string;
  referralNumber: string;
  patientUpid: string;
  patientName: string;
  fromFacility: string;
  toFacility: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: ReferralStatus;
  requestedAt: string;
  appointmentAt?: string;
  declineReason?: string;
  fhirAttached: boolean;
}

export const mockNetworkReferrals: NetworkReferral[] = [
  {
    id: 'NR-001', referralNumber: 'REF-2026-0001', patientUpid: 'UPID-W1X2Y3Z4', patientName: 'Amina Ibrahim',
    fromFacility: 'Trika General Hospital', toFacility: 'Federal Medical Centre, Abuja',
    reason: 'Cardiology review for recurrent palpitations', urgency: 'urgent',
    status: 'sent', requestedAt: subDays(new Date(), 1).toISOString(), fhirAttached: true,
  },
  {
    id: 'NR-002', referralNumber: 'REF-2026-0002', patientUpid: 'UPID-9P1L6W8R', patientName: 'Emmanuel Nwosu',
    fromFacility: 'Trika General Hospital', toFacility: 'National Cardiac Centre',
    reason: 'Transfer for urgent PCI', urgency: 'emergency',
    status: 'accepted', requestedAt: subDays(new Date(), 2).toISOString(),
    appointmentAt: addDays(new Date(), 1).toISOString(), fhirAttached: true,
  },
  {
    id: 'NR-003', referralNumber: 'REF-2026-0003', patientUpid: 'UPID-2V5D9J4C', patientName: 'Grace Adekunle',
    fromFacility: 'Trika General Hospital', toFacility: 'Maternal & Child Hospital',
    reason: 'High-risk obstetric review', urgency: 'urgent',
    status: 'scheduled', requestedAt: subDays(new Date(), 4).toISOString(),
    appointmentAt: addDays(new Date(), 2).toISOString(), fhirAttached: false,
  },
  {
    id: 'NR-004', referralNumber: 'REF-2026-0004', patientUpid: 'UPID-6H1S8K3D', patientName: 'David Chukwu',
    fromFacility: 'Trika General Hospital', toFacility: 'Paediatric Teaching Hospital',
    reason: 'Complex seizure work-up', urgency: 'routine',
    status: 'declined', requestedAt: subDays(new Date(), 5).toISOString(),
    declineReason: 'No paediatric neurology capacity until next month', fhirAttached: true,
  },
  {
    id: 'NR-005', referralNumber: 'REF-2026-0005', patientUpid: 'UPID-8K4L2M7N', patientName: 'James Okonkwo',
    fromFacility: 'Trika General Hospital', toFacility: 'Garki Community Clinic',
    reason: 'Step-down follow-up after admission', urgency: 'routine',
    status: 'completed', requestedAt: subDays(new Date(), 12).toISOString(),
    appointmentAt: subDays(new Date(), 6).toISOString(), fhirAttached: true,
  },
  {
    id: 'NR-006', referralNumber: 'REF-2026-0101', patientUpid: 'UPID-5R8T3Y7U', patientName: 'Halima Sani',
    fromFacility: 'Garki Community Clinic', toFacility: 'Trika General Hospital',
    reason: 'Suspected pulmonary embolism — needs CT pulmonary angiogram', urgency: 'emergency',
    status: 'sent', requestedAt: atToday(7, 40), fhirAttached: true,
  },
  {
    id: 'NR-007', referralNumber: 'REF-2026-0102', patientUpid: 'UPID-1F6J9K2L', patientName: 'Ahmed Lawal',
    fromFacility: 'Wuse District Hospital', toFacility: 'Trika General Hospital',
    reason: 'Uncontrolled type 2 diabetes, needs specialist review', urgency: 'urgent',
    status: 'sent', requestedAt: subDays(new Date(), 1).toISOString(), fhirAttached: false,
  },
  {
    id: 'NR-008', referralNumber: 'REF-2026-0103', patientUpid: 'UPID-4W7X1Z5C', patientName: 'Blessing Eze',
    fromFacility: 'Maitama Medical Centre', toFacility: 'Trika General Hospital',
    reason: 'Second opinion on renal ultrasound findings', urgency: 'routine',
    status: 'accepted', requestedAt: subDays(new Date(), 2).toISOString(),
    appointmentAt: addDays(new Date(), 2).toISOString(), fhirAttached: true,
  },
];

function atToday(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}
