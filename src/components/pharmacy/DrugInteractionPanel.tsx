import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ShieldAlert, CheckCircle2, Loader2, Database, Globe, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkLocalInteractions, LocalInteraction } from '@/lib/drugInteractionDb';
import { fetchDrugInteractionsLabel } from '@/lib/openFdaApi';
import { getRxCUI, getIngredientRxCUI, getDrugInfo } from '@/lib/rxNormApi';

interface ParsedInteraction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  source: string;
}

interface FdaInteractionNote {
  drug: string;
  text: string;
}

type SeverityFilter = 'all' | 'major_up' | 'contraindicated' | 'minor';

interface DrugInteractionPanelProps {
  medications: string[];
  compact?: boolean;
}

const severityConfig = {
  contraindicated: { color: 'bg-destructive text-destructive-foreground', icon: ShieldAlert, label: 'Contraindicated' },
  major: { color: 'bg-destructive/10 text-destructive border border-destructive/20', icon: ShieldAlert, label: 'Major' },
  moderate: { color: 'bg-warning/10 text-warning border border-warning/20', icon: AlertTriangle, label: 'Moderate' },
  minor: { color: 'bg-muted text-muted-foreground', icon: AlertTriangle, label: 'Minor' },
};

/** Strip dosage from name for FDA lookup */
function cleanName(name: string): string {
  return name.replace(/\s*\d+[\d.]*\s*m?g.*$/i, '').replace(/\s*\(.*\)$/, '').trim();
}

export function DrugInteractionPanel({ medications, compact = false }: DrugInteractionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<ParsedInteraction[]>([]);
  const [fdaNotes, setFdaNotes] = useState<FdaInteractionNote[]>([]);
  const [checked, setChecked] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  const filteredInteractions = useMemo(() => {
    if (severityFilter === 'all') return interactions;
    if (severityFilter === 'contraindicated') return interactions.filter(i => i.severity === 'contraindicated');
    if (severityFilter === 'minor') return interactions.filter(i => i.severity === 'minor');
    // major_up = major + contraindicated
    return interactions.filter(i => i.severity === 'major' || i.severity === 'contraindicated');
  }, [interactions, severityFilter]);

  useEffect(() => {
    if (medications.length < 2) {
      setInteractions([]);
      setFdaNotes([]);
      setChecked(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);

      // Layer 1 — instant local database lookup
      const localResults: ParsedInteraction[] = checkLocalInteractions(medications);

      if (!cancelled) setInteractions(localResults);

      // Layer 2 — fetch FDA label drug_interactions for each med (async, non-blocking)
      try {
        const names = medications.map(cleanName);
        const uniqueNames = [...new Set(names.map(n => n.toLowerCase()))];

        const fdaResults = await Promise.all(
          uniqueNames.map(async name => {
            const sections = await fetchDrugInteractionsLabel(name);
            if (!sections || sections.length === 0) return null;
            // Truncate to first 300 chars for compact display
            const text = sections.join(' ').slice(0, 300) + (sections.join(' ').length > 300 ? '…' : '');
            return { drug: name, text } as FdaInteractionNote;
          })
        );

        if (!cancelled) {
          setFdaNotes(fdaResults.filter(Boolean) as FdaInteractionNote[]);
        }
      } catch {
        // FDA notes are supplementary — don't fail the panel
      }

      if (!cancelled) {
        setChecked(true);
        setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [medications.join('|')]);

  if (medications.length < 2 && !compact) return null;

  const hasResults = filteredInteractions.length > 0 || fdaNotes.length > 0;

  const filterButtons: { value: SeverityFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'major_up', label: 'Major+' },
    { value: 'contraindicated', label: 'Contraindicated' },
    { value: 'minor', label: 'Minor' },
  ];

  // ── Compact mode ───────────────────────────────────────────────────
  if (compact) {
    if (loading && interactions.length === 0) {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking drug interactions…
        </div>
      );
    }
    if (checked && !hasResults) {
      return (
        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 p-2 bg-green-500/10 rounded">
          <CheckCircle2 className="h-3 w-3" />
          No known interactions found
        </div>
      );
    }
    if (filteredInteractions.length > 0) {
      return (
        <div className="space-y-1.5">
          {filteredInteractions.map((inter, i) => {
            const cfg = severityConfig[inter.severity];
            const Icon = cfg.icon;
            return (
              <div key={i} className={cn('flex items-start gap-2 text-xs p-2 rounded', cfg.color)}>
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{cfg.label}: {inter.drug1} ↔ {inter.drug2}</span>
                  <p className="mt-0.5 opacity-90">{inter.description}</p>
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Loading FDA data…
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  // ── Full card mode ─────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Drug Interaction Check
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            {filterButtons.map(fb => (
              <Button
                key={fb.value}
                variant={severityFilter === fb.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setSeverityFilter(fb.value)}
              >
                {fb.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && interactions.length === 0 && (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}

        {checked && !hasResults && !loading && (
          <div className="flex items-center gap-2 text-sm p-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            No known interactions found between these medications.
          </div>
        )}

        {/* Local DB interactions */}
        {filteredInteractions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="h-3 w-3" /> Clinical Interaction Database
              {severityFilter !== 'all' && interactions.length !== filteredInteractions.length && (
                <span className="ml-auto text-[10px]">Showing {filteredInteractions.length} of {interactions.length}</span>
              )}
            </div>
            {filteredInteractions.map((inter, i) => {
              const cfg = severityConfig[inter.severity];
              const Icon = cfg.icon;
              return (
                <div key={i} className={cn('flex items-start gap-3 p-3 rounded-lg', cfg.color)}>
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{inter.drug1} ↔ {inter.drug2}</span>
                      <Badge className={cn('text-xs', cfg.color)}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs mt-1 opacity-90">{inter.description}</p>
                    <p className="text-[10px] mt-1 opacity-60">Source: {inter.source}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FDA label interaction notes */}
        {fdaNotes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" /> FDA Label — Drug Interactions
            </div>
            {fdaNotes.map((note, i) => (
              <div key={i} className="text-xs p-3 rounded-lg bg-muted/40 border border-border">
                <span className="font-medium capitalize">{note.drug}</span>
                <p className="mt-1 text-muted-foreground leading-relaxed">{note.text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
