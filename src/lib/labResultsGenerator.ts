import { LabResult } from '@/types/dhos';

// Generate realistic mock results for a given test code
const resultTemplates: Record<string, () => LabResult[]> = {
  CBC: () => {
    const wbc = (4 + Math.random() * 9).toFixed(1);
    const rbc = (3.8 + Math.random() * 2.2).toFixed(1);
    const hgb = (11 + Math.random() * 6).toFixed(1);
    const hct = (33 + Math.random() * 16).toFixed(0);
    const plt = (140 + Math.random() * 300).toFixed(0);
    return [
      { testName: 'WBC', value: wbc, unit: 'x10^9/L', referenceRange: '4.5-11.0', flag: parseFloat(wbc) > 11 ? 'high' : parseFloat(wbc) < 4.5 ? 'low' : 'normal' },
      { testName: 'RBC', value: rbc, unit: 'x10^12/L', referenceRange: '4.0-5.5', flag: parseFloat(rbc) > 5.5 ? 'high' : parseFloat(rbc) < 4.0 ? 'low' : 'normal' },
      { testName: 'Hemoglobin', value: hgb, unit: 'g/dL', referenceRange: '12.0-16.0', flag: parseFloat(hgb) > 16 ? 'high' : parseFloat(hgb) < 12 ? 'low' : 'normal' },
      { testName: 'Hematocrit', value: hct, unit: '%', referenceRange: '36-46', flag: parseInt(hct) > 46 ? 'high' : parseInt(hct) < 36 ? 'low' : 'normal' },
      { testName: 'Platelets', value: plt, unit: 'x10^9/L', referenceRange: '150-400', flag: parseInt(plt) > 400 ? 'high' : parseInt(plt) < 150 ? 'low' : 'normal' },
    ];
  },
  BMP: () => {
    const glu = (65 + Math.random() * 80).toFixed(0);
    const na = (134 + Math.random() * 14).toFixed(0);
    const k = (3.3 + Math.random() * 2.2).toFixed(1);
    const cr = (0.6 + Math.random() * 1.0).toFixed(1);
    const bun = (6 + Math.random() * 22).toFixed(0);
    return [
      { testName: 'Glucose', value: glu, unit: 'mg/dL', referenceRange: '70-100', flag: parseInt(glu) > 100 ? 'high' : parseInt(glu) < 70 ? 'low' : 'normal' },
      { testName: 'Sodium', value: na, unit: 'mEq/L', referenceRange: '136-145', flag: parseInt(na) > 145 ? 'high' : parseInt(na) < 136 ? 'low' : 'normal' },
      { testName: 'Potassium', value: k, unit: 'mEq/L', referenceRange: '3.5-5.0', flag: parseFloat(k) > 5.0 ? 'high' : parseFloat(k) < 3.5 ? 'low' : 'normal' },
      { testName: 'Creatinine', value: cr, unit: 'mg/dL', referenceRange: '0.7-1.3', flag: parseFloat(cr) > 1.3 ? 'high' : parseFloat(cr) < 0.7 ? 'low' : 'normal' },
      { testName: 'BUN', value: bun, unit: 'mg/dL', referenceRange: '7-20', flag: parseInt(bun) > 20 ? 'high' : parseInt(bun) < 7 ? 'low' : 'normal' },
    ];
  },
  CMP: () => {
    const base = resultTemplates.BMP();
    const alt = (7 + Math.random() * 50).toFixed(0);
    const ast = (8 + Math.random() * 45).toFixed(0);
    const alb = (3.2 + Math.random() * 2.0).toFixed(1);
    return [
      ...base,
      { testName: 'ALT', value: alt, unit: 'U/L', referenceRange: '7-56', flag: parseInt(alt) > 56 ? 'high' : 'normal' },
      { testName: 'AST', value: ast, unit: 'U/L', referenceRange: '10-40', flag: parseInt(ast) > 40 ? 'high' : 'normal' },
      { testName: 'Albumin', value: alb, unit: 'g/dL', referenceRange: '3.5-5.5', flag: parseFloat(alb) > 5.5 ? 'high' : parseFloat(alb) < 3.5 ? 'low' : 'normal' },
    ];
  },
  LFT: () => {
    const alt = (8 + Math.random() * 55).toFixed(0);
    const ast = (10 + Math.random() * 48).toFixed(0);
    const alp = (40 + Math.random() * 90).toFixed(0);
    const tbil = (0.1 + Math.random() * 1.8).toFixed(1);
    return [
      { testName: 'ALT', value: alt, unit: 'U/L', referenceRange: '7-56', flag: parseInt(alt) > 56 ? 'high' : 'normal' },
      { testName: 'AST', value: ast, unit: 'U/L', referenceRange: '10-40', flag: parseInt(ast) > 40 ? 'high' : 'normal' },
      { testName: 'ALP', value: alp, unit: 'U/L', referenceRange: '44-147', flag: parseInt(alp) > 147 ? 'high' : parseInt(alp) < 44 ? 'low' : 'normal' },
      { testName: 'Total Bilirubin', value: tbil, unit: 'mg/dL', referenceRange: '0.1-1.2', flag: parseFloat(tbil) > 1.2 ? 'high' : 'normal' },
    ];
  },
  LIPID: () => {
    const tc = (140 + Math.random() * 120).toFixed(0);
    const ldl = (60 + Math.random() * 120).toFixed(0);
    const hdl = (30 + Math.random() * 50).toFixed(0);
    const tg = (50 + Math.random() * 200).toFixed(0);
    return [
      { testName: 'Total Cholesterol', value: tc, unit: 'mg/dL', referenceRange: '<200', flag: parseInt(tc) > 200 ? 'high' : 'normal' },
      { testName: 'LDL', value: ldl, unit: 'mg/dL', referenceRange: '<100', flag: parseInt(ldl) > 100 ? 'high' : 'normal' },
      { testName: 'HDL', value: hdl, unit: 'mg/dL', referenceRange: '>40', flag: parseInt(hdl) < 40 ? 'low' : 'normal' },
      { testName: 'Triglycerides', value: tg, unit: 'mg/dL', referenceRange: '<150', flag: parseInt(tg) > 150 ? 'high' : 'normal' },
    ];
  },
  TROP: () => {
    const val = (Math.random() * 0.08).toFixed(3);
    return [
      { testName: 'Troponin I', value: val, unit: 'ng/mL', referenceRange: '<0.04', flag: parseFloat(val) > 0.04 ? (parseFloat(val) > 0.1 ? 'critical' : 'high') : 'normal' },
    ];
  },
  BNP: () => {
    const val = (20 + Math.random() * 280).toFixed(0);
    return [
      { testName: 'BNP', value: val, unit: 'pg/mL', referenceRange: '<100', flag: parseInt(val) > 100 ? (parseInt(val) > 300 ? 'critical' : 'high') : 'normal' },
    ];
  },
  TSH: () => {
    const val = (0.2 + Math.random() * 5.5).toFixed(2);
    return [
      { testName: 'TSH', value: val, unit: 'mIU/L', referenceRange: '0.4-4.0', flag: parseFloat(val) > 4.0 ? 'high' : parseFloat(val) < 0.4 ? 'low' : 'normal' },
    ];
  },
  HBA1C: () => {
    const val = (4.5 + Math.random() * 4.5).toFixed(1);
    return [
      { testName: 'HbA1c', value: val, unit: '%', referenceRange: '<5.7', flag: parseFloat(val) > 6.5 ? 'high' : parseFloat(val) > 5.7 ? 'high' : 'normal' },
    ];
  },
  UA: () => {
    const ph = (4.5 + Math.random() * 4).toFixed(1);
    return [
      { testName: 'pH', value: ph, unit: '', referenceRange: '4.5-8.0', flag: 'normal' },
      { testName: 'Protein', value: Math.random() > 0.7 ? 'Trace' : 'Negative', unit: '', referenceRange: 'Negative', flag: Math.random() > 0.7 ? 'high' : 'normal' },
      { testName: 'Glucose', value: 'Negative', unit: '', referenceRange: 'Negative', flag: 'normal' },
      { testName: 'Leukocytes', value: Math.random() > 0.8 ? 'Positive' : 'Negative', unit: '', referenceRange: 'Negative', flag: Math.random() > 0.8 ? 'high' : 'normal' },
    ];
  },
  PT: () => {
    const val = (9.5 + Math.random() * 6).toFixed(1);
    return [
      { testName: 'Prothrombin Time', value: val, unit: 'seconds', referenceRange: '11.0-13.5', flag: parseFloat(val) > 13.5 ? 'high' : parseFloat(val) < 11 ? 'low' : 'normal' },
    ];
  },
  INR: () => {
    const val = (0.8 + Math.random() * 0.8).toFixed(1);
    return [
      { testName: 'INR', value: val, unit: '', referenceRange: '0.8-1.1', flag: parseFloat(val) > 1.1 ? 'high' : 'normal' },
    ];
  },
  MALARIA: () => {
    const positive = Math.random() > 0.6;
    return [
      { testName: 'Malaria Parasite', value: positive ? 'Positive' : 'Negative', unit: '', referenceRange: 'Negative', flag: positive ? 'critical' : 'normal' },
      ...(positive ? [{ testName: 'Parasite Density', value: (1000 + Math.random() * 50000).toFixed(0), unit: '/μL', referenceRange: 'N/A', flag: 'high' as const }] : []),
    ];
  },
  COVID: () => {
    const positive = Math.random() > 0.7;
    return [
      { testName: 'SARS-CoV-2 PCR', value: positive ? 'Detected' : 'Not Detected', unit: '', referenceRange: 'Not Detected', flag: positive ? 'critical' : 'normal' },
    ];
  },
  UC: () => [
    { testName: 'Urine Culture', value: Math.random() > 0.5 ? 'Growth detected' : 'No growth', unit: '', referenceRange: 'No growth', flag: Math.random() > 0.5 ? 'high' : 'normal' },
  ],
};

export function generateResultsForTests(testCodes: string[]): LabResult[] {
  const results: LabResult[] = [];
  for (const code of testCodes) {
    const generator = resultTemplates[code];
    if (generator) {
      results.push(...generator());
    }
  }
  return results;
}
