import { format, subDays, addDays } from 'date-fns';

export interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  department: string;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  category: 'consultation' | 'procedure' | 'lab' | 'radiology' | 'pharmacy' | 'room' | 'service';
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  patient_name: string;
  payment_date: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'insurance' | 'mobile_money';
  reference_number?: string;
  received_by?: string;
  notes?: string;
}

export interface InsuranceClaim {
  id: string;
  invoice_id?: string;
  claim_number: string;
  patient_name: string;
  insurance_provider: string;
  policy_number: string;
  diagnosis_codes: string[];
  procedure_codes: string[];
  amount_claimed: number;
  amount_approved?: number;
  status: 'submitted' | 'under_review' | 'approved' | 'partially_approved' | 'denied' | 'appealed';
  submitted_at: string;
  resolved_at?: string;
  denial_reason?: string;
  notes?: string;
}

const now = new Date();

export const mockInvoices: Invoice[] = [
  {
    id: 'inv-1', invoice_number: 'INV-2026-0001', patient_id: 'P-001', patient_name: 'Amina Ibrahim',
    department: 'Radiology', status: 'paid', issue_date: subDays(now, 15).toISOString(),
    due_date: addDays(subDays(now, 15), 30).toISOString(), subtotal: 45000, tax: 3375, discount: 0,
    total: 48375, amount_paid: 48375, balance_due: 0,
    items: [
      { id: 'ii-1', invoice_id: 'inv-1', description: 'Abdominal Ultrasound', category: 'radiology', quantity: 1, unit_price: 35000, total: 35000 },
      { id: 'ii-2', invoice_id: 'inv-1', description: 'Consultation – Radiology', category: 'consultation', quantity: 1, unit_price: 10000, total: 10000 },
    ],
  },
  {
    id: 'inv-2', invoice_number: 'INV-2026-0002', patient_id: 'P-002', patient_name: 'Chidi Okonkwo',
    department: 'Laboratory', status: 'partial', issue_date: subDays(now, 10).toISOString(),
    due_date: addDays(subDays(now, 10), 30).toISOString(), subtotal: 28000, tax: 2100, discount: 2000,
    total: 28100, amount_paid: 15000, balance_due: 13100,
    items: [
      { id: 'ii-3', invoice_id: 'inv-2', description: 'Complete Blood Count', category: 'lab', quantity: 1, unit_price: 8000, total: 8000 },
      { id: 'ii-4', invoice_id: 'inv-2', description: 'Liver Function Test', category: 'lab', quantity: 1, unit_price: 12000, total: 12000 },
      { id: 'ii-5', invoice_id: 'inv-2', description: 'Consultation – Internal Med', category: 'consultation', quantity: 1, unit_price: 8000, total: 8000 },
    ],
  },
  {
    id: 'inv-3', invoice_number: 'INV-2026-0003', patient_id: 'P-003', patient_name: 'Fatima Bello',
    department: 'In-Patient', status: 'sent', issue_date: subDays(now, 5).toISOString(),
    due_date: addDays(subDays(now, 5), 30).toISOString(), subtotal: 185000, tax: 13875, discount: 10000,
    total: 188875, amount_paid: 0, balance_due: 188875,
    items: [
      { id: 'ii-6', invoice_id: 'inv-3', description: 'Ward Bed – 3 nights', category: 'room', quantity: 3, unit_price: 25000, total: 75000 },
      { id: 'ii-7', invoice_id: 'inv-3', description: 'IV Infusion Therapy', category: 'procedure', quantity: 6, unit_price: 5000, total: 30000 },
      { id: 'ii-8', invoice_id: 'inv-3', description: 'Medications', category: 'pharmacy', quantity: 1, unit_price: 45000, total: 45000 },
      { id: 'ii-9', invoice_id: 'inv-3', description: 'Surgeon Fee', category: 'consultation', quantity: 1, unit_price: 35000, total: 35000 },
    ],
  },
  {
    id: 'inv-4', invoice_number: 'INV-2026-0004', patient_id: 'P-004', patient_name: 'Emeka Nwosu',
    department: 'Pharmacy', status: 'overdue', issue_date: subDays(now, 40).toISOString(),
    due_date: subDays(now, 10).toISOString(), subtotal: 12500, tax: 937.5, discount: 0,
    total: 13437.5, amount_paid: 0, balance_due: 13437.5,
    items: [
      { id: 'ii-10', invoice_id: 'inv-4', description: 'Amoxicillin 500mg x30', category: 'pharmacy', quantity: 1, unit_price: 4500, total: 4500 },
      { id: 'ii-11', invoice_id: 'inv-4', description: 'Metformin 850mg x60', category: 'pharmacy', quantity: 1, unit_price: 8000, total: 8000 },
    ],
  },
  {
    id: 'inv-5', invoice_number: 'INV-2026-0005', patient_id: 'P-005', patient_name: 'Ngozi Adeyemi',
    department: 'Clinical', status: 'draft', issue_date: now.toISOString(),
    due_date: addDays(now, 30).toISOString(), subtotal: 22000, tax: 1650, discount: 0,
    total: 23650, amount_paid: 0, balance_due: 23650,
    items: [
      { id: 'ii-12', invoice_id: 'inv-5', description: 'General Consultation', category: 'consultation', quantity: 1, unit_price: 8000, total: 8000 },
      { id: 'ii-13', invoice_id: 'inv-5', description: 'ECG', category: 'procedure', quantity: 1, unit_price: 14000, total: 14000 },
    ],
  },
];

