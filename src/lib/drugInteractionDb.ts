/**
 * Local drug interaction database — curated high-risk pairs that provide
 * instant, offline interaction warnings without relying on external APIs.
 *
 * Each entry maps a canonical drug-name pair to severity + clinical note.
 * Names are stored lowercase; lookup normalises input the same way.
 */

export interface LocalInteraction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  source: string;
}

// Key = sorted lowercase names joined by "|"
function pairKey(a: string, b: string): string {
  return [a.toLowerCase(), b.toLowerCase()].sort().join('|');
}

const DB = new Map<string, Omit<LocalInteraction, 'drug1' | 'drug2'>>([
  // ── Anticoagulants ────────────────────────────────────────────────
  [pairKey('warfarin', 'aspirin'), {
    severity: 'major',
    description: 'Concurrent use significantly increases the risk of bleeding, including gastrointestinal and intracranial hemorrhage.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('warfarin', 'ibuprofen'), {
    severity: 'major',
    description: 'NSAIDs increase anticoagulant effect and GI bleeding risk when combined with warfarin.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('warfarin', 'naproxen'), {
    severity: 'major',
    description: 'NSAIDs increase anticoagulant effect and GI bleeding risk when combined with warfarin.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('warfarin', 'fluconazole'), {
    severity: 'major',
    description: 'Fluconazole inhibits CYP2C9, markedly increasing warfarin levels and bleeding risk.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('warfarin', 'metronidazole'), {
    severity: 'major',
    description: 'Metronidazole inhibits warfarin metabolism, increasing INR and bleeding risk.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('warfarin', 'amiodarone'), {
    severity: 'major',
    description: 'Amiodarone inhibits warfarin metabolism; dose reduction of 30-50% typically required.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Serotonin syndrome risk ───────────────────────────────────────
  [pairKey('fluoxetine', 'tramadol'), {
    severity: 'major',
    description: 'Combined serotonergic activity may cause serotonin syndrome (agitation, hyperthermia, clonus).',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('sertraline', 'tramadol'), {
    severity: 'major',
    description: 'Combined serotonergic activity may precipitate serotonin syndrome.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('fluoxetine', 'linezolid'), {
    severity: 'contraindicated',
    description: 'Linezolid is a non-selective MAO inhibitor; combined with SSRIs causes serotonin syndrome.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('sertraline', 'linezolid'), {
    severity: 'contraindicated',
    description: 'Linezolid is a non-selective MAO inhibitor; combined with SSRIs causes serotonin syndrome.',
    source: 'Local Drug Interaction DB',
  }],

  // ── QT prolongation ──────────────────────────────────────────────
  [pairKey('amiodarone', 'azithromycin'), {
    severity: 'major',
    description: 'Both prolong the QT interval; combined use increases risk of torsades de pointes.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('ciprofloxacin', 'amiodarone'), {
    severity: 'major',
    description: 'Both prolong the QT interval; combined use increases risk of ventricular arrhythmias.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Metformin ─────────────────────────────────────────────────────
  [pairKey('metformin', 'contrast dye'), {
    severity: 'major',
    description: 'Iodinated contrast media with metformin may cause lactic acidosis; withhold metformin 48h before/after.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Potassium / ACE / Spironolactone ──────────────────────────────
  [pairKey('lisinopril', 'spironolactone'), {
    severity: 'major',
    description: 'Both increase serum potassium; combined use raises risk of life-threatening hyperkalemia.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('enalapril', 'spironolactone'), {
    severity: 'major',
    description: 'Both increase serum potassium; combined use raises risk of life-threatening hyperkalemia.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('lisinopril', 'potassium chloride'), {
    severity: 'moderate',
    description: 'ACE inhibitors reduce potassium excretion; supplementation may cause hyperkalemia.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Statins + inhibitors ──────────────────────────────────────────
  [pairKey('simvastatin', 'clarithromycin'), {
    severity: 'contraindicated',
    description: 'Clarithromycin strongly inhibits CYP3A4, causing dangerously elevated statin levels and rhabdomyolysis risk.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('atorvastatin', 'clarithromycin'), {
    severity: 'major',
    description: 'CYP3A4 inhibition increases statin exposure; risk of myopathy and rhabdomyolysis.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('simvastatin', 'amiodarone'), {
    severity: 'major',
    description: 'Amiodarone increases simvastatin exposure; max recommended dose is 20 mg/day.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Opioid combinations ───────────────────────────────────────────
  [pairKey('oxycodone', 'diazepam'), {
    severity: 'major',
    description: 'Concurrent opioid and benzodiazepine use increases risk of profound sedation, respiratory depression, and death.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('morphine', 'diazepam'), {
    severity: 'major',
    description: 'FDA black-box warning: concurrent opioid and benzodiazepine use increases risk of profound sedation, respiratory depression, coma, and death.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('morphine', 'lorazepam'), {
    severity: 'major',
    description: 'Concurrent opioid and benzodiazepine use increases risk of profound sedation, respiratory depression, and death.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('fentanyl', 'alprazolam'), {
    severity: 'major',
    description: 'FDA black-box warning: combined opioid-benzodiazepine use can cause fatal respiratory depression.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Common moderate interactions ──────────────────────────────────
  [pairKey('ciprofloxacin', 'calcium carbonate'), {
    severity: 'moderate',
    description: 'Divalent cations chelate fluoroquinolones, reducing absorption. Separate doses by ≥2 hours.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('levothyroxine', 'calcium carbonate'), {
    severity: 'moderate',
    description: 'Calcium decreases levothyroxine absorption. Separate administration by ≥4 hours.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('methotrexate', 'trimethoprim'), {
    severity: 'major',
    description: 'Both are folate antagonists; combined use increases risk of pancytopenia and bone marrow suppression.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('digoxin', 'amiodarone'), {
    severity: 'major',
    description: 'Amiodarone increases digoxin levels by ~70%; reduce digoxin dose by approximately 50%.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('clopidogrel', 'omeprazole'), {
    severity: 'major',
    description: 'Omeprazole inhibits CYP2C19 activation of clopidogrel, reducing its antiplatelet effect.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Fluoroquinolone chelation ─────────────────────────────────────
  [pairKey('ciprofloxacin', 'iron'), {
    severity: 'moderate',
    description: 'Iron chelates ciprofloxacin, significantly reducing oral bioavailability. Separate doses by ≥2 hours.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('ciprofloxacin', 'ferrous sulfate'), {
    severity: 'moderate',
    description: 'Iron salts chelate fluoroquinolones, reducing absorption by up to 50%. Separate doses by ≥2 hours.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('ciprofloxacin', 'magnesium'), {
    severity: 'moderate',
    description: 'Magnesium chelates ciprofloxacin, reducing absorption. Separate doses by ≥2 hours.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('ciprofloxacin', 'antacid'), {
    severity: 'moderate',
    description: 'Aluminum/magnesium antacids chelate ciprofloxacin, markedly reducing absorption. Separate by ≥2 hours.',
    source: 'Local Drug Interaction DB',
  }],

  // ── ACE inhibitor / ARB + potassium-related ───────────────────────
  [pairKey('lisinopril', 'potassium'), {
    severity: 'moderate',
    description: 'ACE inhibitors reduce potassium excretion; potassium supplementation increases hyperkalemia risk.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('enalapril', 'potassium chloride'), {
    severity: 'moderate',
    description: 'ACE inhibitors reduce potassium excretion; supplementation may cause hyperkalemia.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('lisinopril', 'ibuprofen'), {
    severity: 'moderate',
    description: 'NSAIDs reduce antihypertensive effect and may impair renal function when combined with ACE inhibitors.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('lisinopril', 'naproxen'), {
    severity: 'moderate',
    description: 'NSAIDs reduce antihypertensive effect and may impair renal function when combined with ACE inhibitors.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Lithium interactions ──────────────────────────────────────────
  [pairKey('lithium', 'ibuprofen'), {
    severity: 'major',
    description: 'NSAIDs decrease renal lithium clearance, potentially causing lithium toxicity (tremor, confusion, seizures).',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('lithium', 'naproxen'), {
    severity: 'major',
    description: 'NSAIDs decrease renal lithium clearance, increasing risk of lithium toxicity.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('lithium', 'lisinopril'), {
    severity: 'major',
    description: 'ACE inhibitors decrease lithium clearance; monitor lithium levels closely and adjust dose.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Anticonvulsant + CYP inhibitor ────────────────────────────────
  [pairKey('phenytoin', 'fluconazole'), {
    severity: 'major',
    description: 'Fluconazole inhibits CYP2C9, increasing phenytoin levels and risk of toxicity (nystagmus, ataxia).',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('carbamazepine', 'erythromycin'), {
    severity: 'major',
    description: 'Erythromycin inhibits CYP3A4 metabolism of carbamazepine, risking toxicity (diplopia, ataxia, drowsiness).',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('carbamazepine', 'clarithromycin'), {
    severity: 'major',
    description: 'Clarithromycin inhibits CYP3A4 metabolism of carbamazepine, causing elevated levels and CNS toxicity.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Metformin extended ────────────────────────────────────────────
  [pairKey('metformin', 'alcohol'), {
    severity: 'major',
    description: 'Alcohol potentiates the effect of metformin on lactate metabolism, increasing lactic acidosis risk.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Amlodipine interactions ───────────────────────────────────────
  [pairKey('amlodipine', 'simvastatin'), {
    severity: 'moderate',
    description: 'Amlodipine increases simvastatin exposure; simvastatin dose should not exceed 20 mg/day.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('amlodipine', 'clarithromycin'), {
    severity: 'moderate',
    description: 'CYP3A4 inhibition by clarithromycin may increase amlodipine levels, causing hypotension.',
    source: 'Local Drug Interaction DB',
  }],

  // ── SSRI + NSAID bleeding risk ────────────────────────────────────
  [pairKey('fluoxetine', 'ibuprofen'), {
    severity: 'moderate',
    description: 'SSRIs impair platelet function; combined with NSAIDs, GI bleeding risk increases 3-fold.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('sertraline', 'ibuprofen'), {
    severity: 'moderate',
    description: 'SSRIs impair platelet function; combined with NSAIDs, GI bleeding risk increases significantly.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('fluoxetine', 'aspirin'), {
    severity: 'moderate',
    description: 'Both impair hemostasis; combined use significantly increases risk of GI bleeding.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Insulin + beta-blocker ────────────────────────────────────────
  [pairKey('insulin glargine', 'metoprolol'), {
    severity: 'moderate',
    description: 'Beta-blockers mask hypoglycemia symptoms (tachycardia, tremor) and may prolong hypoglycemic episodes.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('insulin glargine', 'propranolol'), {
    severity: 'moderate',
    description: 'Non-selective beta-blockers mask hypoglycemia signs and impair glucose recovery.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Omeprazole extended ───────────────────────────────────────────
  [pairKey('omeprazole', 'methotrexate'), {
    severity: 'major',
    description: 'PPIs inhibit renal elimination of methotrexate, increasing toxicity risk especially at high doses.',
    source: 'Local Drug Interaction DB',
  }],

  // ── Minor interactions ────────────────────────────────────────────
  [pairKey('omeprazole', 'metformin'), {
    severity: 'minor',
    description: 'Omeprazole may slightly increase metformin absorption; generally not clinically significant.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('amlodipine', 'omeprazole'), {
    severity: 'minor',
    description: 'Minimal CYP interaction; no dosage adjustment typically required but monitor blood pressure.',
    source: 'Local Drug Interaction DB',
  }],
  [pairKey('paracetamol', 'amoxicillin'), {
    severity: 'minor',
    description: 'No significant pharmacokinetic interaction; safe to co-administer at standard doses.',
    source: 'Local Drug Interaction DB',
  }],
]);

/** Strip dosage info from a medication name to get the drug name */
/** Common salt/ester suffixes to strip for matching */
const SALT_SUFFIXES = [
  'sulfate', 'sulphate', 'hydrochloride', 'hcl', 'sodium', 'potassium',
  'acetate', 'maleate', 'besylate', 'mesylate', 'tartrate', 'citrate',
  'fumarate', 'succinate', 'phosphate', 'chloride', 'bromide', 'nitrate',
  'gluconate', 'carbonate', 'oxide', 'disodium',
];

function normaliseName(name: string): string {
  let n = name
    .replace(/\s*\d+[\d.]*\s*m?g.*$/i, '')
    .replace(/\s*\(.*\)$/, '')
    .trim()
    .toLowerCase();
  // Strip salt suffixes to get base ingredient
  for (const suffix of SALT_SUFFIXES) {
    n = n.replace(new RegExp(`\\s+${suffix}$`, 'i'), '');
  }
  return n.trim();
}

/**
 * Look up interactions for all pairs in a list of medication names.
 * Returns matches instantly — no network call.
 */
export function checkLocalInteractions(medicationNames: string[]): LocalInteraction[] {
  if (medicationNames.length < 2) return [];
  const names = medicationNames.map(normaliseName);
  const results: LocalInteraction[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const key = pairKey(names[i], names[j]);
      if (seen.has(key)) continue;
      seen.add(key);
      const match = DB.get(key);
      if (match) {
        results.push({
          drug1: medicationNames[i],
          drug2: medicationNames[j],
          ...match,
        });
      }
    }
  }

  return results;
}
