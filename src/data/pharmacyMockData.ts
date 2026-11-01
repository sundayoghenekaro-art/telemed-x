import { Prescription, PharmacyInventoryItem } from '@/types/dhos';

const today = new Date();
const formatDate = (date: Date, hoursAgo: number = 0) => {
  const d = new Date(date.getTime() - hoursAgo * 60 * 60 * 1000);
  return d.toISOString();
};

export const mockInventory: PharmacyInventoryItem[] = [
  { id: 'MED-001', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'capsule', manufacturer: 'GSK', batchNumber: 'BN-2025-001', expiryDate: '2026-06-15', stockQuantity: 450, reorderLevel: 100, unitPrice: 0.85, location: 'Shelf A-1', controlled: false, requiresColdChain: false },
  { id: 'MED-002', name: 'Metformin 850mg', genericName: 'Metformin', category: 'tablet', manufacturer: 'Merck', batchNumber: 'BN-2025-012', expiryDate: '2026-09-20', stockQuantity: 320, reorderLevel: 80, unitPrice: 0.45, location: 'Shelf A-2', controlled: false, requiresColdChain: false },
  { id: 'MED-003', name: 'Lisinopril 10mg', genericName: 'Lisinopril', category: 'tablet', manufacturer: 'AstraZeneca', batchNumber: 'BN-2025-034', expiryDate: '2027-01-10', stockQuantity: 200, reorderLevel: 50, unitPrice: 0.65, location: 'Shelf A-3', controlled: false, requiresColdChain: false },
  { id: 'MED-004', name: 'Morphine Sulfate 10mg', genericName: 'Morphine', category: 'injection', manufacturer: 'Pfizer', batchNumber: 'BN-2025-078', expiryDate: '2026-03-30', stockQuantity: 45, reorderLevel: 20, unitPrice: 12.50, location: 'Controlled Cabinet C-1', controlled: true, requiresColdChain: false },
  { id: 'MED-005', name: 'Insulin Glargine 100U/mL', genericName: 'Insulin Glargine', category: 'injection', manufacturer: 'Sanofi', batchNumber: 'BN-2025-099', expiryDate: '2026-01-28', stockQuantity: 30, reorderLevel: 15, unitPrice: 45.00, location: 'Cold Storage R-1', controlled: false, requiresColdChain: true },
  { id: 'MED-006', name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'capsule', manufacturer: 'AstraZeneca', batchNumber: 'BN-2025-055', expiryDate: '2027-04-12', stockQuantity: 500, reorderLevel: 100, unitPrice: 0.35, location: 'Shelf B-1', controlled: false, requiresColdChain: false },
  { id: 'MED-007', name: 'Ciprofloxacin 500mg', genericName: 'Ciprofloxacin', category: 'tablet', manufacturer: 'Bayer', batchNumber: 'BN-2025-067', expiryDate: '2026-11-05', stockQuantity: 180, reorderLevel: 60, unitPrice: 1.20, location: 'Shelf B-2', controlled: false, requiresColdChain: false },
  { id: 'MED-008', name: 'Salbutamol 100mcg Inhaler', genericName: 'Salbutamol', category: 'inhaler', manufacturer: 'GSK', batchNumber: 'BN-2025-023', expiryDate: '2026-08-18', stockQuantity: 75, reorderLevel: 25, unitPrice: 8.50, location: 'Shelf C-1', controlled: false, requiresColdChain: false },
  { id: 'MED-009', name: 'Diazepam 5mg', genericName: 'Diazepam', category: 'tablet', manufacturer: 'Roche', batchNumber: 'BN-2025-044', expiryDate: '2026-12-01', stockQuantity: 60, reorderLevel: 30, unitPrice: 2.80, location: 'Controlled Cabinet C-2', controlled: true, requiresColdChain: false },
  { id: 'MED-010', name: 'Ceftriaxone 1g IV', genericName: 'Ceftriaxone', category: 'injection', manufacturer: 'Roche', batchNumber: 'BN-2025-088', expiryDate: '2026-07-22', stockQuantity: 8, reorderLevel: 20, unitPrice: 6.75, location: 'Shelf D-1', controlled: false, requiresColdChain: false },
  { id: 'MED-011', name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'tablet', manufacturer: 'Emzor', batchNumber: 'BN-2025-003', expiryDate: '2027-02-14', stockQuantity: 1200, reorderLevel: 200, unitPrice: 0.15, location: 'Shelf A-4', controlled: false, requiresColdChain: false },
  { id: 'MED-012', name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'tablet', manufacturer: 'Pfizer', batchNumber: 'BN-2025-071', expiryDate: '2026-10-08', stockQuantity: 250, reorderLevel: 60, unitPrice: 0.55, location: 'Shelf A-5', controlled: false, requiresColdChain: false },
  { id: 'MED-013', name: 'Normal Saline 500mL', genericName: 'Sodium Chloride 0.9%', category: 'infusion', manufacturer: 'Braun', batchNumber: 'BN-2025-110', expiryDate: '2027-06-30', stockQuantity: 150, reorderLevel: 50, unitPrice: 3.20, location: 'IV Storage S-1', controlled: false, requiresColdChain: false },
  { id: 'MED-014', name: 'Hydrocortisone Cream 1%', genericName: 'Hydrocortisone', category: 'cream', manufacturer: 'GSK', batchNumber: 'BN-2025-091', expiryDate: '2026-05-15', stockQuantity: 40, reorderLevel: 15, unitPrice: 4.50, location: 'Shelf E-1', controlled: false, requiresColdChain: false },
  { id: 'MED-015', name: 'Artemether/Lumefantrine', genericName: 'ACT', category: 'tablet', manufacturer: 'Novartis', batchNumber: 'BN-2025-045', expiryDate: '2026-04-20', stockQuantity: 350, reorderLevel: 100, unitPrice: 2.10, location: 'Shelf B-3', controlled: false, requiresColdChain: false },
  { id: 'MED-016', name: 'Warfarin 5mg', genericName: 'Warfarin', category: 'tablet', manufacturer: 'Bristol-Myers Squibb', batchNumber: 'BN-2025-116', expiryDate: '2027-03-15', stockQuantity: 200, reorderLevel: 50, unitPrice: 0.40, location: 'Shelf A-6', controlled: false, requiresColdChain: false },
  { id: 'MED-017', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'tablet', manufacturer: 'Reckitt', batchNumber: 'BN-2025-117', expiryDate: '2027-05-20', stockQuantity: 600, reorderLevel: 100, unitPrice: 0.20, location: 'Shelf A-7', controlled: false, requiresColdChain: false },
  { id: 'MED-018', name: 'Fluoxetine 20mg', genericName: 'Fluoxetine', category: 'capsule', manufacturer: 'Eli Lilly', batchNumber: 'BN-2025-118', expiryDate: '2027-01-10', stockQuantity: 150, reorderLevel: 40, unitPrice: 0.55, location: 'Shelf B-4', controlled: false, requiresColdChain: false },
  { id: 'MED-019', name: 'Linezolid 600mg', genericName: 'Linezolid', category: 'tablet', manufacturer: 'Pfizer', batchNumber: 'BN-2025-119', expiryDate: '2026-11-25', stockQuantity: 80, reorderLevel: 20, unitPrice: 18.50, location: 'Shelf D-2', controlled: false, requiresColdChain: false },
  { id: 'MED-020', name: 'Simvastatin 40mg', genericName: 'Simvastatin', category: 'tablet', manufacturer: 'Merck', batchNumber: 'BN-2025-120', expiryDate: '2027-02-28', stockQuantity: 300, reorderLevel: 60, unitPrice: 0.35, location: 'Shelf A-8', controlled: false, requiresColdChain: false },
  { id: 'MED-021', name: 'Clarithromycin 500mg', genericName: 'Clarithromycin', category: 'tablet', manufacturer: 'Abbott', batchNumber: 'BN-2025-121', expiryDate: '2026-09-15', stockQuantity: 120, reorderLevel: 30, unitPrice: 1.80, location: 'Shelf B-5', controlled: false, requiresColdChain: false },
];

