import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { useDrugSearch } from '@/hooks/useRxNorm';
import { RxDrugConcept } from '@/lib/rxNormApi';

interface RxNormDrugSearchProps {
  onSelect: (drug: RxDrugConcept) => void;
  placeholder?: string;
  className?: string;
}

export function RxNormDrugSearch({ onSelect, placeholder = 'Search RxNorm medications...', className }: RxNormDrugSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [], isLoading } = useDrugSearch(debouncedQuery);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ttyLabels: Record<string, string> = {
    SBD: 'Branded',
    SCD: 'Clinical',
    IN: 'Ingredient',
    GPCK: 'Pack',
    BPCK: 'Branded Pack',
    PSN: 'Prescribable',
  };

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder={placeholder}
          className="pl-8 h-9"
        />
      </div>
      {open && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg">
          <ScrollArea className="max-h-64">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : results.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground text-center">No results found</p>
            ) : (
              <div className="p-1">
                {results.map(drug => (
                  <button
                    key={drug.rxcui}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent flex items-center justify-between gap-2"
                    onClick={() => { onSelect(drug); setQuery(''); setOpen(false); }}
                  >
                    <span className="truncate">{drug.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {ttyLabels[drug.tty] ?? drug.tty}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
