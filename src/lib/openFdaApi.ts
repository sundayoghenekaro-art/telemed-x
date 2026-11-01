const BASE_URL = 'https://api.fda.gov/drug';

export interface FdaDrugLabel {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_type?: string[];
  };
  indications_and_usage?: string[];
  warnings_and_cautions?: string[];
  warnings?: string[];
  contraindications?: string[];
  dosage_and_administration?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  description?: string[];
}

export interface FdaAdverseEvent {
  term: string;
  count: number;
}

export interface FdaRecall {
  recall_number: string;
  reason_for_recall: string;
  status: string;
  classification: string;
  product_description: string;
  recalling_firm: string;
  city: string;
  state: string;
  recall_initiation_date: string;
  report_date: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
  };
}

async function fdaFetch<T>(endpoint: string, params: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}/${endpoint}?${params}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`FDA API error: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('openFDA fetch error:', err);
    return null;
  }
}

export async function fetchDrugLabel(genericName: string): Promise<FdaDrugLabel | null> {
  const encoded = encodeURIComponent(`"${genericName}"`);
  const data = await fdaFetch<{ results: FdaDrugLabel[] }>(
    'label.json',
    `search=openfda.generic_name:${encoded}&limit=1`
  );
  return data?.results?.[0] ?? null;
}

/**
 * Fetch the drug_interactions section from the FDA label for a given generic name.
 * Returns the raw text paragraphs describing interactions, or null if unavailable.
 */
export async function fetchDrugInteractionsLabel(genericName: string): Promise<string[] | null> {
  const label = await fetchDrugLabel(genericName);
  return label?.drug_interactions ?? null;
}

export async function fetchAdverseEvents(genericName: string): Promise<FdaAdverseEvent[]> {
  const encoded = encodeURIComponent(`"${genericName}"`);
  const data = await fdaFetch<{ results: FdaAdverseEvent[] }>(
    'event.json',
    `search=patient.drug.openfda.generic_name:${encoded}&count=patient.reaction.reactionmeddrapt.exact`
  );
  return data?.results?.slice(0, 15) ?? [];
}

export async function fetchDrugRecalls(limit = 20): Promise<FdaRecall[]> {
  const data = await fdaFetch<{ results: FdaRecall[] }>(
    'enforcement.json',
    `search=status:"Ongoing"&sort=report_date:desc&limit=${limit}`
  );
  return data?.results ?? [];
}
