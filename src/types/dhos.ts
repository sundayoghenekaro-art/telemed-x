// DHOS Core Types

export type UserRole = 
  | 'admin'
  | 'physician'
  | 'nurse'
  | 'pharmacist'
  | 'radiologist'
  | 'lab_technician'
  | 'receptionist'
  | 'billing'
  | 'patient';

export type PatientStatus = 'stable' | 'monitoring' | 'critical' | 'discharged';

export type EncounterType = 'outpatient' | 'inpatient' | 'emergency' | 'telehealth';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
  avatar?: string;
  email: string;
}

export interface Patient {
  upid: string; // Unique Patient ID (derived from NIN, never expose NIN)
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies: string[];
  status: PatientStatus;
  wardLocation?: string;
  bedNumber?: string;
  primaryPhysician?: string;
  admissionDate?: string;
  lastVisit?: string;
  photo?: string;
}

export interface Encounter {
  id: string;
  patientUpid: string;
  type: EncounterType;
  status: 'in-progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  chiefComplaint?: string;
  diagnosis?: string[];
  attendingPhysician: string;
  department: string;
}

export interface VitalSigns {
  timestamp: string;
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  painLevel?: number;
}

export interface LabOrder {
  id: string;
  patientUpid: string;
  orderedBy: string;
  tests: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  orderedAt: string;
  completedAt?: string;
  results?: LabResult[];
}

export interface LabResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag?: 'normal' | 'high' | 'low' | 'critical';
}

export type SampleStatus = 
  | 'collected'
  | 'in-transit'
  | 'received'
  | 'processing'
  | 'analyzed'
  | 'validated'
  | 'reported';

export interface LabSample {
  id: string;
  orderId: string;
  patientUpid: string;
  patientName: string;
  sampleType: 'blood' | 'urine' | 'stool' | 'swab' | 'tissue' | 'csf' | 'other';
  collectedAt: string;
  collectedBy: string;
  status: SampleStatus;
  location: string;
  barcode: string;
  notes?: string;
  temperature?: number;
  receivedAt?: string;
  processedAt?: string;
  analyzedAt?: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface LabTest {
  code: string;
  name: string;
  category: string;
  sampleType: LabSample['sampleType'];
  turnaroundTime: number; // hours
  price: number;
}

export type AnalyzerStatus = 'online' | 'offline' | 'maintenance' | 'error' | 'calibrating';

export interface LabAnalyzer {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: AnalyzerStatus;
  supportedTests: string[]; // test codes
  lastCalibration: string;
  nextCalibration: string;
  samplesProcessed: number;
  currentQueue: number;
  avgProcessingTime: number; // minutes
  errorRate: number; // percentage
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  status: 'active' | 'completed' | 'discontinued';
}

export type PrescriptionStatus = 'pending' | 'verified' | 'dispensed' | 'partially-dispensed' | 'cancelled' | 'on-hold';

export interface Prescription {
  id: string;
  patientUpid: string;
  patientName: string;
  prescribedBy: string;
  prescribedAt: string;
  status: PrescriptionStatus;
  priority: 'routine' | 'urgent' | 'stat';
  items: PrescriptionItem[];
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  dispensedBy?: string;
  dispensedAt?: string;
}

export interface PrescriptionItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: 'oral' | 'iv' | 'im' | 'sc' | 'topical' | 'inhalation' | 'rectal' | 'ophthalmic';
  duration: string;
  quantity: number;
  dispensedQuantity?: number;
  instructions?: string;
  interactions?: DrugInteraction[];
}

export interface DrugInteraction {
  drug: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
}

export interface PharmacyInventoryItem {
  id: string;
  name: string;
  genericName: string;
  category: 'tablet' | 'capsule' | 'injection' | 'syrup' | 'cream' | 'inhaler' | 'drops' | 'infusion';
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  location: string;
  controlled: boolean;
  requiresColdChain: boolean;
}

export interface Appointment {
  id: string;
  patientUpid: string;
  patientName: string;
  physician: string;
  department: string;
  scheduledTime: string;
  duration: number; // minutes
  type: 'new' | 'follow-up' | 'procedure' | 'consultation';
  status: 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'no-show' | 'cancelled';
  notes?: string;
  seriesId?: string; // Links recurring appointments together
}

export interface BedOccupancy {
  wardId: string;
  wardName: string;
  totalBeds: number;
  occupiedBeds: number;
  reservedBeds: number;
  availableBeds: number;
}

export interface DashboardStats {
  totalPatients: number;
  inpatients: number;
  outpatientsToday: number;
  emergencies: number;
  criticalPatients: number;
  pendingDischarges: number;
  bedOccupancyRate: number;
  avgWaitTime: number; // minutes
}

export interface Notification {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  roles: UserRole[];
  badge?: number;
  status?: 'active' | 'maintenance' | 'offline';
}

// Radiology Types

export type RadiologyModality = 'CR' | 'CT' | 'MR' | 'US' | 'XA' | 'NM' | 'PT' | 'MG' | 'DX' | 'RF';

export type RadiologyStudyStatus = 'scheduled' | 'in-progress' | 'completed' | 'reported' | 'verified' | 'cancelled';

export type RadiologyPriority = 'routine' | 'urgent' | 'stat' | 'asap';

export interface RadiologyOrder {
  id: string;
  patientUpid: string;
  patientName: string;
  orderedBy: string;
  orderedAt: string;
  modality: RadiologyModality;
  bodyPart: string;
  clinicalIndication: string;
  priority: RadiologyPriority;
  status: RadiologyStudyStatus;
  scheduledAt?: string;
  studyInstanceUid?: string;
  accessionNumber: string;
  assignedRadiologist?: string;
  notes?: string;
}

export interface RadiologyStudy {
  id: string;
  orderId: string;
  patientUpid: string;
  patientName: string;
  modality: RadiologyModality;
  bodyPart: string;
  studyDate: string;
  studyInstanceUid: string;
  accessionNumber: string;
  seriesCount: number;
  imageCount: number;
  status: RadiologyStudyStatus;
  assignedRadiologist?: string;
  reportedAt?: string;
  verifiedAt?: string;
}

export interface RadiologyReport {
  id: string;
  studyId: string;
  orderId: string;
  patientUpid: string;
  patientName: string;
  modality: RadiologyModality;
  bodyPart: string;
  findings: string;
  impression: string;
  technique?: string;
  comparison?: string;
  radiologist: string;
  createdAt: string;
  status: 'draft' | 'preliminary' | 'final' | 'amended';
  verifiedBy?: string;
  verifiedAt?: string;
  critical?: boolean;
}
