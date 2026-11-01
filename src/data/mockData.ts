import { 
  Patient, 
  Appointment, 
  DashboardStats, 
  BedOccupancy, 
  Notification,
  VitalSigns,
  User 
} from '@/types/dhos';

export const mockCurrentUser: User = {
  id: 'USR-001',
  name: 'Dr. Sarah Chen',
  role: 'physician',
  department: 'Internal Medicine',
  email: 'sarah.chen@hospital.org',
  avatar: undefined
};

export const mockPatients: Patient[] = [
  {
    upid: 'UPID-7X9K2M4N',
    firstName: 'James',
    lastName: 'Okonkwo',
    dateOfBirth: '1978-03-15',
    gender: 'male',
    bloodType: 'O+',
    allergies: ['Penicillin', 'Sulfa'],
    status: 'stable',
    wardLocation: 'Ward A',
    bedNumber: 'A-12',
    primaryPhysician: 'Dr. Sarah Chen',
    admissionDate: '2024-01-28',
    lastVisit: '2024-01-30'
  },
  {
    upid: 'UPID-3F8H5T2Q',
    firstName: 'Amina',
    lastName: 'Ibrahim',
    dateOfBirth: '1992-07-22',
    gender: 'female',
    bloodType: 'A+',
    allergies: [],
    status: 'monitoring',
    wardLocation: 'ICU',
    bedNumber: 'ICU-03',
    primaryPhysician: 'Dr. Michael Adebayo',
    admissionDate: '2024-01-29',
    lastVisit: '2024-01-30'
  },
  {
    upid: 'UPID-9P1L6W8R',
    firstName: 'Emmanuel',
    lastName: 'Nwosu',
    dateOfBirth: '1965-11-08',
    gender: 'male',
    bloodType: 'B-',
    allergies: ['Aspirin', 'Iodine'],
    status: 'critical',
    wardLocation: 'CCU',
    bedNumber: 'CCU-01',
    primaryPhysician: 'Dr. Fatima Yusuf',
    admissionDate: '2024-01-27',
    lastVisit: '2024-01-30'
  },
  {
    upid: 'UPID-2V5D9J4C',
    firstName: 'Grace',
    lastName: 'Adekunle',
    dateOfBirth: '1985-04-30',
    gender: 'female',
    bloodType: 'AB+',
    allergies: [],
    status: 'stable',
    wardLocation: 'Maternity',
    bedNumber: 'M-08',
    primaryPhysician: 'Dr. Blessing Okoro',
    admissionDate: '2024-01-30',
    lastVisit: '2024-01-30'
  },
  {
    upid: 'UPID-6Y3B7N1K',
    firstName: 'David',
    lastName: 'Chukwu',
    dateOfBirth: '2018-09-12',
    gender: 'male',
    bloodType: 'O-',
    allergies: ['Eggs'],
    status: 'stable',
    wardLocation: 'Pediatrics',
    bedNumber: 'P-15',
    primaryPhysician: 'Dr. Ngozi Eze',
    admissionDate: '2024-01-29',
    lastVisit: '2024-01-30'
  }
];

