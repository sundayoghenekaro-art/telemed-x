import { useMemo, useState } from 'react';
import {
  BadgeCheck, BellRing, CheckCheck, FileText, Lock, Radio, ShieldCheck,
} from 'lucide-react';
import {
  CLEARANCE_RANK, formatDate,
} from '@/lib/defenceLearning';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ClearancePill, EmptyState, MicroLabel, Pill, Surface, clearanceLabel } from '../hubUi';
import type { HubApi } from '../hubApi';

export function UpdatesView({ hub }: { hub: HubApi }) {
  const { persona } = hub;
  const announcements = useMemo(
    () => hub.announcements
      .filter((announcement) => CLEARANCE_RANK[announcement.classification] <= CLEARANCE_RANK[persona.clearance])
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [hub.announcements, persona.clearance],
  );
  const [selectedId, setSelectedId] = useState<string | null>(announcements[0]?.id ?? null);
  const [read, setRead] = useState<string[]>([]);

  const selected = announcements.find((announcement) => announcement.id === selectedId) ?? announcements[0] ?? null;
  const unread = announcements.filter((announcement) => !read.includes(announcement.id)).length;
  const pendingAck = announcements.filter(
    (announcement) =>
      announcement.acknowledgementRequired && !hub.acknowledgedAnnouncements.includes(announcement.id),
  ).length;

  const open = (id: string) => {
    setSelectedId(id);
    setRead((current) => (current.includes(id) ? current : [...current, id]));
  };

  return (
    <div className="space-y-6">
      <Surface className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Pill tone="amber">Official HQ channel</Pill>
            <Pill tone="slate">{unread} unread</Pill>
            {pendingAck > 0 && <Pill tone="rose">{pendingAck} acknowledgement required</Pill>}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Official HQ Updates</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            Command and clinical announcements, distributed by audience. You only see updates cleared for your
            classification level — titles of out-of-scope updates are never returned to this surface.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/50">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          Verified publisher: Defence Health HQ
        </div>
      </Surface>

      {announcements.length === 0 ? (
        <EmptyState icon={BellRing} title="No updates in your scope" description="New HQ announcements will appear here when they match your clearance and audience." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-2">
            {announcements.map((announcement) => {
              const isRead = read.includes(announcement.id);
              const acknowledged = hub.acknowledgedAnnouncements.includes(announcement.id);
              return (
                <button
                  key={announcement.id}
                  type="button"
                  onClick={() => open(announcement.id)}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-colors',
                    selected?.id === announcement.id
                      ? 'border-sky-400/40 bg-sky-400/[0.08]'
                      : 'border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {!isRead && <span className="h-2 w-2 rounded-full bg-sky-400" />}
                      <ClearancePill clearance={announcement.classification} />
                    </div>
                    <span className="text-[10px] text-white/30">{formatDate(announcement.publishedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-snug text-white/90">{announcement.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">{announcement.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-white/35">
                    <FileText className="h-3 w-3" /> {announcement.readMinutes} min read
                    {announcement.acknowledgementRequired && (
                      <span className={acknowledged ? 'flex items-center gap-1 text-emerald-300' : 'flex items-center gap-1 text-amber-300'}>
                        <BadgeCheck className="h-3 w-3" /> {acknowledged ? 'Acknowledged' : 'Ack required'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <Surface className="overflow-hidden">
              <div className="border-b border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="amber">
                    <Radio className="h-3 w-3" /> {selected.channelId.replace('_', ' ')}
                  </Pill>
                  <ClearancePill clearance={selected.classification} />
                  <Pill tone="slate">{selected.readMinutes} min</Pill>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{selected.title}</h2>
                <p className="mt-2 text-xs text-white/40">
                  {selected.author} · published {formatDate(selected.publishedAt)}
                </p>
              </div>

              <div className="space-y-5 p-6">
                <p className="text-sm leading-7 text-white/70">{selected.body}</p>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <MicroLabel>Distribution</MicroLabel>
                  <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/35">Classification</dt>
                      <dd className="text-white/70">{clearanceLabel(selected.classification)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/35">Audience</dt>
                      <dd className="text-white/70">All branches matching clearance</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/35">Acknowledgement</dt>
                      <dd className="text-white/70">{selected.acknowledgementRequired ? 'Required' : 'Not required'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/35">Source</dt>
                      <dd className="text-white/70">Verified HQ publisher</dd>
                    </div>
                  </dl>
                </div>

                {selected.acknowledgementRequired ? (
                  hub.acknowledgedAnnouncements.includes(selected.id) ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-3 text-xs text-emerald-200">
                      <CheckCheck className="h-4 w-4" />
                      Acknowledgement recorded with timestamp and service number in the audit trail.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
                      <p className="text-xs text-amber-100/80">
                        This update requires an acknowledgement. The record is visible to your unit training officer.
                      </p>
                      <Button size="sm" className="bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => hub.acknowledgeAnnouncement(selected.id)}>
                        <Lock className="mr-1.5 h-3.5 w-3.5" /> Acknowledge
                      </Button>
                    </div>
                  )
                ) : (
                  <p className="text-[11px] text-white/35">No acknowledgement is required for this update.</p>
                )}

                <div className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/35">
                  Distribution scope is enforced server-side. If this update is withdrawn, it disappears from learner
                  surfaces immediately — the audit record remains.
                </div>
              </div>
            </Surface>
          )}
        </div>
      )}
    </div>
  );
}
