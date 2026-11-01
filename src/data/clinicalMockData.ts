import { Encounter, VitalSigns, Patient } from '@/types/dhos';

const today = new Date();
const formatDate = (date: Date, hours: number, minutes: number = 0) => {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

// ── ENCOUNTERS (SOAP Notes) ──

export interface SOAPNote {
  encounterId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface ClinicalEncounter extends Encounter {
  soap?: SOAPNote;
  vitalsAtEncounter?: VitalSigns;
  patientName: string;
}

export const mockEncounters: ClinicalEncounter[] = [
  {
    id: 'ENC-001',
    patientUpid: 'UPID-7X9K2M4N',
    patientName: 'James Okonkwo',
    type: 'outpatient',
    status: 'completed',
    startTime: formatDate(today, 9, 0),
    endTime: formatDate(today, 9, 25),
    chiefComplaint: 'Persistent lower back pain for 3 weeks',
    diagnosis: ['M54.5 — Low back pain'],
    attendingPhysician: 'Dr. Sarah Chen',
    department: 'Internal Medicine',
    soap: {
      encounterId: 'ENC-001',
      subjective: 'Patient reports persistent dull aching pain in lumbar region for 3 weeks. Pain rated 5/10, worse with prolonged sitting. No radiation to legs. No numbness/tingling. Ibuprofen provides partial relief.',
      objective: 'BP 120/80, HR 72, Temp 36.8°C. Tenderness over L4-L5 region. ROM limited in flexion. Negative SLR bilaterally. Neurological exam normal. No muscle spasm.',
      assessment: 'Mechanical low back pain, likely due to poor posture and prolonged desk work. No red flags for serious pathology.',
      plan: '1. Physiotherapy referral for core strengthening\n2. Diclofenac 50mg TDS for 5 days\n3. Ergonomic workstation assessment\n4. Follow-up in 2 weeks\n5. X-ray lumbar spine if no improvement',
    },
    vitalsAtEncounter: { timestamp: formatDate(today, 9, 0), heartRate: 72, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, temperature: 36.8, respiratoryRate: 16, oxygenSaturation: 98 },
  },
  {
    id: 'ENC-002',
    patientUpid: 'UPID-3F8H5T2Q',
    patientName: 'Amina Ibrahim',
    type: 'inpatient',
    status: 'in-progress',
    startTime: formatDate(today, 8, 0),
    chiefComplaint: 'Chest tightness and shortness of breath',
    diagnosis: ['I50.9 — Heart failure, unspecified'],
    attendingPhysician: 'Dr. Michael Adebayo',
    department: 'Cardiology',
    soap: {
      encounterId: 'ENC-002',
      subjective: 'Patient reports worsening dyspnea on exertion over 2 days. Orthopnea present, using 3 pillows. Mild pedal edema noted by nursing staff. No chest pain.',
      objective: 'BP 145/92, HR 98, RR 22, SpO2 93% on room air. JVP elevated. Bilateral basal crackles. S3 gallop. Pitting edema to mid-calf bilaterally. CXR shows cardiomegaly with pulmonary congestion.',
      assessment: 'Acute decompensated heart failure. BNP elevated at 890 pg/mL. Echo pending.',
      plan: '1. IV Furosemide 40mg stat, then 20mg BD\n2. Fluid restriction 1.5L/day\n3. Daily weight and strict I/O charting\n4. Echocardiogram today\n5. Cardiology consult for optimization',
    },
    vitalsAtEncounter: { timestamp: formatDate(today, 8, 0), heartRate: 98, bloodPressureSystolic: 145, bloodPressureDiastolic: 92, temperature: 37.1, respiratoryRate: 22, oxygenSaturation: 93 },
  },
  {
    id: 'ENC-003',
    patientUpid: 'UPID-9P1L6W8R',
    patientName: 'Emmanuel Nwosu',
    type: 'emergency',
    status: 'in-progress',
    startTime: formatDate(today, 6, 30),
    chiefComplaint: 'Acute chest pain and diaphoresis',
    diagnosis: ['I21.0 — Acute ST-elevation myocardial infarction'],
    attendingPhysician: 'Dr. Fatima Yusuf',
    department: 'Emergency / CCU',
    soap: {
      encounterId: 'ENC-003',
      subjective: 'Patient presented with sudden-onset severe crushing chest pain radiating to left arm at 0615. Associated with diaphoresis and nausea. Known hypertensive, non-compliant with medications.',
      objective: 'BP 160/100, HR 110, RR 24, SpO2 94%. Diaphoretic. ECG shows ST elevation V1-V4. Troponin I: 12.5 ng/mL (H). K+: 6.8 mEq/L (critical).',
      assessment: 'Acute anterior STEMI with hyperkalemia. High risk. TIMI score 6/14.',
      plan: '1. MONA protocol initiated\n2. Heparin infusion per ACS protocol\n3. Urgent cardiology consult for PCI\n4. Calcium gluconate + insulin/dextrose for hyperkalemia\n5. Continuous cardiac monitoring\n6. Serial troponins q6h',
    },
    vitalsAtEncounter: { timestamp: formatDate(today, 6, 30), heartRate: 110, bloodPressureSystolic: 160, bloodPressureDiastolic: 100, temperature: 37.2, respiratoryRate: 24, oxygenSaturation: 94, painLevel: 9 },
  },
  {
    id: 'ENC-004',
    patientUpid: 'UPID-2V5D9J4C',
    patientName: 'Grace Adekunle',
    type: 'inpatient',
    status: 'completed',
    startTime: formatDate(new Date(today.getTime() - 86400000), 10, 0),
    endTime: formatDate(new Date(today.getTime() - 86400000), 10, 30),
    chiefComplaint: 'Routine antenatal check-up at 36 weeks',
    diagnosis: ['Z34.0 — Supervision of normal pregnancy'],
    attendingPhysician: 'Dr. Blessing Okoro',
    department: 'Obstetrics & Gynecology',
    soap: {
      encounterId: 'ENC-004',
      subjective: 'Patient presents for routine 36-week antenatal visit. Reports good fetal movement, no contractions, no vaginal bleeding or discharge. Mild lower back discomfort. Appetite and sleep normal.',
      objective: 'BP 115/72, HR 80, Temp 36.7°C. Fundal height 35cm, consistent with dates. Fetal heart rate 142 bpm, reactive. Cephalic presentation confirmed on palpation. No pedal edema. Urine dipstick negative for protein and glucose.',
      assessment: 'Normal singleton pregnancy at 36 weeks gestation. Vertex presentation. No complications identified.',
      plan: '1. Continue prenatal vitamins and iron supplementation\n2. CTG monitoring at next visit\n3. Discuss birth plan and delivery preferences\n4. Return in 1 week for 37-week check\n5. Advise on signs of labor and when to present to hospital',
    },
    vitalsAtEncounter: { timestamp: formatDate(new Date(today.getTime() - 86400000), 10, 0), heartRate: 80, bloodPressureSystolic: 115, bloodPressureDiastolic: 72, temperature: 36.7, respiratoryRate: 17, oxygenSaturation: 99 },
  },
  {
    id: 'ENC-005',
    patientUpid: 'UPID-6Y3B7N1K',
    patientName: 'David Chukwu',
    type: 'inpatient',
    status: 'in-progress',
    startTime: formatDate(today, 11, 0),
    chiefComplaint: 'Febrile illness with abdominal pain',
    diagnosis: ['B50.9 — Plasmodium falciparum malaria'],
    attendingPhysician: 'Dr. Ngozi Eze',
    department: 'Pediatrics',
    soap: {
      encounterId: 'ENC-005',
      subjective: 'Mother reports 3-day history of high fever, rigors, and diffuse abdominal pain. Reduced oral intake and decreased urine output over last 24 hours. No vomiting or diarrhea. Recent travel to endemic area.',
      objective: 'BP 95/60, HR 120, RR 28, Temp 39.2°C, SpO2 96%. Child appears lethargic but responsive. Mild jaundice. Abdomen soft with mild hepatosplenomegaly. No neck stiffness. Malaria RDT positive for P. falciparum.',
      assessment: 'Uncomplicated Plasmodium falciparum malaria with dehydration. No signs of severe malaria (no convulsions, no severe anemia, no prostration).',
      plan: '1. IV fluid resuscitation — NS bolus 20mL/kg, then maintenance\n2. Artemether/Lumefantrine per weight-based dosing\n3. Paracetamol 15mg/kg q6h PRN for fever >38°C\n4. Strict I/O monitoring\n5. Repeat malaria parasite count at 24h and 48h\n6. CBC, LFTs, and renal function monitoring',
    },
    vitalsAtEncounter: { timestamp: formatDate(today, 11, 0), heartRate: 120, bloodPressureSystolic: 95, bloodPressureDiastolic: 60, temperature: 39.2, respiratoryRate: 28, oxygenSaturation: 96 },
  },
];

// ── CLINICAL ORDERS ──

export type ClinicalOrderType = 'lab' | 'imaging' | 'referral' | 'procedure' | 'medication';

export interface ClinicalOrder {
  id: string;
  patientUpid: string;
  patientName: string;
  encounterId?: string;
  type: ClinicalOrderType;
  description: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  orderedBy: string;
  orderedAt: string;
  completedAt?: string;
  notes?: string;
}

export const mockClinicalOrders: ClinicalOrder[] = [
  { id: 'CO-001', patientUpid: 'UPID-9P1L6W8R', patientName: 'Emmanuel Nwosu', encounterId: 'ENC-003', type: 'lab', description: 'Serial Troponin I q6h', priority: 'stat', status: 'in-progress', orderedBy: 'Dr. Fatima Yusuf', orderedAt: formatDate(today, 6, 45) },
  { id: 'CO-002', patientUpid: 'UPID-9P1L6W8R', patientName: 'Emmanuel Nwosu', encounterId: 'ENC-003', type: 'imaging', description: 'Urgent Echocardiogram — assess LV function post-STEMI', priority: 'urgent', status: 'pending', orderedBy: 'Dr. Fatima Yusuf', orderedAt: formatDate(today, 7, 0) },
  { id: 'CO-003', patientUpid: 'UPID-9P1L6W8R', patientName: 'Emmanuel Nwosu', encounterId: 'ENC-003', type: 'referral', description: 'Cardiology consult for PCI evaluation', priority: 'stat', status: 'completed', orderedBy: 'Dr. Fatima Yusuf', orderedAt: formatDate(today, 6, 50), completedAt: formatDate(today, 7, 15) },
  { id: 'CO-004', patientUpid: 'UPID-3F8H5T2Q', patientName: 'Amina Ibrahim', encounterId: 'ENC-002', type: 'imaging', description: 'Echocardiogram — assess cardiac function', priority: 'urgent', status: 'pending', orderedBy: 'Dr. Michael Adebayo', orderedAt: formatDate(today, 8, 30) },
  { id: 'CO-005', patientUpid: 'UPID-3F8H5T2Q', patientName: 'Amina Ibrahim', encounterId: 'ENC-002', type: 'lab', description: 'BNP, BMP, CBC, Hepatic panel', priority: 'urgent', status: 'completed', orderedBy: 'Dr. Michael Adebayo', orderedAt: formatDate(today, 8, 15), completedAt: formatDate(today, 9, 45) },
  { id: 'CO-006', patientUpid: 'UPID-7X9K2M4N', patientName: 'James Okonkwo', encounterId: 'ENC-001', type: 'referral', description: 'Physiotherapy — core strengthening for chronic LBP', priority: 'routine', status: 'pending', orderedBy: 'Dr. Sarah Chen', orderedAt: formatDate(today, 9, 30) },
  { id: 'CO-007', patientUpid: 'UPID-7X9K2M4N', patientName: 'James Okonkwo', encounterId: 'ENC-001', type: 'imaging', description: 'X-ray Lumbar Spine AP/Lat (if no improvement at follow-up)', priority: 'routine', status: 'pending', orderedBy: 'Dr. Sarah Chen', orderedAt: formatDate(today, 9, 30), notes: 'Conditional — only if symptoms persist at 2-week follow-up' },
  { id: 'CO-008', patientUpid: 'UPID-6Y3B7N1K', patientName: 'David Chukwu', encounterId: 'ENC-005', type: 'lab', description: 'Malaria RDT, thick/thin film, CBC, LFTs', priority: 'urgent', status: 'in-progress', orderedBy: 'Dr. Ngozi Eze', orderedAt: formatDate(today, 11, 15) },
  { id: 'CO-009', patientUpid: 'UPID-6Y3B7N1K', patientName: 'David Chukwu', encounterId: 'ENC-005', type: 'procedure', description: 'IV cannulation and fluid resuscitation', priority: 'urgent', status: 'completed', orderedBy: 'Dr. Ngozi Eze', orderedAt: formatDate(today, 11, 10), completedAt: formatDate(today, 11, 20) },
];

// ── VITALS HISTORY (multi-patient) ──

export const mockVitalsHistory: Record<string, VitalSigns[]> = {
  'UPID-7X9K2M4N': [
    { timestamp: formatDate(today, 6, 0), heartRate: 70, bloodPressureSystolic: 118, bloodPressureDiastolic: 78, temperature: 36.6, respiratoryRate: 16, oxygenSaturation: 99, painLevel: 4 },
    { timestamp: formatDate(today, 10, 0), heartRate: 72, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, temperature: 36.8, respiratoryRate: 16, oxygenSaturation: 98, painLevel: 5 },
    { timestamp: formatDate(today, 14, 0), heartRate: 74, bloodPressureSystolic: 122, bloodPressureDiastolic: 82, temperature: 36.9, respiratoryRate: 17, oxygenSaturation: 98, painLevel: 3 },
  ],
  'UPID-3F8H5T2Q': [
    { timestamp: formatDate(today, 6, 0), heartRate: 92, bloodPressureSystolic: 140, bloodPressureDiastolic: 88, temperature: 37.0, respiratoryRate: 20, oxygenSaturation: 94, painLevel: 2 },
    { timestamp: formatDate(today, 8, 0), heartRate: 98, bloodPressureSystolic: 145, bloodPressureDiastolic: 92, temperature: 37.1, respiratoryRate: 22, oxygenSaturation: 93, painLevel: 3 },
    { timestamp: formatDate(today, 12, 0), heartRate: 88, bloodPressureSystolic: 132, bloodPressureDiastolic: 84, temperature: 37.0, respiratoryRate: 18, oxygenSaturation: 95, painLevel: 1 },
  ],
  'UPID-9P1L6W8R': [
    { timestamp: formatDate(today, 6, 30), heartRate: 110, bloodPressureSystolic: 160, bloodPressureDiastolic: 100, temperature: 37.2, respiratoryRate: 24, oxygenSaturation: 94, painLevel: 9 },
    { timestamp: formatDate(today, 8, 0), heartRate: 100, bloodPressureSystolic: 148, bloodPressureDiastolic: 94, temperature: 37.1, respiratoryRate: 22, oxygenSaturation: 95, painLevel: 7 },
    { timestamp: formatDate(today, 10, 0), heartRate: 92, bloodPressureSystolic: 138, bloodPressureDiastolic: 88, temperature: 37.0, respiratoryRate: 20, oxygenSaturation: 96, painLevel: 5 },
    { timestamp: formatDate(today, 12, 0), heartRate: 86, bloodPressureSystolic: 130, bloodPressureDiastolic: 82, temperature: 36.9, respiratoryRate: 18, oxygenSaturation: 97, painLevel: 3 },
  ],
  'UPID-6Y3B7N1K': [
    { timestamp: formatDate(today, 6, 0), heartRate: 115, bloodPressureSystolic: 90, bloodPressureDiastolic: 58, temperature: 39.5, respiratoryRate: 30, oxygenSaturation: 95 },
    { timestamp: formatDate(today, 10, 0), heartRate: 120, bloodPressureSystolic: 95, bloodPressureDiastolic: 60, temperature: 39.2, respiratoryRate: 28, oxygenSaturation: 96 },
    { timestamp: formatDate(today, 14, 0), heartRate: 105, bloodPressureSystolic: 100, bloodPressureDiastolic: 65, temperature: 38.4, respiratoryRate: 24, oxygenSaturation: 97 },
  ],
};

// ── INPATIENT WARD DATA ──

export interface WardRound {
  id: string;
  patientUpid: string;
  patientName: string;
  ward: string;
  bed: string;
  physician: string;
  status: 'pending' | 'in-progress' | 'completed';
  scheduledTime: string;
  completedTime?: string;
  notes?: string;
  tasks: string[];
}

export interface DischargeTask {
  id: string;
  patientUpid: string;
  patientName: string;
  ward: string;
  bed: string;
  admissionDate: string;
  expectedDischarge: string;
  status: 'planning' | 'pending-approval' | 'approved' | 'discharged';
  physician: string;
  pendingItems: string[];
}

export const mockWardRounds: WardRound[] = [
  {
    id: 'WR-001', patientUpid: 'UPID-7X9K2M4N', patientName: 'James Okonkwo', ward: 'Ward A', bed: 'A-12',
    physician: 'Dr. Sarah Chen', status: 'completed', scheduledTime: formatDate(today, 8, 0), completedTime: formatDate(today, 8, 15),
    notes: 'Stable. Pain improving. Continue current management.', tasks: ['Review physiotherapy progress', 'Consider discharge if pain controlled']
  },
  {
    id: 'WR-002', patientUpid: 'UPID-3F8H5T2Q', patientName: 'Amina Ibrahim', ward: 'ICU', bed: 'ICU-03',
    physician: 'Dr. Michael Adebayo', status: 'in-progress', scheduledTime: formatDate(today, 8, 30),
    tasks: ['Review overnight I/O chart', 'Check BNP trend', 'Adjust diuretic dose', 'Review echo results']
  },
  {
    id: 'WR-003', patientUpid: 'UPID-9P1L6W8R', patientName: 'Emmanuel Nwosu', ward: 'CCU', bed: 'CCU-01',
    physician: 'Dr. Fatima Yusuf', status: 'in-progress', scheduledTime: formatDate(today, 7, 0),
    tasks: ['Review serial troponins', 'Assess for PCI timing', 'Monitor potassium post-treatment', 'Repeat ECG']
  },
  {
    id: 'WR-004', patientUpid: 'UPID-2V5D9J4C', patientName: 'Grace Adekunle', ward: 'Maternity', bed: 'M-08',
    physician: 'Dr. Blessing Okoro', status: 'pending', scheduledTime: formatDate(today, 9, 0),
    tasks: ['Review CTG tracing', 'Check fetal position', 'Discuss birth plan']
  },
  {
    id: 'WR-005', patientUpid: 'UPID-6Y3B7N1K', patientName: 'David Chukwu', ward: 'Pediatrics', bed: 'P-15',
    physician: 'Dr. Ngozi Eze', status: 'pending', scheduledTime: formatDate(today, 9, 30),
    tasks: ['Check malaria parasite count', 'Assess hydration status', 'Review anti-malarial response', 'Monitor temperature trend']
  },
];

export const mockDischargeTasks: DischargeTask[] = [
  {
    id: 'DC-001', patientUpid: 'UPID-7X9K2M4N', patientName: 'James Okonkwo', ward: 'Ward A', bed: 'A-12',
    admissionDate: '2024-01-28', expectedDischarge: formatDate(new Date(today.getTime() + 86400000), 10, 0),
    status: 'planning', physician: 'Dr. Sarah Chen',
    pendingItems: ['Physiotherapy assessment', 'Discharge medications', 'Follow-up appointment booking']
  },
  {
    id: 'DC-002', patientUpid: 'UPID-2V5D9J4C', patientName: 'Grace Adekunle', ward: 'Maternity', bed: 'M-08',
    admissionDate: '2024-01-30', expectedDischarge: formatDate(new Date(today.getTime() + 172800000), 10, 0),
    status: 'pending-approval', physician: 'Dr. Blessing Okoro',
    pendingItems: ['Final fetal assessment', 'Discharge summary']
  },
];
