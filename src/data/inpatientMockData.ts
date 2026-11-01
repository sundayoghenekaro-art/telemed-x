import { Patient } from '@/types/dhos';
import { mockPatients, mockBedOccupancy } from '@/data/mockData';
import { mockWardRounds, mockDischargeTasks, WardRound, DischargeTask } from '@/data/clinicalMockData';

const today = new Date();
const formatDate = (date: Date, hours: number, minutes: number = 0) => {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

// ── BED TYPES ──

export type BedStatus = 'occupied' | 'available' | 'reserved' | 'maintenance' | 'cleaning';

export interface Bed {
  id: string;
  wardId: string;
  wardName: string;
  bedNumber: string;
  status: BedStatus;
  patientUpid?: string;
  patientName?: string;
  admissionDate?: string;
  physician?: string;
  nurse?: string;
  acuity?: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

// ── ADMISSION TYPES ──

export interface Admission {
  id: string;
  patientUpid: string;
  patientName: string;
  wardId: string;
  wardName: string;
  bedId: string;
  bedNumber: string;
  admittingPhysician: string;
  admissionDate: string;
  reason: string;
  status: 'active' | 'discharged' | 'transferred';
  diagnosis?: string;
  priority: 'routine' | 'urgent' | 'emergency';
}

// ── TRANSFER TYPES ──

export interface Transfer {
  id: string;
  patientUpid: string;
  patientName: string;
  fromWard: string;
  fromBed: string;
  toWard: string;
  toBed: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  completedAt?: string;
}

// ── MOCK BEDS ──

function generateBeds(): Bed[] {
  const beds: Bed[] = [];
  const wards = [
    { id: 'W1', name: 'General Ward A', prefix: 'A', total: 40 },
    { id: 'W2', name: 'General Ward B', prefix: 'B', total: 40 },
    { id: 'W3', name: 'ICU', prefix: 'ICU', total: 12 },
    { id: 'W4', name: 'CCU', prefix: 'CCU', total: 8 },
    { id: 'W5', name: 'Maternity', prefix: 'M', total: 24 },
    { id: 'W6', name: 'Pediatrics', prefix: 'P', total: 20 },
    { id: 'W7', name: 'Surgical', prefix: 'S', total: 30 },
    { id: 'W8', name: 'Emergency', prefix: 'ER', total: 16 },
  ];

  // Map known patients to their beds
  const patientBeds: Record<string, { ward: string; bed: string; patient: Patient }> = {};
  for (const p of mockPatients) {
    if (p.wardLocation && p.bedNumber) {
      patientBeds[p.bedNumber] = { ward: p.wardLocation, bed: p.bedNumber, patient: p };
    }
  }

  const acuities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
  const physicians = ['Dr. Sarah Chen', 'Dr. Michael Adebayo', 'Dr. Fatima Yusuf', 'Dr. Blessing Okoro', 'Dr. Ngozi Eze'];
  const nurses = ['Nurse Adaeze', 'Nurse Blessing', 'Nurse Chioma', 'Nurse Damilola', 'Nurse Emeka', 'Nurse Funke', 'Nurse Grace', 'Nurse Halima'];

  for (const ward of wards) {
    const occupancy = mockBedOccupancy.find(b => b.wardId === ward.id);
    const occupied = occupancy?.occupiedBeds || Math.floor(ward.total * 0.7);
    const reserved = occupancy?.reservedBeds || 2;

    for (let i = 1; i <= ward.total; i++) {
      const bedNum = `${ward.prefix}-${String(i).padStart(2, '0')}`;
      const knownPatient = patientBeds[bedNum];

      let status: BedStatus = 'available';
      let patientUpid: string | undefined;
      let patientName: string | undefined;
      let physician: string | undefined;
      let nurse: string | undefined;
      let acuity: Bed['acuity'];
      let admissionDate: string | undefined;

      if (knownPatient) {
        status = 'occupied';
        patientUpid = knownPatient.patient.upid;
        patientName = `${knownPatient.patient.firstName} ${knownPatient.patient.lastName}`;
        physician = knownPatient.patient.primaryPhysician;
        nurse = nurses[i % nurses.length];
        acuity = knownPatient.patient.status === 'critical' ? 'critical' : knownPatient.patient.status === 'monitoring' ? 'high' : 'medium';
        admissionDate = knownPatient.patient.admissionDate;
      } else if (i <= occupied) {
        status = 'occupied';
        patientName = `Patient ${ward.prefix}-${i}`;
        physician = physicians[i % physicians.length];
        nurse = nurses[(i + 2) % nurses.length];
        acuity = acuities[i % acuities.length];
        admissionDate = formatDate(new Date(today.getTime() - (i * 86400000)), 8, 0);
      } else if (i <= occupied + reserved) {
        status = 'reserved';
      } else if (i === ward.total && ward.total > 10) {
        status = 'maintenance';
      }

      beds.push({
        id: `BED-${ward.id}-${i}`,
        wardId: ward.id,
        wardName: ward.name,
        bedNumber: bedNum,
        status,
        patientUpid,
        patientName,
        physician,
        nurse,
        acuity,
        admissionDate,
      });
    }
  }

  return beds;
}

export const mockBeds: Bed[] = generateBeds();

export const availableNurses = [
  'Nurse Adaeze', 'Nurse Blessing', 'Nurse Chioma', 'Nurse Damilola',
  'Nurse Emeka', 'Nurse Funke', 'Nurse Grace', 'Nurse Halima',
  'Nurse Ifeoma', 'Nurse Jumoke', 'Nurse Kemi', 'Nurse Lola',
];

// ── MOCK ADMISSIONS ──

export const mockAdmissions: Admission[] = mockPatients
  .filter(p => p.wardLocation && p.bedNumber)
  .map((p, i) => ({
    id: `ADM-${String(i + 1).padStart(3, '0')}`,
    patientUpid: p.upid,
    patientName: `${p.firstName} ${p.lastName}`,
    wardId: mockBedOccupancy.find(b => b.wardName === p.wardLocation)?.wardId || 'W1',
    wardName: p.wardLocation!,
    bedId: mockBeds.find(b => b.bedNumber === p.bedNumber)?.id || '',
    bedNumber: p.bedNumber!,
    admittingPhysician: p.primaryPhysician || 'Dr. Sarah Chen',
    admissionDate: p.admissionDate || today.toISOString(),
    reason: p.status === 'critical' ? 'Emergency admission' : 'Scheduled admission',
    status: 'active' as const,
    priority: p.status === 'critical' ? 'emergency' as const : 'routine' as const,
  }));

// ── MOCK TRANSFERS ──

export const mockTransfers: Transfer[] = [
  {
    id: 'TRF-001',
    patientUpid: 'UPID-3F8H5T2Q',
    patientName: 'Amina Ibrahim',
    fromWard: 'ICU',
    fromBed: 'ICU-03',
    toWard: 'General Ward A',
    toBed: 'A-15',
    reason: 'Patient stabilized, step-down to general ward',
    requestedBy: 'Dr. Michael Adebayo',
    requestedAt: formatDate(today, 14, 0),
    status: 'pending',
  },
];

// Re-export for convenience
export { mockWardRounds, mockDischargeTasks };
export type { WardRound, DischargeTask };
