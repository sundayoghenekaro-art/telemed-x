import { Prescription, Patient } from '@/types/dhos';

export interface AllergyAlert {
  prescriptionId: string;
  patientName: string;
  medication: string;
  allergy: string;
  severity: 'critical' | 'warning';
  message: string;
}

// Maps known drug classes/names to allergy triggers
// Key = allergy keyword (lowercase), Value = array of medication name patterns (lowercase)
export const ALLERGY_DRUG_MAP: Record<string, string[]> = {
  penicillin: ['amoxicillin', 'ampicillin', 'penicillin', 'piperacillin', 'flucloxacillin', 'nafcillin', 'dicloxacillin'],
  sulfa: ['sulfamethoxazole', 'trimethoprim', 'sulfasalazine', 'sulfadiazine', 'co-trimoxazole', 'bactrim'],
  aspirin: ['aspirin', 'acetylsalicylic'],
  nsaid: ['ibuprofen', 'naproxen', 'diclofenac', 'ketorolac', 'indomethacin', 'piroxicam', 'celecoxib'],
  iodine: ['povidone-iodine', 'iodine', 'amiodarone'],
  cephalosporin: ['ceftriaxone', 'cefuroxime', 'cephalexin', 'cefixime', 'ceftazidime', 'cefepime', 'cefotaxime'],
  eggs: ['influenza vaccine', 'yellow fever vaccine'],
  latex: ['latex'],
  codeine: ['codeine'],
  morphine: ['morphine'],
  tetracycline: ['tetracycline', 'doxycycline', 'minocycline'],
  erythromycin: ['erythromycin', 'azithromycin', 'clarithromycin'],
};

// Cross-reactivity rules (allergy to X may also react to Y)
export const CROSS_REACTIVITY: Record<string, { drugs: string[]; severity: 'warning' }> = {
  penicillin: {
    drugs: ['ceftriaxone', 'cefuroxime', 'cephalexin', 'cefixime', 'ceftazidime', 'cefepime', 'cefotaxime'],
    severity: 'warning',
  },
  aspirin: {
    drugs: ['ibuprofen', 'naproxen', 'diclofenac', 'ketorolac', 'indomethacin'],
    severity: 'warning',
  },
};

export function checkAllergyConflicts(
  prescription: Prescription,
  patients: Patient[]
): AllergyAlert[] {
  const patient = patients.find(p => p.upid === prescription.patientUpid);
  if (!patient || patient.allergies.length === 0) return [];

  const alerts: AllergyAlert[] = [];

  for (const item of prescription.items) {
    const medNameLower = item.medicationName.toLowerCase();

    for (const allergy of patient.allergies) {
      const allergyLower = allergy.toLowerCase();

      // Direct match: allergy maps to this drug
      const directDrugs = ALLERGY_DRUG_MAP[allergyLower];
      if (directDrugs?.some(drug => medNameLower.includes(drug))) {
        alerts.push({
          prescriptionId: prescription.id,
          patientName: prescription.patientName,
          medication: item.medicationName,
          allergy,
          severity: 'critical',
          message: `${item.medicationName} is contraindicated — patient has documented ${allergy} allergy`,
        });
        continue;
      }

      // Cross-reactivity match
      const crossReact = CROSS_REACTIVITY[allergyLower];
      if (crossReact?.drugs.some(drug => medNameLower.includes(drug))) {
        alerts.push({
          prescriptionId: prescription.id,
          patientName: prescription.patientName,
          medication: item.medicationName,
          allergy,
          severity: 'warning',
          message: `${item.medicationName} may cross-react with ${allergy} allergy — use with caution`,
        });
      }
    }
  }

  return alerts;
}

export function checkAllPrescriptions(
  prescriptions: Prescription[],
  patients: Patient[]
): AllergyAlert[] {
  return prescriptions.flatMap(rx => checkAllergyConflicts(rx, patients));
}
