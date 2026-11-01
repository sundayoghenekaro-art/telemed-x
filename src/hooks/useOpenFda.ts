import { useQuery } from '@tanstack/react-query';
import { fetchDrugLabel, fetchAdverseEvents, fetchDrugRecalls } from '@/lib/openFdaApi';

export function useDrugLabel(genericName: string | null) {
  return useQuery({
    queryKey: ['fda-label', genericName],
    queryFn: () => fetchDrugLabel(genericName!),
    enabled: !!genericName,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });
}

export function useAdverseEvents(genericName: string | null) {
  return useQuery({
    queryKey: ['fda-adverse', genericName],
    queryFn: () => fetchAdverseEvents(genericName!),
    enabled: !!genericName,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useDrugRecalls(limit = 20) {
  return useQuery({
    queryKey: ['fda-recalls', limit],
    queryFn: () => fetchDrugRecalls(limit),
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });
}