export const mockPrescriptions: Prescription[] = [
  {
    id: 'RX-001',
    patientUpid: 'UPID-9P1L6W8R',
    patientName: 'Emmanuel Nwosu',
    prescribedBy: 'Dr. Fatima Yusuf',
    prescribedAt: formatDate(today, 0.5),
    status: 'pending',
    priority: 'stat',
    items: [
      {
        medicationId: 'MED-004', medicationName: 'Morphine Sulfate 10mg', dosage: '10mg', frequency: 'Every 4 hours', route: 'iv',
        duration: '48 hours', quantity: 12, instructions: 'Administer slowly over 5 minutes. Monitor vitals.',
        interactions: [{ drug: 'Diazepam', severity: 'major', description: 'Concurrent use may increase CNS depression and respiratory depression.' }]
      },
      {
        medicationId: 'MED-013', medicationName: 'Normal Saline 500mL', dosage: '500mL', frequency: 'Every 8 hours', route: 'iv',
        duration: '72 hours', quantity: 9, instructions: 'Run at 62.5 mL/hr'
      }
    ],
    notes: 'Post-cardiac catheterization pain management'
  },
  {
    id: 'RX-002',
    patientUpid: 'UPID-7X9K2M4N',
    patientName: 'James Okonkwo',
    prescribedBy: 'Dr. Sarah Chen',
    prescribedAt: formatDate(today, 2),
    status: 'verified',
    priority: 'routine',
    verifiedBy: 'Pharm. Adaeze Nwankwo',
    verifiedAt: formatDate(today, 1.5),
    items: [
      {
        medicationId: 'MED-002', medicationName: 'Metformin 850mg', dosage: '850mg', frequency: 'Twice daily', route: 'oral',
        duration: '30 days', quantity: 60, instructions: 'Take with meals',
      },
      {
        medicationId: 'MED-001', medicationName: 'Amoxicillin 500mg', dosage: '500mg', frequency: 'Three times daily', route: 'oral',
        duration: '7 days', quantity: 21, instructions: 'Complete full course',
      },
      {
        medicationId: 'MED-006', medicationName: 'Omeprazole 20mg', dosage: '20mg', frequency: 'Once daily', route: 'oral',
        duration: '14 days', quantity: 14, instructions: 'Take 30 min before breakfast',
      }
    ]
  },
  {
    id: 'RX-003',
    patientUpid: 'UPID-6Y3B7N1K',
    patientName: 'David Chukwu',
    prescribedBy: 'Dr. Ngozi Eze',
    prescribedAt: formatDate(today, 1),
    status: 'pending',
    priority: 'urgent',
    items: [
      {
        medicationId: 'MED-015', medicationName: 'Artemether/Lumefantrine', dosage: '80/480mg', frequency: 'Twice daily', route: 'oral',
        duration: '3 days', quantity: 6, instructions: 'Take with fatty food. Complete full course.',
      },
      {
        medicationId: 'MED-011', medicationName: 'Paracetamol 500mg', dosage: '1000mg', frequency: 'Every 6 hours PRN', route: 'oral',
        duration: '3 days', quantity: 12, instructions: 'For fever >38°C. Max 4g/day.',
      }
    ],
    notes: 'Confirmed malaria parasite positive'
  },
  {
    id: 'RX-004',
    patientUpid: 'UPID-2V5D9J4C',
    patientName: 'Grace Adekunle',
    prescribedBy: 'Dr. Blessing Okoro',
    prescribedAt: formatDate(today, 5),
    status: 'dispensed',
    priority: 'routine',
    verifiedBy: 'Pharm. Adaeze Nwankwo',
    verifiedAt: formatDate(today, 4.5),
    dispensedBy: 'Pharm. Tech. Uche Okwu',
    dispensedAt: formatDate(today, 4),
    items: [
      {
        medicationId: 'MED-001', medicationName: 'Amoxicillin 500mg', dosage: '500mg', frequency: 'Three times daily', route: 'oral',
        duration: '7 days', quantity: 21, dispensedQuantity: 21, instructions: 'Complete full course even if symptoms improve',
      }
    ]
  },
  {
    id: 'RX-005',
    patientUpid: 'UPID-3F8H5T2Q',
    patientName: 'Amina Ibrahim',
    prescribedBy: 'Dr. Michael Adebayo',
    prescribedAt: formatDate(today, 3),
    status: 'on-hold',
    priority: 'routine',
    items: [
      {
        medicationId: 'MED-010', medicationName: 'Ceftriaxone 1g IV', dosage: '1g', frequency: 'Once daily', route: 'iv',
        duration: '5 days', quantity: 5, instructions: 'Reconstitute with sterile water. Infuse over 30 min.',
        interactions: [{ drug: 'Amoxicillin', severity: 'moderate', description: 'Cross-sensitivity may occur in penicillin-allergic patients.' }]
      }
    ],
    notes: 'ON HOLD: Patient has documented penicillin allergy. Awaiting physician confirmation.'
  },
];

export const pharmacyPatientNames: Record<string, string> = {
  'UPID-7X9K2M4N': 'James Okonkwo',
  'UPID-3F8H5T2Q': 'Amina Ibrahim',
  'UPID-9P1L6W8R': 'Emmanuel Nwosu',
  'UPID-2V5D9J4C': 'Grace Adekunle',
  'UPID-6Y3B7N1K': 'David Chukwu',
};