export const mockPayments: Payment[] = [
  { id: 'pay-1', invoice_id: 'inv-1', invoice_number: 'INV-2026-0001', patient_name: 'Amina Ibrahim', payment_date: subDays(now, 12).toISOString(), amount: 48375, method: 'insurance', reference_number: 'INS-78234', received_by: 'Front Desk Demo' },
  { id: 'pay-2', invoice_id: 'inv-2', invoice_number: 'INV-2026-0002', patient_name: 'Chidi Okonkwo', payment_date: subDays(now, 8).toISOString(), amount: 10000, method: 'cash', received_by: 'Front Desk Demo' },
  { id: 'pay-3', invoice_id: 'inv-2', invoice_number: 'INV-2026-0002', patient_name: 'Chidi Okonkwo', payment_date: subDays(now, 3).toISOString(), amount: 5000, method: 'mobile_money', reference_number: 'MM-99012', received_by: 'Front Desk Demo' },
];

export const mockInsuranceClaims: InsuranceClaim[] = [
  { id: 'clm-1', invoice_id: 'inv-1', claim_number: 'CLM-2026-0001', patient_name: 'Amina Ibrahim', insurance_provider: 'NHIS', policy_number: 'NHIS-2234567', diagnosis_codes: ['R10.9'], procedure_codes: ['76700'], amount_claimed: 48375, amount_approved: 48375, status: 'approved', submitted_at: subDays(now, 14).toISOString(), resolved_at: subDays(now, 12).toISOString() },
  { id: 'clm-2', invoice_id: 'inv-3', claim_number: 'CLM-2026-0002', patient_name: 'Fatima Bello', insurance_provider: 'Leadway Health', policy_number: 'LH-887654', diagnosis_codes: ['K35.80'], procedure_codes: ['47562', '99223'], amount_claimed: 188875, status: 'under_review', submitted_at: subDays(now, 4).toISOString() },
  { id: 'clm-3', claim_number: 'CLM-2026-0003', patient_name: 'Tunde Bakare', insurance_provider: 'AXA Mansard', policy_number: 'AXA-112233', diagnosis_codes: ['J06.9'], procedure_codes: ['99213'], amount_claimed: 15000, amount_approved: 10000, status: 'partially_approved', submitted_at: subDays(now, 20).toISOString(), resolved_at: subDays(now, 15).toISOString(), notes: 'Follow-up consultation not covered under plan' },
  { id: 'clm-4', claim_number: 'CLM-2026-0004', patient_name: 'Grace Okafor', insurance_provider: 'NHIS', policy_number: 'NHIS-3345678', diagnosis_codes: ['M54.5'], procedure_codes: ['72148'], amount_claimed: 65000, status: 'denied', submitted_at: subDays(now, 25).toISOString(), resolved_at: subDays(now, 18).toISOString(), denial_reason: 'Pre-authorization not obtained' },
];

// Revenue data for dashboard charts
export const monthlyRevenue = [
  { month: 'Sep', revenue: 1250000, collections: 980000, outstanding: 270000 },
  { month: 'Oct', revenue: 1480000, collections: 1200000, outstanding: 280000 },
  { month: 'Nov', revenue: 1320000, collections: 1100000, outstanding: 220000 },
  { month: 'Dec', revenue: 1650000, collections: 1350000, outstanding: 300000 },
  { month: 'Jan', revenue: 1520000, collections: 1280000, outstanding: 240000 },
  { month: 'Feb', revenue: 890000, collections: 620000, outstanding: 270000 },
];

export const revenueByDepartment = [
  { department: 'In-Patient', amount: 425000, color: 'hsl(var(--chart-1))' },
  { department: 'Radiology', amount: 285000, color: 'hsl(var(--chart-2))' },
  { department: 'Laboratory', amount: 198000, color: 'hsl(var(--chart-3))' },
  { department: 'Pharmacy', amount: 165000, color: 'hsl(var(--chart-4))' },
  { department: 'Consultation', amount: 142000, color: 'hsl(var(--chart-5))' },
];
