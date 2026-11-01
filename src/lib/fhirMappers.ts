import { Patient, VitalSigns } from '@/types/dhos';
import type { FhirPatientResource, FhirObservationResource } from './fhirApi';

// LOINC codes for vital signs
const LOINC = {
  HEART_RATE: '8867-4',
  BP_PANEL: '85354-9',
  BP_SYSTOLIC: '8480-6',
  BP_DIASTOLIC: '8462-4',
  TEMPERATURE: '8310-5',
  SPO2: '2708-6',
  RESP_RATE: '9279-1',
};

export function fhirPatientToLocal(fhir: FhirPatientResource): Patient {
  const name = fhir.name?.[0];
  return {
    upid: `FHIR-${fhir.id ?? 'unknown'}`,
    firstName: name?.given?.[0] ?? name?.text?.split(' ')[0] ?? 'Unknown',
    lastName: name?.family ?? name?.text?.split(' ').slice(1).join(' ') ?? 'Unknown',
    dateOfBirth: fhir.birthDate ?? '1900-01-01',
    gender: (['male', 'female'].includes(fhir.gender ?? '') ? fhir.gender : 'other') as Patient['gender'],
    bloodType: undefined,
    allergies: [],
    status: 'stable',
    lastVisit: fhir.meta?.lastUpdated?.split('T')[0],
  };
}

export function localPatientToFhir(patient: Patient): FhirPatientResource {
  return {
    resourceType: 'Patient',
    name: [{
      use: 'official',
      family: patient.lastName,
      given: [patient.firstName],
    }],
    gender: patient.gender,
    birthDate: patient.dateOfBirth,
    identifier: [{
      system: 'urn:dhos:upid',
      value: patient.upid,
    }],
  };
}

export function fhirObservationsToVitals(observations: FhirObservationResource[]): VitalSigns[] {
  // Group observations by timestamp (rounded to nearest hour)
  const grouped = new Map<string, Partial<VitalSigns>>();

  for (const obs of observations) {
    const code = obs.code?.coding?.find(c => c.system === 'http://loinc.org')?.code;
    if (!code) continue;

    const ts = obs.effectiveDateTime ?? '';
    // Round to hour for grouping
    const key = ts.slice(0, 13) || ts;

    if (!grouped.has(key)) {
      grouped.set(key, { timestamp: ts });
    }
    const vitals = grouped.get(key)!;

    switch (code) {
      case LOINC.HEART_RATE:
        vitals.heartRate = obs.valueQuantity?.value;
        break;
      case LOINC.TEMPERATURE:
        vitals.temperature = obs.valueQuantity?.value;
        break;
      case LOINC.SPO2:
        vitals.oxygenSaturation = obs.valueQuantity?.value;
        break;
      case LOINC.RESP_RATE:
        vitals.respiratoryRate = obs.valueQuantity?.value;
        break;
      case LOINC.BP_PANEL:
        for (const comp of obs.component ?? []) {
          const compCode = comp.code?.coding?.find(c => c.system === 'http://loinc.org')?.code;
          if (compCode === LOINC.BP_SYSTOLIC) vitals.bloodPressureSystolic = comp.valueQuantity?.value;
          if (compCode === LOINC.BP_DIASTOLIC) vitals.bloodPressureDiastolic = comp.valueQuantity?.value;
        }
        break;
    }
  }

  return Array.from(grouped.values())
    .filter((v): v is VitalSigns => !!v.timestamp)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getFhirPatientDisplayName(fhir: FhirPatientResource): string {
  const name = fhir.name?.[0];
  if (name?.given && name?.family) {
    return `${name.given.join(' ')} ${name.family}`;
  }
  return name?.text ?? `Patient/${fhir.id}`;
}
