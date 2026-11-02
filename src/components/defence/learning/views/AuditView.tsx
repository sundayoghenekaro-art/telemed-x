import { useMemo, useState } from 'react';
import {
  Activity, Download, FileClock, GitBranch, KeyRound, ScrollText, Search,
  ShieldCheck, Workflow,
} from 'lucide-react';
import {
  can, formatDate, toCsv, type AuditEvent, type PublicationEvent,
} from '@/lib/defenceLearning';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AccessDenied, EmptyState, FilterChip, MicroLabel, Pill, StatTile, Surface,
} from '../hubUi';
import type { HubApi } from '../hubApi';

type AuditFilter = 'all' | 'access' | 'publishing' | 'content';

const PUBLICATION_TONE: Record<PublicationEvent['action'], 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet'> = {
  created: 'slate',
  submitted: 'sky',
  approved: 'emerald',
  rejected: 'rose',
  published: 'emerald',
  withdrawn: 'rose',
  superseded: 'violet',
  derivative_flagged: 'amber',
};

const PUBLICATION_LABEL: Record<PublicationEvent['action'], string> = {
  created: 'Draft created',
  submitted: 'Submitted for review',
  approved: 'Reviewer approved',
  rejected: 'Reviewer rejected',
  published: 'Published',
  withdrawn: 'Withdrawn',
  superseded: 'Superseded',
  derivative_flagged: 'AI derivative flagged',
};

function classify(event: AuditEvent): Exclude<AuditFilter, 'all'> {
  const action = event.action.toLowerCase();
  if (action.includes('export') || action.includes('viewed') || action.includes('downloaded') || action.includes('accessed')) {
    return 'access';
  }
  if (action.includes('publish') || action.includes('review') || action.includes('draft') || action.includes('withdraw')) {
    return 'publishing';
  }
  return 'content';
}

const EXPORT_HEADERS = ['Timestamp', 'Actor', 'Action', 'Target', 'Detail'];

export function AuditView({ hub }: { hub: HubApi }) {
  const { persona } = hub;
  const allowed = can(persona.role, 'audit.view');
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [query, setQuery] = useState('');

  const events = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return hub.audit
      .filter((event) => (filter === 'all' ? true : classify(event) === filter))
      .filter((event) => {
        if (!needle) return true;
        return [event.actor, event.action, event.target, event.meta ?? '']
          .join(' ')
          .toLowerCase()
          .includes(needle);
      })
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [hub.audit, filter, query]);

  const publication = useMemo(
    () => hub.publication.slice().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [hub.publication],
  );

  if (!allowed) {
    return <AccessDenied capability="audit.view" role={persona.role} />;
  }

  const countBy = (kind: Exclude<AuditFilter, 'all'>) => hub.audit.filter((event) => classify(event) === kind).length;

  const exportAudit = () => {
    const rows = events.map((event) => [event.at, event.actor, event.action, event.target, event.meta ?? '']);
    const csv = toCsv(EXPORT_HEADERS, rows);
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `defence-learning-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    hub.addAudit(`${persona.rank} ${persona.name}`, 'exported audit trail', `Audit events — ${filter}`, `rows=${events.length}`);
    hub.notify('Audit extract exported. The export itself is written to the trail.', 'success');
  };

  const itemTitle = (contentId: string) => hub.items.find((item) => item.id === contentId)?.title ?? contentId;

  return (
    <div className="space-y-6">
      <Surface className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill tone="violet">Audit & lifecycle</Pill>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Audit trail</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/50">
              Every publish, withdrawal, acknowledgement, download and export is append-only. Entries record the actor,
              the action and the target, and are retained for the configured retention window.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="slate"><ShieldCheck className="h-3 w-3" /> audit.view</Pill>
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={exportAudit}>
              <Download className="mr-1.5 h-4 w-4" /> Export extract
            </Button>
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Audit events" value={hub.audit.length} detail="Append-only records" tone="violet" icon={ScrollText} />
        <StatTile label="Access & export" value={countBy('access')} detail="Views, downloads, exports" tone="sky" icon={KeyRound} />
        <StatTile label="Publishing" value={countBy('publishing')} detail="Review and release actions" tone="amber" icon={Workflow} />
        <StatTile label="Lifecycle events" value={hub.publication.length} detail="Draft → publish history" tone="emerald" icon={GitBranch} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Surface className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Event stream</h3>
              <p className="mt-0.5 text-xs text-white/40">{events.length} of {hub.audit.length} events</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 px-2 py-1">
              <Search className="h-3.5 w-3.5 text-white/35" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter actor or target"
                className="w-40 bg-transparent text-xs text-white outline-none placeholder:text-white/25"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-b border-white/5 px-5 py-3">
            {([
              ['all', 'All'],
              ['access', 'Access & export'],
              ['publishing', 'Publishing'],
              ['content', 'Content & jobs'],
            ] as [AuditFilter, string][]).map(([value, label]) => (
              <FilterChip key={value} active={filter === value} onClick={() => setFilter(value)}>{label}</FilterChip>
            ))}
          </div>
          <div className="max-h-[30rem] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={FileClock} title="No matching events" description="Adjust the filter or search to see audit records." />
              </div>
            ) : (
              <ol className="divide-y divide-white/5">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-3 px-5 py-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] text-white/40">
                      <Activity className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium text-white/85">{event.action}</p>
                        <Pill tone={classify(event) === 'access' ? 'sky' : classify(event) === 'publishing' ? 'amber' : 'slate'}>
                          {classify(event)}
                        </Pill>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-white/45">{event.target}</p>
                      {event.meta && <p className="mt-0.5 font-mono text-[10px] text-white/30">{event.meta}</p>}
                      <p className="mt-0.5 text-[10px] text-white/30">{event.actor} · {formatDate(event.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Surface>

        <Surface className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Publication trail</h3>
              <p className="mt-0.5 text-xs text-white/40">Draft → review → publish, with versions</p>
            </div>
            <Pill tone="emerald">{publication.length} events</Pill>
          </div>
          <div className="max-h-[30rem] overflow-y-auto">
            {publication.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={GitBranch} title="No publication history" description="Lifecycle events appear here once content enters the pipeline." />
              </div>
            ) : (
              <ol className="divide-y divide-white/5">
                {publication.map((event) => (
                  <li key={event.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={PUBLICATION_TONE[event.action]}>{PUBLICATION_LABEL[event.action]}</Pill>
                      <span className="font-mono text-[10px] text-white/35">v{event.version}</span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-white/85">{itemTitle(event.contentId)}</p>
                    <p className="mt-0.5 text-[11px] text-white/45">{event.note}</p>
                    <p className="mt-1 text-[10px] text-white/30">{event.actor} · {formatDate(event.at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Surface>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[10px] leading-relaxed text-white/35">
        <MicroLabel className="shrink-0">Retention</MicroLabel>
        Audit records are append-only. They capture the actor, action and target — never clinical notes or personal health
        data. Withdrawals keep the prior transcript and captions sealed under the retention policy rather than deleting
        them. Exports are themselves audited.
        <span className={cn('ml-auto shrink-0', 'font-mono text-white/25')}>retention: 7 years</span>
      </div>
    </div>
  );
}
