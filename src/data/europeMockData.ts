// Mock data for the European capability slices (terminology, IPS, e-Rx,
// entitlement, case-mix, waiting lists, registries, governance, identity,
// medicines safety, emergency care, maternity/screening).
// Everything here is demo configuration; nothing is persisted.

// ------------------------------------------------------------------ terminology

export type CodeSystem = 'ICD-10' | 'SNOMED CT' | 'LOINC' | 'ATC';

export interface TerminologyEntry {
  code: string;
  display: string;
  system: CodeSystem;
  chapter: string;
}

export const terminologyEntries: TerminologyEntry[] = [
  { code: 'I10', display: 'Essential (primary) hypertension', system: 'ICD-10', chapter: 'Circulatory' },
  { code: 'E11.9', display: 'Type 2 diabetes mellitus without complications', system: 'ICD-10', chapter: 'Endocrine' },
  { code: 'J45.9', display: 'Asthma, unspecified', system: 'ICD-10', chapter: 'Respiratory' },
  { code: 'N18.3', display: 'Chronic kidney disease, stage 3', system: 'ICD-10', chapter: 'Genitourinary' },
  { code: 'I48.91', display: 'Unspecified atrial fibrillation', system: 'ICD-10', chapter: 'Circulatory' },
  { code: 'K35.80', display: 'Unspecified acute appendicitis', system: 'ICD-10', chapter: 'Digestive' },
  { code: 'C50.9', display: 'Malignant neoplasm of breast, unspecified', system: 'ICD-10', chapter: 'Neoplasms' },
  { code: 'O80', display: 'Single spontaneous delivery', system: 'ICD-10', chapter: 'Pregnancy' },
  { code: 'F32.9', display: 'Major depressive disorder, single episode', system: 'ICD-10', chapter: 'Mental' },
  { code: 'A09', display: 'Infectious gastroenteritis and colitis', system: 'ICD-10', chapter: 'Infectious' },
  { code: '38341003', display: 'Hypertensive disorder, systemic arterial', system: 'SNOMED CT', chapter: 'Circulatory' },
  { code: '44054006', display: 'Diabetes mellitus type 2', system: 'SNOMED CT', chapter: 'Endocrine' },
  { code: '195967001', display: 'Asthma', system: 'SNOMED CT', chapter: 'Respiratory' },
  { code: '431855005', display: 'Chronic kidney disease stage 3', system: 'SNOMED CT', chapter: 'Genitourinary' },
  { code: '49436004', display: 'Atrial fibrillation', system: 'SNOMED CT', chapter: 'Circulatory' },
  { code: '74400008', display: 'Appendicitis', system: 'SNOMED CT', chapter: 'Digestive' },
  { code: '254837009', display: 'Malignant neoplasm of breast', system: 'SNOMED CT', chapter: 'Neoplasms' },
  { code: '289700002', display: 'Normal delivery', system: 'SNOMED CT', chapter: 'Pregnancy' },
  { code: '35489007', display: 'Depressive disorder', system: 'SNOMED CT', chapter: 'Mental' },
  { code: '8867-4', display: 'Heart rate', system: 'LOINC', chapter: 'Vital signs' },
  { code: '2339-0', display: 'Glucose [Mass/volume] in Blood', system: 'LOINC', chapter: 'Chemistry' },
  { code: '2160-0', display: 'Creatinine [Mass/volume] in Serum or Plasma', system: 'LOINC', chapter: 'Chemistry' },
  { code: '2823-3', display: 'Potassium [Moles/volume] in Serum or Plasma', system: 'LOINC', chapter: 'Chemistry' },
  { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood', system: 'LOINC', chapter: 'Haematology' },
  { code: '6690-2', display: 'Leukocytes [#/volume] in Blood', system: 'LOINC', chapter: 'Haematology' },
  { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood', system: 'LOINC', chapter: 'Chemistry' },
  { code: '1988-5', display: 'C reactive protein [Mass/volume] in Serum or Plasma', system: 'LOINC', chapter: 'Chemistry' },
  { code: '33762-6', display: 'Natriuretic peptide.B prohormone N-Terminal', system: 'LOINC', chapter: 'Chemistry' },
  { code: 'C09AA02', display: 'Enalapril', system: 'ATC', chapter: 'Cardiovascular' },
  { code: 'A10BA02', display: 'Metformin', system: 'ATC', chapter: 'Alimentary / metabolism' },
  { code: 'R03AC02', display: 'Salbutamol', system: 'ATC', chapter: 'Respiratory' },
  { code: 'C10AA05', display: 'Atorvastatin', system: 'ATC', chapter: 'Cardiovascular' },
  { code: 'B01AC06', display: 'Acetylsalicylic acid', system: 'ATC', chapter: 'Blood' },
  { code: 'J01CA04', display: 'Amoxicillin', system: 'ATC', chapter: 'Anti-infectives' },
  { code: 'N02BE01', display: 'Paracetamol', system: 'ATC', chapter: 'Nervous system' },
  { code: 'A11CC05', display: 'Colecalciferol', system: 'ATC', chapter: 'Alimentary / metabolism' },
];

// --------------------------------------------------------------- patient summary

export interface PatientSummary {
  id: string;
  patientName: string;
  upid: string;
  dateOfBirth: string;
  generatedAt: string;
  sections: { title: string; items: string[] }[];
}

export const mockPatientSummaries: PatientSummary[] = [
  {
    id: 'IPS-001',
    patientName: 'Ada Nwankwo',
    upid: 'UPID-2V5D9J4C',
    dateOfBirth: '1990-04-12',
    generatedAt: '2026-11-01T08:20:00Z',
    sections: [
      { title: 'Problems', items: ['I10 Essential hypertension (2019)', 'E11.9 Type 2 diabetes (2021)', 'J45.9 Asthma (2014)'] },
      { title: 'Medications', items: ['Enalapril 10 mg once daily', 'Metformin 1 g twice daily', 'Salbutamol inhaler as needed'] },
      { title: 'Allergies', items: ['Penicillin — rash (moderate)'] },
      { title: 'Immunisations', items: ['Influenza 2026-10-30', 'COVID-19 booster 2026-07-06', 'Tetanus booster 2021-09-22'] },
      { title: 'Results', items: ['HbA1c 8.4 % (2026-07-29)', 'BP 128/82 mmHg (2026-10-02)', 'Creatinine 92 umol/L (2026-09-14)'] },
      { title: 'Care plan', items: ['Diabetes review due 2026-11-27', 'Hypertension review due 2026-12-31'] },
    ],
  },
  {
    id: 'IPS-002',
    patientName: 'Emmanuel Nwosu',
    upid: 'UPID-9P1L6W8R',
    dateOfBirth: '1957-11-03',
    generatedAt: '2026-11-01T07:55:00Z',
    sections: [
      { title: 'Problems', items: ['N18.3 Chronic kidney disease stage 3', 'I48.91 Atrial fibrillation', 'I10 Essential hypertension'] },
      { title: 'Medications', items: ['Apixaban 5 mg twice daily', 'Bisoprolol 2.5 mg daily', 'Furosemide 40 mg daily'] },
      { title: 'Allergies', items: ['No known drug allergies'] },
      { title: 'Immunisations', items: ['Influenza 2026-10-28', 'Pneumococcal 2024-03-11'] },
      { title: 'Results', items: ['Potassium 6.8 mEq/L (2026-11-01, critical)', 'eGFR 38 mL/min (2026-10-20)'] },
      { title: 'Care plan', items: ['Nephrology review 2026-11-15', 'Fluid balance monitoring'] },
    ],
  },
  {
    id: 'IPS-003',
    patientName: 'Fatima Bello',
    upid: 'UPID-4F7K2M9Q',
    dateOfBirth: '1985-02-19',
    generatedAt: '2026-10-31T16:05:00Z',
    sections: [
      { title: 'Problems', items: ['O80 Single spontaneous delivery (2026-10-24)', 'F32.9 Postnatal low mood'] },
      { title: 'Medications', items: ['Ferrous sulfate 200 mg daily', 'Paracetamol 1 g as needed'] },
      { title: 'Allergies', items: ['No known drug allergies'] },
      { title: 'Immunisations', items: ['Tdap in pregnancy 2026-05-02'] },
      { title: 'Results', items: ['Haemoglobin 10.4 g/dL (2026-10-26)'] },
      { title: 'Care plan', items: ['Postnatal check 2026-11-07', 'Screening recall: cervical 2027-03'] },
    ],
  },
];

export interface TransferDocument {
  id: string;
  type: 'ips' | 'discharge' | 'referral';
  patientName: string;
  facility: string;
  createdAt: string;
  status: 'draft' | 'final';
  sections: number;
}

export const mockTransferDocuments: TransferDocument[] = [
  { id: 'DOC-2026-0142', type: 'ips', patientName: 'Ada Nwankwo', facility: 'Trika General Hospital', createdAt: '2026-11-01T08:20:00Z', status: 'final', sections: 6 },
  { id: 'DOC-2026-0141', type: 'discharge', patientName: 'Emmanuel Nwosu', facility: 'Trika General Hospital', createdAt: '2026-10-31T15:10:00Z', status: 'final', sections: 5 },
  { id: 'DOC-2026-0140', type: 'referral', patientName: 'David Chukwu', facility: 'Trika General Hospital', createdAt: '2026-10-31T11:45:00Z', status: 'draft', sections: 4 },
];

// ------------------------------------------------------------- ePrescription

export interface DispenseRecord {
  pharmacy: string;
  dispensedAt: string;
  product: string;
  price: number;
}

export interface Eprescription {
  id: string;
  nationalId: string;
  patientName: string;
  medication: string;
  atcCode: string;
  dose: string;
  quantity: number;
  status: 'issued' | 'submitted' | 'dispensed' | 'cancelled';
  prescribedBy: string;
  issuedAt: string;
  substitutionAllowed: boolean;
  referencePrice: number;
  brandPrice: number;
  dispense?: DispenseRecord;
}

export const mockEprescriptions: Eprescription[] = [
  { id: 'ERX-1001', nationalId: 'DE-2F8K-4471-22', patientName: 'Amina Ibrahim', medication: 'Enalapril 10 mg tablets', atcCode: 'C09AA02', dose: '1 tablet once daily', quantity: 28, status: 'dispensed', prescribedBy: 'Dr. Sarah Chen', issuedAt: '2026-10-30T09:12:00Z', substitutionAllowed: true, referencePrice: 8.4, brandPrice: 12.9, dispense: { pharmacy: 'Apotheke am Markt', dispensedAt: '2026-10-30T17:40:00Z', product: 'Enalapril-ratiopharm 10 mg', price: 8.4 } },
  { id: 'ERX-1002', nationalId: 'DE-2F8K-4471-23', patientName: 'Chidi Okonkwo', medication: 'Metformin 1 g tablets', atcCode: 'A10BA02', dose: '1 tablet twice daily', quantity: 56, status: 'submitted', prescribedBy: 'Dr. Sarah Chen', issuedAt: '2026-11-01T07:20:00Z', substitutionAllowed: true, referencePrice: 6.2, brandPrice: 11.5 },
  { id: 'ERX-1003', nationalId: 'DE-2F8K-4471-24', patientName: 'Grace Adekunle', medication: 'Salbutamol 100 mcg inhaler', atcCode: 'R03AC02', dose: '2 puffs as needed', quantity: 1, status: 'issued', prescribedBy: 'Dr. Ada Obi', issuedAt: '2026-11-01T08:05:00Z', substitutionAllowed: false, referencePrice: 14.8, brandPrice: 19.9 },
  { id: 'ERX-1004', nationalId: 'DE-2F8K-4471-25', patientName: 'David Chukwu', medication: 'Amoxicillin 500 mg capsules', atcCode: 'J01CA04', dose: '1 capsule three times daily', quantity: 21, status: 'issued', prescribedBy: 'Dr. Ada Obi', issuedAt: '2026-11-01T08:32:00Z', substitutionAllowed: true, referencePrice: 5.6, brandPrice: 9.8 },
  { id: 'ERX-1005', nationalId: 'DE-2F8K-4471-26', patientName: 'Ngozi Adeyemi', medication: 'Atorvastatin 20 mg tablets', atcCode: 'C10AA05', dose: '1 tablet at night', quantity: 30, status: 'cancelled', prescribedBy: 'Dr. Sarah Chen', issuedAt: '2026-10-29T13:15:00Z', substitutionAllowed: true, referencePrice: 4.9, brandPrice: 13.2 },
];

// ----------------------------------------------------------------- entitlement

export interface Entitlement {
  id: string;
  patientName: string;
  scheme: string;
  country: string;
  memberId: string;
  status: 'active' | 'pending' | 'suspended';
  exemption: 'none' | 'chronic' | 'low-income' | 'maternity';
  coPayPercent: number;
  deductibleUsed: number;
  deductibleTotal: number;
  ehicValidUntil: string | null;
  s1Issued: boolean;
}

export const mockEntitlements: Entitlement[] = [
  { id: 'ENT-001', patientName: 'Amina Ibrahim', scheme: 'AOK Bayern (GKV)', country: 'DE', memberId: 'A123456789', status: 'active', exemption: 'chronic', coPayPercent: 0, deductibleUsed: 0, deductibleTotal: 0, ehicValidUntil: '2027-12-31', s1Issued: false },
  { id: 'ENT-002', patientName: 'Chidi Okonkwo', scheme: 'Techniker Krankenkasse', country: 'DE', memberId: 'T987654321', status: 'active', exemption: 'none', coPayPercent: 10, deductibleUsed: 120, deductibleTotal: 300, ehicValidUntil: '2027-06-30', s1Issued: false },
  { id: 'ENT-003', patientName: 'Fatima Bello', scheme: 'CNAM (Assurance Maladie)', country: 'FR', memberId: '285027512345678', status: 'active', exemption: 'maternity', coPayPercent: 0, deductibleUsed: 0, deductibleTotal: 0, ehicValidUntil: null, s1Issued: true },
  { id: 'ENT-004', patientName: 'Emeka Nwosu', scheme: 'Zilveren Kruis', country: 'NL', memberId: 'NL-8842-1190', status: 'pending', exemption: 'none', coPayPercent: 25, deductibleUsed: 385, deductibleTotal: 385, ehicValidUntil: '2026-12-31', s1Issued: false },
];

export interface BenefitRule {
  code: string;
  label: string;
  category: string;
  coverage: 'covered' | 'restricted' | 'not-covered';
  coPay: number;
  note: string;
}

export const mockBenefitRules: BenefitRule[] = [
  { code: 'CONS-SPEC', label: 'Specialist consultation', category: 'Consultation', coverage: 'covered', coPay: 0, note: 'Referral required for GKV unless chronic programme' },
  { code: 'IMG-CT', label: 'CT imaging', category: 'Imaging', coverage: 'covered', coPay: 0, note: 'Justification required' },
  { code: 'LAB-PANEL', label: 'Laboratory panel', category: 'Laboratory', coverage: 'covered', coPay: 0, note: 'LOINC-coded order' },
  { code: 'PHYSIO-12', label: 'Physiotherapy (12 sessions)', category: 'Allied health', coverage: 'restricted', coPay: 10, note: 'Prior authorisation after 6 sessions' },
  { code: 'DENT-CROWN', label: 'Dental crown', category: 'Dental', coverage: 'restricted', coPay: 35, note: 'Bonus booklet reduces co-payment' },
  { code: 'OPHT-GLASS', label: 'Corrective lenses (adult)', category: 'Optical', coverage: 'not-covered', coPay: 100, note: 'Covered for children and high refractive error' },
  { code: 'REHAB-3W', label: 'Inpatient rehabilitation (3 weeks)', category: 'Rehabilitation', coverage: 'restricted', coPay: 10, note: 'Pension insurer approval required' },
  { code: 'MAT-ANTENATAL', label: 'Antenatal care package', category: 'Maternity', coverage: 'covered', coPay: 0, note: 'Midwife-led pathway' },
  { code: 'SCREEN-COLON', label: 'Colorectal screening colonoscopy', category: 'Screening', coverage: 'covered', coPay: 0, note: 'Age 50–74, every 10 years' },
  { code: 'COSMETIC', label: 'Cosmetic procedure', category: 'Elective', coverage: 'not-covered', coPay: 100, note: 'Medical necessity review required' },
];

export interface PriorAuthorisation {
  id: string;
  patientName: string;
  service: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'declined';
  reference?: string;
  clinician: string;
}

export const mockPriorAuthorisations: PriorAuthorisation[] = [
  { id: 'PA-2026-0091', patientName: 'Chidi Okonkwo', service: 'Inpatient rehabilitation (3 weeks)', requestedAt: '2026-10-30T10:10:00Z', status: 'pending', clinician: 'Dr. Sarah Chen' },
  { id: 'PA-2026-0090', patientName: 'Amina Ibrahim', service: 'Physiotherapy extension (sessions 7–12)', requestedAt: '2026-10-28T14:35:00Z', status: 'approved', reference: 'TK-4471-AP', clinician: 'Dr. Ada Obi' },
  { id: 'PA-2026-0089', patientName: 'Emeka Nwosu', service: 'MRI lumbar spine', requestedAt: '2026-10-27T09:05:00Z', status: 'declined', reference: 'ZK-9982-DN', clinician: 'Dr. Michael Adebayo' },
];

// -------------------------------------------------------------------- case-mix

export interface InpatientCase {
  id: string;
  patientName: string;
  admitted: string;
  discharged: string | null;
  primaryDiagnosis: string;
  icdCode: string;
  procedure: string;
  opsCode: string;
  drg: string;
  drgLabel: string;
  weight: number;
  baseRate: number;
  insurer: string;
  status: 'coded' | 'grouped' | 'claimed';
}

export const mockInpatientCases: InpatientCase[] = [
  { id: 'CASE-2026-0412', patientName: 'Emmanuel Nwosu', admitted: '2026-10-24', discharged: '2026-10-31', primaryDiagnosis: 'Chronic kidney disease stage 3', icdCode: 'N18.3', procedure: 'Haemodialysis, 3 sessions', opsCode: '8-853.3', drg: 'L71Z', drgLabel: 'Renal replacement, short stay', weight: 1.284, baseRate: 3980, insurer: 'AOK Bayern', status: 'grouped' },
  { id: 'CASE-2026-0411', patientName: 'Fatima Bello', admitted: '2026-10-22', discharged: '2026-10-26', primaryDiagnosis: 'Single spontaneous delivery', icdCode: 'O80', procedure: 'Spontaneous vertex delivery', opsCode: '9-260', drg: 'O60D', drgLabel: 'Vaginal delivery, no complicating procedure', weight: 0.712, baseRate: 3980, insurer: 'CNAM', status: 'claimed' },
  { id: 'CASE-2026-0410', patientName: 'David Chukwu', admitted: '2026-10-29', discharged: '2026-11-01', primaryDiagnosis: 'Unspecified acute appendicitis', icdCode: 'K35.80', procedure: 'Laparoscopic appendectomy', opsCode: '5-470.10', drg: 'G23B', drgLabel: 'Appendectomy, laparoscopic', weight: 0.864, baseRate: 3980, insurer: 'Techniker Krankenkasse', status: 'coded' },
  { id: 'CASE-2026-0409', patientName: 'Emeka Nwosu', admitted: '2026-10-18', discharged: '2026-10-27', primaryDiagnosis: 'Unspecified atrial fibrillation', icdCode: 'I48.91', procedure: 'Electrical cardioversion', opsCode: '8-640.0', drg: 'F21Z', drgLabel: 'Arrhythmia, cardioversion', weight: 1.106, baseRate: 3980, insurer: 'Zilveren Kruis', status: 'grouped' },
  { id: 'CASE-2026-0408', patientName: 'Amina Ibrahim', admitted: '2026-10-12', discharged: '2026-10-19', primaryDiagnosis: 'Malignant neoplasm of breast', icdCode: 'C50.9', procedure: 'Breast-conserving surgery', opsCode: '5-870.0', drg: 'J24B', drgLabel: 'Breast procedure, intermediate', weight: 1.342, baseRate: 3980, insurer: 'AOK Bayern', status: 'claimed' },
  { id: 'CASE-2026-0407', patientName: 'Grace Adekunle', admitted: '2026-10-05', discharged: '2026-10-11', primaryDiagnosis: 'Asthma, unspecified', icdCode: 'J45.9', procedure: 'Non-invasive ventilation, 2 days', opsCode: '8-716.10', drg: 'E71B', drgLabel: 'COPD / asthma, severe', weight: 0.948, baseRate: 3980, insurer: 'Barmer', status: 'coded' },
];

// ---------------------------------------------------------------- waiting list

export interface WaitingEntry {
  id: string;
  patientName: string;
  service: string;
  specialty: string;
  priority: 'routine' | 'urgent' | 'two-week';
  referralDate: string;
  targetWeeks: number;
  status: 'waiting' | 'offered' | 'booked' | 'removed';
  dnaRisk: 'low' | 'medium' | 'high';
  offeredSlot?: string;
}

export const mockWaitingList: WaitingEntry[] = [
  { id: 'WL-3001', patientName: 'Chidi Okonkwo', service: 'Cardiology outpatient review', specialty: 'Cardiology', priority: 'urgent', referralDate: '2026-10-06', targetWeeks: 4, status: 'waiting', dnaRisk: 'medium' },
  { id: 'WL-3002', patientName: 'Ngozi Adeyemi', service: 'Suspected breast cancer clinic', specialty: 'Oncology', priority: 'two-week', referralDate: '2026-10-24', targetWeeks: 2, status: 'waiting', dnaRisk: 'low' },
  { id: 'WL-3003', patientName: 'Grace Adekunle', service: 'Respiratory follow-up', specialty: 'Respiratory', priority: 'routine', referralDate: '2026-07-02', targetWeeks: 18, status: 'waiting', dnaRisk: 'high' },
  { id: 'WL-3004', patientName: 'David Chukwu', service: 'Paediatric allergy assessment', specialty: 'Paediatrics', priority: 'routine', referralDate: '2026-09-14', targetWeeks: 18, status: 'offered', dnaRisk: 'low', offeredSlot: '2026-11-09T09:30:00' },
  { id: 'WL-3005', patientName: 'Emeka Nwosu', service: 'Nephrology review', specialty: 'Nephrology', priority: 'urgent', referralDate: '2026-10-18', targetWeeks: 4, status: 'booked', dnaRisk: 'low', offeredSlot: '2026-11-03T11:00:00' },
  { id: 'WL-3006', patientName: 'Fatima Bello', service: 'Postnatal mental health', specialty: 'Perinatal', priority: 'urgent', referralDate: '2026-10-27', targetWeeks: 4, status: 'waiting', dnaRisk: 'medium' },
  { id: 'WL-3007', patientName: 'Amina Ibrahim', service: 'Dermatology lesion check', specialty: 'Dermatology', priority: 'routine', referralDate: '2026-01-12', targetWeeks: 18, status: 'waiting', dnaRisk: 'high' },
];

// ------------------------------------------------------------ statutory returns

export interface NotifiableDisease {
  id: string;
  disease: string;
  patientRef: string;
  onset: string;
  reportedAt: string | null;
  status: 'pending' | 'reported';
  jurisdiction: string;
}

export const mockNotifiableDiseases: NotifiableDisease[] = [
  { id: 'ND-501', disease: 'Measles', patientRef: 'P-8841 (child, 4y)', onset: '2026-10-29', reportedAt: null, status: 'pending', jurisdiction: 'DE-BY' },
  { id: 'ND-502', disease: 'Tuberculosis, pulmonary', patientRef: 'P-2210', onset: '2026-10-25', reportedAt: '2026-10-26T08:40:00Z', status: 'reported', jurisdiction: 'DE-BY' },
  { id: 'ND-503', disease: 'Hepatitis A', patientRef: 'P-5571', onset: '2026-10-20', reportedAt: '2026-10-21T13:10:00Z', status: 'reported', jurisdiction: 'FR-IDF' },
  { id: 'ND-504', disease: 'Salmonellosis', patientRef: 'P-6612', onset: '2026-10-31', reportedAt: null, status: 'pending', jurisdiction: 'DE-BY' },
  { id: 'ND-505', disease: 'Influenza A (H3N2)', patientRef: 'P-1229', onset: '2026-10-27', reportedAt: '2026-10-28T09:05:00Z', status: 'reported', jurisdiction: 'NL-NH' },
];

export const mockImmunisationCoverage = [
  { vaccine: 'Measles–mumps–rubella (2 doses)', eligible: 1240, dosesGiven: 1158, coverage: 93.4, target: 95 },
  { vaccine: 'Diphtheria–tetanus–pertussis (booster)', eligible: 980, dosesGiven: 872, coverage: 89.0, target: 95 },
  { vaccine: 'HPV (2 doses, 12–13y)', eligible: 615, dosesGiven: 558, coverage: 90.7, target: 90 },
  { vaccine: 'Influenza (65+, 2026 season)', eligible: 3180, dosesGiven: 2214, coverage: 69.6, target: 75 },
  { vaccine: 'Pneumococcal (65+)', eligible: 3180, dosesGiven: 2478, coverage: 77.9, target: 75 },
];

export const mockScreeningUptake = [
  { programme: 'Cervical screening (25–64)', invited: 4120, attended: 2708, uptake: 65.7, target: 70 },
  { programme: 'Breast screening (50–69)', invited: 2860, attended: 2184, uptake: 76.4, target: 75 },
  { programme: 'Colorectal screening (50–74)', invited: 5210, attended: 2918, uptake: 56.0, target: 65 },
];

export const mockWaitingTimeReturn = [
  { specialty: 'Cardiology', withinTarget: 118, total: 132, pct: 89.4, target: 92 },
  { specialty: 'Oncology (two-week)', withinTarget: 64, total: 66, pct: 97.0, target: 93 },
  { specialty: 'Orthopaedics', withinTarget: 84, total: 121, pct: 69.4, target: 92 },
  { specialty: 'Dermatology', withinTarget: 96, total: 140, pct: 68.6, target: 92 },
  { specialty: 'Nephrology', withinTarget: 57, total: 61, pct: 93.4, target: 92 },
];

// ------------------------------------------------------------------ governance

export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'portability' | 'erasure' | 'rectification' | 'restriction';
  patientName: string;
  receivedAt: string;
  dueAt: string;
  status: 'received' | 'in-progress' | 'completed' | 'overdue';
  assignee: string;
}

export const mockDataSubjectRequests: DataSubjectRequest[] = [
  { id: 'DSR-2026-0044', type: 'access', patientName: 'Ada Nwankwo', receivedAt: '2026-10-28', dueAt: '2026-11-27', status: 'in-progress', assignee: 'DPO office' },
  { id: 'DSR-2026-0043', type: 'portability', patientName: 'Chidi Okonkwo', receivedAt: '2026-10-24', dueAt: '2026-11-23', status: 'received', assignee: 'DPO office' },
  { id: 'DSR-2026-0042', type: 'rectification', patientName: 'Grace Adekunle', receivedAt: '2026-10-11', dueAt: '2026-11-10', status: 'completed', assignee: 'Records team' },
  { id: 'DSR-2026-0041', type: 'erasure', patientName: 'Emeka Nwosu', receivedAt: '2026-09-02', dueAt: '2026-10-02', status: 'overdue', assignee: 'Legal' },
];

export const mockRopaEntries = [
  { id: 'ROPA-01', purpose: 'Direct care delivery', lawfulBasis: 'Art. 6(1)(c) + Art. 9(2)(h)', data: 'Identity, clinical, imaging, prescriptions', retention: '7 years after last visit', recipients: 'Treating clinicians, referrers, laboratories' },
  { id: 'ROPA-02', purpose: 'Statutory insurance billing', lawfulBasis: 'Art. 6(1)(c)', data: 'Identity, services, DRG codes, tariffs', retention: '7 years', recipients: 'Statutory insurers, tax authority' },
  { id: 'ROPA-03', purpose: 'Notifiable disease reporting', lawfulBasis: 'Art. 9(2)(i) public health', data: 'Identity, diagnosis, onset', retention: 'As required by health authority', recipients: 'Public health authority' },
  { id: 'ROPA-04', purpose: 'Telemedicine service', lawfulBasis: 'Art. 6(1)(b) + consent', data: 'Identity, session video, chat, prescriptions', retention: 'Recordings 90 days, transcripts 2 years', recipients: 'Treating clinician, patient' },
  { id: 'ROPA-05', purpose: 'Secondary research use', lawfulBasis: 'HDAB permit (EHDS Art. 46)', data: 'Pseudonymised clinical data', retention: 'Permit term', recipients: 'Approved research entity' },
];

export const mockDpiaEntries = [
  { id: 'DPIA-01', processing: 'Telemedicine video consultations', risk: 'High', status: 'approved', reviewed: '2026-08-14' },
  { id: 'DPIA-02', processing: 'Secondary use data export', risk: 'High', status: 'in review', reviewed: '2026-10-20' },
  { id: 'DPIA-03', processing: 'Patient portal family accounts', risk: 'Medium', status: 'approved', reviewed: '2026-09-30' },
];

export const mockSecondaryUsePermits = [
  { id: 'HDAB-2026-11', applicant: 'University Hospital Munich', purpose: 'Cohort study: CKD progression', dataset: 'Pseudonymised inpatient episodes 2022–2025', status: 'approved', validUntil: '2027-06-30' },
  { id: 'HDAB-2026-14', applicant: 'National Cancer Institute', purpose: 'Breast cancer pathway benchmarking', dataset: 'Oncology encounters, de-identified', status: 'pending', validUntil: '—' },
  { id: 'HDAB-2026-09', applicant: 'Health Economics Consortium', purpose: 'DRG cost analysis', dataset: 'Case-mix and cost data, aggregated', status: 'declined', validUntil: '—' },
];

// ---------------------------------------------------------------------- identity

export interface IdpProvider {
  id: string;
  name: string;
  country: string;
  protocol: string;
  status: 'connected' | 'configured' | 'not-configured';
  lastSync: string | null;
}

export const mockIdpProviders: IdpProvider[] = [
  { id: 'itsme', name: 'itsme®', country: 'BE', protocol: 'OpenID Connect', status: 'connected', lastSync: '2026-11-01T06:10:00Z' },
  { id: 'bankid', name: 'BankID', country: 'NO / SE', protocol: 'OpenID Connect', status: 'connected', lastSync: '2026-11-01T05:42:00Z' },
  { id: 'bundid', name: 'BundID', country: 'DE', protocol: 'SAML 2.0', status: 'configured', lastSync: null },
  { id: 'eidas', name: 'eIDAS node (cross-border)', country: 'EU', protocol: 'SAML 2.0', status: 'configured', lastSync: null },
  { id: 'nhslogin', name: 'NHS login', country: 'UK', protocol: 'OpenID Connect', status: 'not-configured', lastSync: null },
];

export const mockMfaPolicy = [
  { role: 'Administrator', method: 'Passkey or TOTP', enforcement: 'required' as const },
  { role: 'Physician', method: 'Passkey or TOTP', enforcement: 'required' as const },
  { role: 'Nurse', method: 'TOTP', enforcement: 'required' as const },
  { role: 'Pharmacist', method: 'TOTP', enforcement: 'required' as const },
  { role: 'Receptionist', method: 'TOTP', enforcement: 'optional' as const },
];

export const accessibilityChecklist = [
  { item: 'Keyboard-only navigation for all clinical actions', status: 'pass' },
  { item: 'Focus visible on every interactive element', status: 'pass' },
  { item: 'Contrast 4.5:1 for body text', status: 'pass' },
  { item: 'Resizable text to 200% without loss of content', status: 'partial' },
  { item: 'Screen-reader labels for icon buttons', status: 'partial' },
  { item: 'Captions for telemedicine video', status: 'gap' },
  { item: 'Plain-language patient summaries', status: 'gap' },
];

// ----------------------------------------------------------- medicines safety

export interface ShortageReport {
  id: string;
  medication: string;
  atc: string;
  status: 'reported' | 'monitoring' | 'resolved';
  since: string;
  alternative: string;
  severity: 'critical' | 'moderate' | 'low';
}

export const mockShortages: ShortageReport[] = [
  { id: 'SH-2026-088', medication: 'Amoxicillin 500 mg capsules', atc: 'J01CA04', status: 'reported', since: '2026-10-26', alternative: 'Amoxicillin 500 mg dispersible tablets', severity: 'critical' },
  { id: 'SH-2026-085', medication: 'Metformin 1 g tablets', atc: 'A10BA02', status: 'monitoring', since: '2026-10-12', alternative: 'Metformin 500 mg × 2 tablets', severity: 'moderate' },
  { id: 'SH-2026-081', medication: 'Salbutamol 100 mcg inhaler', atc: 'R03AC02', status: 'monitoring', since: '2026-09-30', alternative: 'Terbutaline 500 mcg turbuhaler', severity: 'moderate' },
  { id: 'SH-2026-077', medication: 'Colecalciferol 1000 IU capsules', atc: 'A11CC05', status: 'resolved', since: '2026-08-04', alternative: '—', severity: 'low' },
];

export const mockReferencePricing = [
  { medication: 'Enalapril 10 mg (28)', atc: 'C09AA02', price: 12.9, reference: 8.4, status: 'above' },
  { medication: 'Metformin 1 g (56)', atc: 'A10BA02', price: 11.5, reference: 6.2, status: 'above' },
  { medication: 'Atorvastatin 20 mg (30)', atc: 'C10AA05', price: 4.6, reference: 4.9, status: 'within' },
  { medication: 'Paracetamol 1 g (20)', atc: 'N02BE01', price: 2.1, reference: 2.1, status: 'within' },
];

export const mockPharmacovigilanceCases = [
  { id: 'PV-2026-031', medication: 'Ceftriaxone 1 g IV', reaction: 'Anaphylaxis', severity: 'serious', reportedAt: '2026-10-30', status: 'submitted' },
  { id: 'PV-2026-030', medication: 'Apixaban 5 mg', reaction: 'GI haemorrhage', severity: 'serious', reportedAt: '2026-10-22', status: 'draft' },
  { id: 'PV-2026-029', medication: 'Amoxicillin 500 mg', reaction: 'Maculopapular rash', severity: 'non-serious', reportedAt: '2026-10-15', status: 'submitted' },
];

export const mockUdiDevices = [
  { id: 'UDI-01', device: 'Coronary stent, drug-eluting', udiDi: '(01)05412345678903', lot: 'LOT-7742', patientName: 'Emeka Nwosu', implantedAt: '2026-10-19', status: 'active' },
  { id: 'UDI-02', device: 'Hip prosthesis, cemented', udiDi: '(01)05419876543210', lot: 'LOT-2210', patientName: 'Amina Ibrahim', implantedAt: '2026-09-08', status: 'active' },
  { id: 'UDI-03', device: 'Insulin pump', udiDi: '(01)05411111222233', lot: 'LOT-9081', patientName: 'David Chukwu', implantedAt: '2026-06-14', status: 'active' },
  { id: 'UDI-04', device: 'Pacemaker, dual chamber', udiDi: '(01)05414444555566', lot: 'LOT-3312', patientName: 'Emmanuel Nwosu', implantedAt: '2025-11-02', status: 'active' },
];

// -------------------------------------------------------------------- emergency

export interface EdArrival {
  id: string;
  patientName: string;
  arrivedAt: string;
  arrivalMode: 'walk-in' | 'ambulance' | '112';
  complaint: string;
  triage: 1 | 2 | 3 | 4 | 5;
  status: 'waiting' | 'in-treatment' | 'admitted' | 'discharged';
  bay: string | null;
}

export const mockEdArrivals: EdArrival[] = [
  { id: 'ED-9101', patientName: 'Unknown male, approx. 60y', arrivedAt: '2026-11-01T08:02:00Z', arrivalMode: '112', complaint: 'Chest pain, diaphoresis', triage: 1, status: 'in-treatment', bay: 'Resus 1' },
  { id: 'ED-9102', patientName: 'Grace Adekunle', arrivedAt: '2026-11-01T08:18:00Z', arrivalMode: 'ambulance', complaint: 'Acute asthma exacerbation', triage: 2, status: 'waiting', bay: null },
  { id: 'ED-9103', patientName: 'David Chukwu', arrivedAt: '2026-11-01T08:31:00Z', arrivalMode: 'walk-in', complaint: 'Abdominal pain, right iliac fossa', triage: 3, status: 'waiting', bay: null },
  { id: 'ED-9104', patientName: 'Amina Ibrahim', arrivedAt: '2026-11-01T07:44:00Z', arrivalMode: 'walk-in', complaint: 'Febrile neutropenia', triage: 1, status: 'admitted', bay: 'Resus 2' },
  { id: 'ED-9105', patientName: 'Ngozi Adeyemi', arrivedAt: '2026-11-01T09:05:00Z', arrivalMode: 'walk-in', complaint: 'Ankle injury', triage: 4, status: 'waiting', bay: null },
  { id: 'ED-9106', patientName: 'Chidi Okonkwo', arrivedAt: '2026-11-01T06:50:00Z', arrivalMode: 'ambulance', complaint: 'Hypoglycaemia', triage: 2, status: 'discharged', bay: 'Majors 3' },
];

export const mockDispatchCalls = [
  { id: 'CALL-1201', receivedAt: '2026-11-01T07:58:00Z', location: 'Hauptstraße 14, 80331', chiefComplaint: 'Collapsed, not breathing normally', unit: 'Medic 7', etaMinutes: 4, status: 'arrived' },
  { id: 'CALL-1202', receivedAt: '2026-11-01T08:14:00Z', location: 'Sendlinger Tor', chiefComplaint: 'Asthma attack', unit: 'Medic 3', etaMinutes: 8, status: 'en route' },
  { id: 'CALL-1203', receivedAt: '2026-11-01T08:46:00Z', location: 'Marienplatz 2', chiefComplaint: 'Fall, head injury on anticoagulants', unit: 'Medic 5', etaMinutes: null, status: 'dispatched' },
];

// ------------------------------------------------------- maternity / screening

export interface AntenatalRecord {
  id: string;
  patientName: string;
  upid: string;
  gravida: number;
  para: number;
  gestationWeeks: number;
  edd: string;
  risk: 'low' | 'moderate' | 'high';
  nextVisit: string;
  bp: string;
  fundalHeight: number;
  notes: string;
}

export const mockAntenatalRecords: AntenatalRecord[] = [
  { id: 'AN-2026-011', patientName: 'Ada Nwankwo', upid: 'UPID-2V5D9J4C', gravida: 2, para: 1, gestationWeeks: 28, edd: '2027-01-24', risk: 'moderate', nextVisit: '2026-11-15', bp: '126/78', fundalHeight: 28, notes: 'Gestational diabetes screening booked (OGTT 03 Nov).' },
  { id: 'AN-2026-010', patientName: 'Fatima Bello', upid: 'UPID-4F7K2M9Q', gravida: 1, para: 1, gestationWeeks: 41, edd: '2026-10-24', risk: 'low', nextVisit: '2026-11-07', bp: '118/72', fundalHeight: 36, notes: 'Delivered 24 Oct. Postnatal review and mood screening due.' },
  { id: 'AN-2026-009', patientName: 'Halima Sani', upid: 'UPID-7M3N5P2Q', gravida: 3, para: 2, gestationWeeks: 34, edd: '2026-12-13', risk: 'high', nextVisit: '2026-11-05', bp: '146/94', fundalHeight: 33, notes: 'Gestational hypertension; weekly BP checks, pre-eclampsia bloods.' },
];

export const mockChildHealthChecks = [
  { id: 'CH-2201', childName: 'Zainab Ibrahim', ageMonths: 101, visit: 'School entry review', due: '2026-11-20', status: 'due' },
  { id: 'CH-2202', childName: 'Baby Bello', ageMonths: 0, visit: 'Newborn examination', due: '2026-10-25', status: 'completed' },
  { id: 'CH-2203', childName: 'Musa Ibrahim', ageMonths: 946, visit: 'Not applicable', due: '—', status: 'closed' },
  { id: 'CH-2204', childName: 'Tunde Adeyemi', ageMonths: 30, visit: '2.5-year development review', due: '2026-12-02', status: 'due' },
];

export interface ScreeningRecall {
  id: string;
  patientName: string;
  programme: 'Cervical' | 'Breast' | 'Colorectal';
  dueDate: string;
  status: 'due' | 'invited' | 'attended' | 'overdue';
  lastResult: string;
}

export const mockScreeningRecalls: ScreeningRecall[] = [
  { id: 'SCR-01', patientName: 'Ada Nwankwo', programme: 'Cervical', dueDate: '2026-11-30', status: 'due', lastResult: 'Normal (2023-11-18)' },
  { id: 'SCR-02', patientName: 'Amina Ibrahim', programme: 'Breast', dueDate: '2026-10-15', status: 'invited', lastResult: 'No abnormality (2024-10-02)' },
  { id: 'SCR-03', patientName: 'Grace Adekunle', programme: 'Cervical', dueDate: '2026-08-01', status: 'overdue', lastResult: 'Low-grade change (2023-08-12)' },
  { id: 'SCR-04', patientName: 'Ngozi Adeyemi', programme: 'Colorectal', dueDate: '2026-12-20', status: 'due', lastResult: 'Negative FIT (2024-12-01)' },
  { id: 'SCR-05', patientName: 'Fatima Bello', programme: 'Cervical', dueDate: '2027-03-01', status: 'attended', lastResult: 'Normal (2026-10-20)' },
  { id: 'SCR-06', patientName: 'Emeka Nwosu', programme: 'Colorectal', dueDate: '2026-11-10', status: 'invited', lastResult: 'Negative FIT (2024-11-05)' },
];
