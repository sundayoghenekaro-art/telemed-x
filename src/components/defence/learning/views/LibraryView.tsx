import { useMemo, useState } from 'react';
import {
  ArrowUpRight, Download, Filter, Lock, Search, Sparkles, X,
} from 'lucide-react';
import {
  filterVisible, formatClock, getRecord, CONTENT_KIND_LABEL,
} from '@/lib/defenceLearning';
import { cn } from '@/lib/utils';
import {
  ClearancePill, EmptyState, FilterChip, KIND_ICON, Meter, MotifArt, Pill, Surface,
} from '../hubUi';
import { CHANNELS } from '@/data/defenceLearningMockData';
import type { HubApi } from '../hubApi';

type SortKey = 'recent' | 'duration' | 'title';

export function LibraryView({ hub }: { hub: HubApi }) {
  const { persona } = hub;
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<string>('all');
  const [kind, setKind] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('recent');

  const visible = filterVisible(persona, hub.items);

  const filtered = useMemo(() => {
    const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
    const results = visible.filter((item) => {
      if (channel !== 'all' && item.channelId !== channel) return false;
      if (kind !== 'all' && item.kind !== kind) return false;
      if (tokens.length === 0) return true;
      const haystack = `${item.title} ${item.summary} ${item.tags.join(' ')} ${item.publisher.department}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
    return results.sort((a, b) => {
      if (sort === 'duration') return a.durationSec - b.durationSec;
      if (sort === 'title') return a.title.localeCompare(b.title);
      return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
    });
  }, [visible, channel, kind, search, sort]);

  return (
    <div className="space-y-6">
      <Surface className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill tone="sky">Content library</Pill>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Approved learning content</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/50">
              Everything here is published, verified and scoped to your clearance, branch, unit and training path.
              Draft, in-review, withdrawn and superseded records are not listed.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/45">
            <Lock className="h-4 w-4 text-sky-300" />
            {visible.length} records in your scope
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles, summaries, tags or publisher"
              className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-9 text-sm text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white/50">
              <Filter className="h-4 w-4" />
              <select value={kind} onChange={(event) => setKind(event.target.value)} className="bg-transparent text-xs text-white outline-none">
                <option value="all" className="bg-slate-900">All formats</option>
                {Object.entries(CONTENT_KIND_LABEL).map(([value, label]) => (
                  <option key={value} value={value} className="bg-slate-900">{label}</option>
                ))}
              </select>
            </label>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white/50">
              Sort
              <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="bg-transparent text-xs text-white outline-none">
                <option value="recent" className="bg-slate-900">Newest</option>
                <option value="duration" className="bg-slate-900">Shortest</option>
                <option value="title" className="bg-slate-900">A–Z</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={channel === 'all'} onClick={() => setChannel('all')}>All channels</FilterChip>
          {CHANNELS.map((definition) => (
            <FilterChip key={definition.id} active={channel === definition.id} onClick={() => setChannel(definition.id)}>
              {definition.label}
            </FilterChip>
          ))}
        </div>
      </Surface>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No content matches those filters"
          description="Try a different channel, format or search term. Content outside your clearance or audience scope is never shown, even as a title."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const record = getRecord(hub.ledger, persona.id, item.id);
            const Icon = KIND_ICON[item.kind];
            return (
              <Surface key={item.id} interactive className="group overflow-hidden">
                <button type="button" onClick={() => hub.openItem(item.id)} className="block w-full text-left">
                  <MotifArt item={item} className="h-36 w-full rounded-none border-0 border-b border-white/10" />
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill tone="slate">
                        <Icon className="h-3 w-3" /> {CONTENT_KIND_LABEL[item.kind]}
                      </Pill>
                      <ClearancePill clearance={item.classification} />
                      {item.mandatory && <Pill tone="rose">Mandatory</Pill>}
                      {item.acknowledgementRequired && <Pill tone="amber">Ack</Pill>}
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-white">{item.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/45">{item.summary}</p>

                    <div className="mt-4 flex items-center justify-between text-[11px] text-white/35">
                      <span className="flex items-center gap-2">
                        {formatClock(item.durationSec)}
                        <span className="text-white/15">·</span>
                        v{item.version}
                        {item.downloadPolicy === 'view_only' && (
                          <span className="flex items-center gap-1 text-amber-300/70"><Lock className="h-3 w-3" /> View only</span>
                        )}
                        {item.downloadPolicy === 'allowed' && <Download className="h-3 w-3" />}
                      </span>
                      {item.sourceType !== 'official' && (
                        <span className="flex items-center gap-1 text-amber-300/80"><Sparkles className="h-3 w-3" /> AI-assisted</span>
                      )}
                    </div>

                    {record && (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-[10px] text-white/35">
                          <span>{record.completedAt ? 'Completed' : 'In progress'}</span>
                          <span>{record.percent}%</span>
                        </div>
                        <Meter value={record.percent} tone={record.completedAt ? 'emerald' : 'sky'} />
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-white/25">{item.competenceLevel}</span>
                      <span className="flex items-center gap-1 text-xs font-medium text-sky-300 opacity-70 transition-opacity group-hover:opacity-100">
                        {record ? 'Continue' : 'Open'} <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              </Surface>
            );
          })}
        </div>
      )}

      <div className={cn('rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 text-[11px] leading-relaxed text-white/35')}>
        Restricted records are hidden by policy rather than by a client-side filter. The migration ships row-level policies
        that apply the same clearance, branch, unit and training-group checks inside the database, so a crafted query cannot
        reveal titles or metadata that fall outside your scope.
      </div>
    </div>
  );
}
