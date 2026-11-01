import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookMarked, Copy, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CodeSystem, terminologyEntries } from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const SYSTEMS: CodeSystem[] = ['ICD-10', 'SNOMED CT', 'LOINC', 'ATC'];

const SYSTEM_STYLE: Record<CodeSystem, string> = {
  'ICD-10': 'bg-primary/10 text-primary border-primary/30',
  'SNOMED CT': 'bg-info/10 text-info border-info/30',
  LOINC: 'bg-success/10 text-success border-success/30',
  ATC: 'bg-warning/10 text-warning border-warning/30',
};

const SYSTEM_NOTE: Record<CodeSystem, string> = {
  'ICD-10': 'Diagnoses and problem list',
  'SNOMED CT': 'Clinical findings and procedures',
  LOINC: 'Observations and laboratory results',
  ATC: 'Medications and prescribing',
};

export function TerminologyPanel() {
  const [query, setQuery] = useState('');
  const [system, setSystem] = useState<'all' | CodeSystem>('all');

  const counts = useMemo(
    () =>
      SYSTEMS.reduce<Record<CodeSystem, number>>(
        (acc, entry) => ({
          ...acc,
          [entry]: terminologyEntries.filter((item) => item.system === entry).length,
        }),
        { 'ICD-10': 0, 'SNOMED CT': 0, LOINC: 0, ATC: 0 },
      ),
    [],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return terminologyEntries.filter((entry) => {
      const matchesSystem = system === 'all' || entry.system === system;
      const matchesTerm =
        term.length === 0 ||
        entry.code.toLowerCase().includes(term) ||
        entry.display.toLowerCase().includes(term) ||
        entry.chapter.toLowerCase().includes(term);
      return matchesSystem && matchesTerm;
    });
  }, [query, system]);

  const copyCode = async (code: string, display: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied', { description: `${code} · ${display}` });
    } catch {
      toast.error('Clipboard unavailable', { description: `Copy the code manually: ${code}` });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookMarked className="h-5 w-5 text-primary" />
          Terminology &amp; clinical coding
        </h2>
        <p className="text-sm text-muted-foreground">
          Diagnoses use ICD-10, findings and procedures SNOMED CT, observations LOINC and medicines ATC
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SYSTEMS.map((entry) => (
          <Card key={entry}>
            <CardContent className="pt-4">
              <p className="text-xl font-bold leading-tight">{counts[entry]}</p>
              <p className="text-xs font-medium">{entry}</p>
              <p className="text-[11px] text-muted-foreground">{SYSTEM_NOTE[entry]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search code, term or chapter…"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSystem('all')}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              system === 'all'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            All systems
          </button>
          {SYSTEMS.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setSystem(entry)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                system === entry
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No codes match this search. Try a broader term.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">System</th>
                    <th className="py-2 pr-3 font-medium">Code</th>
                    <th className="py-2 pr-3 font-medium">Display</th>
                    <th className="py-2 pr-3 font-medium">Chapter</th>
                    <th className="py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={`${entry.system}-${entry.code}`} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', SYSTEM_STYLE[entry.system])}>
                          {entry.system}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{entry.code}</td>
                      <td className="py-2 pr-3">{entry.display}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{entry.chapter}</td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => copyCode(entry.code, entry.display)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">{filtered.length} shown</Badge>
            <span>Codes are shared across problems, orders, results and prescriptions.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
