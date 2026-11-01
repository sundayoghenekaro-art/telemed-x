import { useQuery } from '@tanstack/react-query';
import { searchPatients, getPatient, getPatientObservations } from '@/lib/fhirApi';

export function useFhirPatientSearch(query: string) {
  return useQuery({
    queryKey: ['fhir', 'patients', query],
    queryFn: () => searchPatients(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useFhirPatient(id: string | null) {
  return useQuery({
    queryKey: ['fhir', 'patient', id],
    queryFn: () => getPatient(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useFhirObservations(patientId: string | null) {
  return useQuery({
    queryKey: ['fhir', 'observations', patientId],
    queryFn: () => getPatientObservations(patientId!),
    enabled: !!patientId,
    staleTime: 30_000,
    retry: 1,
  });
}
