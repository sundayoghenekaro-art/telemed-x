// HAPI FHIR R4 Public Server API Client
const FHIR_BASE = 'https://hapi.fhir.org/baseR4';

export interface FhirPatientResource {
  resourceType: 'Patient';
  id?: string;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    text?: string;
  }>;
  gender?: string;
  birthDate?: string;
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  address?: Array<{
    use?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  identifier?: Array<{
    system?: string;
    value?: string;
  }>;
  meta?: {
    lastUpdated?: string;
    versionId?: string;
  };
}

export interface FhirObservationResource {
  resourceType: 'Observation';
  id?: string;
  status?: string;
  code?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  component?: Array<{
    code?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    };
    valueQuantity?: {
      value?: number;
      unit?: string;
    };
  }>;
  effectiveDateTime?: string;
  subject?: {
    reference?: string;
  };
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
}

export interface FhirBundle<T> {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: Array<{
    fullUrl?: string;
    resource: T;
  }>;
  link?: Array<{
    relation: string;
    url: string;
  }>;
}

async function fhirFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${FHIR_BASE}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/fhir+json',
      'Content-Type': 'application/fhir+json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`FHIR request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function searchPatients(query: string, count = 20): Promise<FhirBundle<FhirPatientResource>> {
  return fhirFetch<FhirBundle<FhirPatientResource>>(
    `/Patient?name=${encodeURIComponent(query)}&_count=${count}&_sort=-_lastUpdated`
  );
}

export async function getPatient(id: string): Promise<FhirPatientResource> {
  return fhirFetch<FhirPatientResource>(`/Patient/${id}`);
}

export async function getPatientObservations(patientId: string, count = 50): Promise<FhirBundle<FhirObservationResource>> {
  return fhirFetch<FhirBundle<FhirObservationResource>>(
    `/Observation?subject=Patient/${patientId}&_count=${count}&_sort=-date`
  );
}

export async function exportPatientToFhir(patient: FhirPatientResource): Promise<FhirPatientResource> {
  return fhirFetch<FhirPatientResource>('/Patient', {
    method: 'POST',
    body: JSON.stringify(patient),
  });
}
