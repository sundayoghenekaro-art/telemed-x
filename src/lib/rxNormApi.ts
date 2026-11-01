const BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

export interface RxDrugConcept {
  rxcui: string;
  name: string;
  synonym: string;
  tty: string; // term type (IN=ingredient, SBD=branded, SCD=clinical drug, etc.)
}

export interface RxDrugGroup {
  name: string;
  conceptGroup: {
    tty: string;
    conceptProperties?: RxDrugConcept[];
  }[];
}

export interface RxInteractionPair {
  severity: string;
  description: string;
  interactionConcept: {
    minConceptItem: { rxcui: string; name: string };
    sourceConceptItem: { id: string; name: string; url: string };
  }[];
}

export interface RxInteractionGroup {
  sourceName: string;
  sourceDisclaimer: string;
  fullInteractionType: {
    comment: string;
    minConcept: { rxcui: string; name: string }[];
    interactionPair: RxInteractionPair[];
  }[];
}

async function rxFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Search drugs by name — returns concept groups with matching medications */
export async function searchDrugs(name: string): Promise<RxDrugConcept[]> {
  if (!name || name.length < 2) return [];
  const data = await rxFetch<{ drugGroup: RxDrugGroup }>(
    `/drugs.json?name=${encodeURIComponent(name)}`
  );
  if (!data?.drugGroup?.conceptGroup) return [];
  return data.drugGroup.conceptGroup
    .flatMap(g => g.conceptProperties ?? [])
    .slice(0, 25);
}

/** Resolve a drug name to its RxCUI */
export async function getRxCUI(drugName: string): Promise<string | null> {
  if (!drugName) return null;
  const data = await rxFetch<{ idGroup: { rxnormId?: string[] } }>(
    `/rxcui.json?name=${encodeURIComponent(drugName)}&search=2`
  );
  return data?.idGroup?.rxnormId?.[0] ?? null;
}

/** Check interactions between a list of RxCUIs */
export async function checkInteractions(rxcuis: string[]): Promise<RxInteractionGroup[]> {
  if (rxcuis.length < 2) return [];
  const data = await rxFetch<{ fullInteractionTypeGroup?: RxInteractionGroup[] }>(
    `/interaction/list.json?rxcuis=${rxcuis.join('+')}`
  );
  return data?.fullInteractionTypeGroup ?? [];
}

/** Get related drug info (ingredients, dose forms) for an RxCUI */
export async function getDrugInfo(rxcui: string): Promise<RxDrugConcept[]> {
  if (!rxcui) return [];
  const data = await rxFetch<{ relatedGroup: { conceptGroup: { tty: string; conceptProperties?: RxDrugConcept[] }[] } }>(
    `/rxcui/${rxcui}/related.json?tty=IN+DF+DFG`
  );
  if (!data?.relatedGroup?.conceptGroup) return [];
  return data.relatedGroup.conceptGroup.flatMap(g => g.conceptProperties ?? []);
}

/** Get the ingredient-level RxCUI for a given RxCUI (resolves branded/clinical drugs to their active ingredient) */
export async function getIngredientRxCUI(rxcui: string): Promise<string | null> {
  if (!rxcui) return null;
  const data = await rxFetch<{ relatedGroup: { conceptGroup: { tty: string; conceptProperties?: RxDrugConcept[] }[] } }>(
    `/rxcui/${rxcui}/related.json?tty=IN`
  );
  if (!data?.relatedGroup?.conceptGroup) return null;
  const ingredients = data.relatedGroup.conceptGroup.flatMap(g => g.conceptProperties ?? []);
  return ingredients[0]?.rxcui ?? null;
}

/** Parse RxNorm interaction severity string into our app's severity levels */
export function parseInteractionSeverity(severity: string): 'minor' | 'moderate' | 'major' | 'contraindicated' {
  const s = severity.toLowerCase();
  if (s.includes('contraindicated')) return 'contraindicated';
  if (s.includes('high') || s.includes('major') || s.includes('serious')) return 'major';
  if (s.includes('moderate') || s.includes('significant')) return 'moderate';
  return 'minor';
}