// Generate dynamic dates based on current date
const today = new Date();
const formatDate = (date: Date, hours: number, minutes: number = 0) => {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

export const mockAppointments: Appointment[] = [
  {
    id: 'APT-001',
    patientUpid: 'UPID-7X9K2M4N',
    patientName: 'James Okonkwo',
    physician: 'Dr. Sarah Chen',
    department: 'Internal Medicine',
    scheduledTime: formatDate(today, 9, 0),
    duration: 30,
    type: 'follow-up',
    status: 'completed'
  },
  {
    id: 'APT-002',
    patientUpid: 'UPID-NEW-001',
    patientName: 'Chioma Eze',
    physician: 'Dr. Sarah Chen',
    department: 'Internal Medicine',
    scheduledTime: formatDate(today, 10, 0),
    duration: 45,
    type: 'new',
    status: 'in-progress'
  },
  {
    id: 'APT-003',
    patientUpid: 'UPID-NEW-002',
    patientName: 'Oluwaseun Adeyemi',
    physician: 'Dr. Sarah Chen',
    department: 'Internal Medicine',
    scheduledTime: formatDate(today, 11, 0),
    duration: 30,
    type: 'consultation',
    status: 'scheduled'
  },
  {
    id: 'APT-004',
    patientUpid: 'UPID-NEW-003',
    patientName: 'Fatima Musa',
    physician: 'Dr. Sarah Chen',
    department: 'Internal Medicine',
    scheduledTime: formatDate(today, 14, 0),
    duration: 30,
    type: 'follow-up',
    status: 'scheduled'
  },
  {
    id: 'APT-005',
    patientUpid: 'UPID-NEW-004',
    patientName: 'Abdullahi Bello',
    physician: 'Dr. Sarah Chen',
    department: 'Internal Medicine',
    scheduledTime: formatDate(today, 15, 0),
    duration: 60,
    type: 'procedure',
    status: 'scheduled'
  },
  // Tomorrow's appointments
  {
    id: 'APT-006',
    patientUpid: 'UPID-3F8H5T2Q',
    patientName: 'Amina Ibrahim',
    physician: 'Dr. Michael Adebayo',
    department: 'Cardiology',
    scheduledTime: formatDate(new Date(today.getTime() + 86400000), 9, 30),
    duration: 45,
    type: 'consultation',
    status: 'scheduled'
  },
  {
    id: 'APT-007',
    patientUpid: 'UPID-2V5D9J4C',
    patientName: 'Grace Adekunle',
    physician: 'Dr. Blessing Okoro',
    department: 'Obstetrics & Gynecology',
    scheduledTime: formatDate(new Date(today.getTime() + 86400000), 11, 0),
    duration: 30,
    type: 'follow-up',
    status: 'scheduled'
  },
  {
    id: 'APT-008',
    patientUpid: 'UPID-6Y3B7N1K',
    patientName: 'David Chukwu',
    physician: 'Dr. Ngozi Eze',
    department: 'Pediatrics',
    scheduledTime: formatDate(new Date(today.getTime() + 86400000), 14, 30),
    duration: 30,
    type: 'follow-up',
    status: 'scheduled'
  },
  // Day after tomorrow
  {
    id: 'APT-009',
    patientUpid: 'UPID-9P1L6W8R',
    patientName: 'Emmanuel Nwosu',
    physician: 'Dr. Fatima Yusuf',
    department: 'Cardiology',
    scheduledTime: formatDate(new Date(today.getTime() + 172800000), 10, 0),
    duration: 60,
    type: 'procedure',
    status: 'scheduled',
    notes: 'Post-operative follow-up, monitor cardiac status'
  },
  {
    id: 'APT-010',
    patientUpid: 'UPID-NEW-005',
    patientName: 'Aisha Mohammed',
    physician: 'Dr. Sarah Chen',
    department: 'Internal Medicine',
    scheduledTime: formatDate(new Date(today.getTime() + 172800000), 13, 0),
    duration: 45,
    type: 'new',
    status: 'scheduled'
  }
];

export const mockDashboardStats: DashboardStats = {
  totalPatients: 1247,
  inpatients: 186,
  outpatientsToday: 94,
  emergencies: 12,
  criticalPatients: 8,
  pendingDischarges: 15,
  bedOccupancyRate: 78.5,
  avgWaitTime: 24
};

export const mockBedOccupancy: BedOccupancy[] = [
  { wardId: 'W1', wardName: 'General Ward A', totalBeds: 40, occupiedBeds: 32, reservedBeds: 3, availableBeds: 5 },
  { wardId: 'W2', wardName: 'General Ward B', totalBeds: 40, occupiedBeds: 28, reservedBeds: 5, availableBeds: 7 },
  { wardId: 'W3', wardName: 'ICU', totalBeds: 12, occupiedBeds: 10, reservedBeds: 1, availableBeds: 1 },
  { wardId: 'W4', wardName: 'CCU', totalBeds: 8, occupiedBeds: 7, reservedBeds: 0, availableBeds: 1 },
  { wardId: 'W5', wardName: 'Maternity', totalBeds: 24, occupiedBeds: 18, reservedBeds: 2, availableBeds: 4 },
  { wardId: 'W6', wardName: 'Pediatrics', totalBeds: 20, occupiedBeds: 12, reservedBeds: 3, availableBeds: 5 },
  { wardId: 'W7', wardName: 'Surgical', totalBeds: 30, occupiedBeds: 24, reservedBeds: 4, availableBeds: 2 },
  { wardId: 'W8', wardName: 'Emergency', totalBeds: 16, occupiedBeds: 11, reservedBeds: 0, availableBeds: 5 }
];

export const mockNotifications: Notification[] = [
  {
    id: 'N001',
    type: 'alert',
    title: 'Critical Lab Result',
    message: 'Patient UPID-9P1L6W8R has critical potassium levels (6.8 mEq/L)',
    timestamp: '2024-01-30T10:15:00',
    read: false,
    actionUrl: '/patients/UPID-9P1L6W8R'
  },
  {
    id: 'N002',
    type: 'warning',
    title: 'Medication Interaction',
    message: 'Potential interaction detected for patient UPID-7X9K2M4N',
    timestamp: '2024-01-30T09:45:00',
    read: false,
    actionUrl: '/patients/UPID-7X9K2M4N/medications'
  },
  {
    id: 'N003',
    type: 'info',
    title: 'Appointment Reminder',
    message: 'Next patient Oluwaseun Adeyemi scheduled at 11:00 AM',
    timestamp: '2024-01-30T10:30:00',
    read: true,
    actionUrl: '/appointments'
  },
  {
    id: 'N004',
    type: 'success',
    title: 'Discharge Approved',
    message: 'Patient Grace Adekunle discharge has been approved',
    timestamp: '2024-01-30T08:30:00',
    read: true,
    actionUrl: '/patients/UPID-2V5D9J4C'
  }
];

export const mockVitalSigns: VitalSigns[] = [
  {
    timestamp: '2024-01-30T06:00:00',
    heartRate: 72,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    temperature: 36.8,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    painLevel: 2
  },
  {
    timestamp: '2024-01-30T08:00:00',
    heartRate: 78,
    bloodPressureSystolic: 125,
    bloodPressureDiastolic: 82,
    temperature: 37.0,
    respiratoryRate: 18,
    oxygenSaturation: 97,
    painLevel: 3
  },
  {
    timestamp: '2024-01-30T10:00:00',
    heartRate: 75,
    bloodPressureSystolic: 118,
    bloodPressureDiastolic: 78,
    temperature: 36.9,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    painLevel: 2
  }
];
