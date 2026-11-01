import { useQuery } from '@tanstack/react-query';
import { searchDrugs, getRxCUI, checkInteractions, getDrugInfo } from '@/lib/rxNormApi';

export function useDrugSearch(name: string) {
  return useQuery({
    queryKey: ['rxnorm', 'search', name],
    queryFn: () => searchDrugs(name),
    enabled: name.length >= 2,
    staleTime: 1000 * 60 * 60, // 1 hour
    placeholderData: [],
  });
}

export function useRxCUI(drugName: string) {
  return useQuery({
    queryKey: ['rxnorm', 'rxcui', drugName],
    queryFn: () => getRxCUI(drugName),
    enabled: !!drugName,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useDrugInteractions(rxcuis: string[]) {
  const sorted = [...rxcuis].sort();
  return useQuery({
    queryKey: ['rxnorm', 'interactions', sorted],
    queryFn: () => checkInteractions(sorted),
    enabled: sorted.length >= 2,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useDrugInfo(rxcui: string) {
  return useQuery({
    queryKey: ['rxnorm', 'info', rxcui],
    queryFn: () => getDrugInfo(rxcui),
    enabled: !!rxcui,
    staleTime: 1000 * 60 * 60 * 24,
  });
}
