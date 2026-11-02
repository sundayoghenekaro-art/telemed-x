import { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, CloudOff, Download, HardDrive, Lock, RefreshCw,
  ShieldAlert, Trash2, Wifi, WifiOff,
} from 'lucide-react';
import type { ContentItem, DownloadEntry } from '@/lib/defenceLearning';
import {
  allowedQualities, canDownload, filterVisible, formatClock,
} from '@/lib/defenceLearning';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  EmptyState, KIND_ICON, Meter, MicroLabel, MotifArt, Pill, Surface,
} from '../hubUi';
import type { HubApi } from '../hubApi';

const STORAGE_BUDGET_MB = 512;

interface Draft {
  itemId: string;
  quality: '360p' | '720p' | '1080p';
  audioOnly: boolean;
  includeTranscript: boolean;
}

export function DownloadsView({ hub }: { hub: HubApi }) {
  const { persona } = hub;
  const visible = filterVisible(persona, hub.items);
  const entries = hub.downloads.filter((entry) => entry.personaId === persona.id);
  const [offline, setOffline] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const used = entries.filter((entry) => entry.status === 'ready').reduce((total, entry) => total + entry.sizeMb, 0);
  const usedPercent = Math.min(100, Math.round((used / STORAGE_BUDGET_MB) * 100));

  const downloadable = useMemo(
    () => visible.filter((item) => {
      if (!canDownload(persona, item)) return false;
      return !entries.some((entry) => entry.contentId === item.id && entry.status !== 'revoked');
    }),
    [visible, persona, entries],
  );

  const begin = () => {
    if (!draft) return;
    const item = hub.items.find((candidate) => candidate.id === draft.itemId);
    if (!item) return;
    const qualityFactor = draft.quality === '1080p' ? 1.6 : draft.quality === '720p' ? 1 : 0.45;
    const base = Math.max(3, Math.round(item.fileSizeMb * qualityFactor * (draft.audioOnly ? 0.18 : 1)));
    const entry: DownloadEntry = {
      id: `dl-${Date.now()}`,
      personaId: persona.id,
      contentId: item.id,
      quality: draft.quality,
      audioOnly: draft.audioOnly,
      includeTranscript: draft.includeTranscript,
      sizeMb: base,
      status: 'downloading',
      progress: 0,
      downloadedVersion: item.version,
      lastSyncAt: null,
    };
    hub.addDownload(entry);
    hub.addAudit(persona.name, 'requested download', `${item.title} — ${draft.quality}${draft.audioOnly ? ' audio only' : ''}`, 'policy=allowed');
    setDraft(null);

    [18, 42, 68, 88].forEach((progress, index) => {
      window.setTimeout(() => hub.updateDownload(entry.id, { progress }), 500 * (index + 1));
    });
    window.setTimeout(() => {
      hub.updateDownload(entry.id, { status: 'ready', progress: 100, lastSyncAt: new Date().toISOString() });
      hub.notify(`${item.title} is available offline.`, 'success');
    }, 2800);
  };

  return (
    <div className="space-y-6">
      <Surface className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill tone="sky">Downloads & offline</Pill>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Take training into the field</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/50">
              Downloads follow the publisher's policy: some items are downloadable, some are audio-only, and some are
              view-only. Access is revoked when your unit or clearance scope changes.
            </p>
          </div>
          <div className={cn('flex items-center gap-3 rounded-xl border px-4 py-3', offline ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-black/20')}>
            {offline ? <WifiOff className="h-4 w-4 text-amber-300" /> : <Wifi className="h-4 w-4 text-emerald-300" />}
            <div>
              <p className="text-xs font-medium text-white">{offline ? 'Offline mode' : 'Connected'}</p>
              <p className="text-[10px] text-white/40">{offline ? 'Only downloaded items are playable' : 'Streaming and downloads available'}</p>
            </div>
            <Switch checked={offline} onCheckedChange={setOffline} aria-label="Toggle offline mode" />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-white/60"><HardDrive className="h-4 w-4" /> Device storage</span>
            <span className="text-white/45">{used} MB of {STORAGE_BUDGET_MB} MB</span>
          </div>
          <Meter className="mt-3" value={usedPercent} tone={usedPercent > 85 ? 'rose' : usedPercent > 65 ? 'amber' : 'sky'} />
          <p className="mt-2 text-[10px] text-white/30">
            Download budget is enforced per device. New downloads are blocked when the budget is exhausted.
          </p>
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Stored on this device</h3>
              <p className="mt-0.5 text-xs text-white/40">{entries.length} items · text transcript included where selected</p>
            </div>
            <Pill tone={offline ? 'amber' : 'emerald'}>{offline ? 'Offline' : 'Synced'}</Pill>
          </div>

          {entries.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={CloudOff} title="Nothing downloaded yet" description="Choose an item from the download panel. Audio-only copies are useful when bandwidth is limited." />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {entries.map((entry) => {
                const item = visible.find((candidate) => candidate.id === entry.contentId);
                const stale = item ? entry.downloadedVersion !== item.version : false;
                const playable = item && visible.some((candidate) => candidate.id === item.id) && (entry.status === 'ready' || entry.status === 'downloading');
                return (
                  <div key={entry.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    {item ? <MotifArt item={item} className="h-14 w-24 shrink-0" /> : <div className="flex h-14 w-24 items-center justify-center rounded-xl border border-white/10 bg-white/5"><Lock className="h-5 w-5 text-white/30" /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{item?.title ?? 'Record no longer in your scope'}</p>
                        {entry.status === 'ready' && <Pill tone="emerald">Ready</Pill>}
                        {entry.status === 'downloading' && <Pill tone="sky">Downloading {entry.progress}%</Pill>}
                        {entry.status === 'revoked' && <Pill tone="rose">Revoked</Pill>}
                        {entry.status === 'failed' && <Pill tone="rose">Failed</Pill>}
                        {stale && <Pill tone="amber">Update available</Pill>}
                        {entry.audioOnly && <Pill tone="violet">Audio only</Pill>}
                      </div>
                      <p className="mt-0.5 text-[11px] text-white/35">
                        {item ? formatClock(item.durationSec) : '—'} · {entry.quality} · {entry.sizeMb} MB
                        {entry.includeTranscript ? ' · transcript' : ''} · v{entry.downloadedVersion}
                      </p>
                      {entry.status === 'downloading' && <Meter className="mt-2 max-w-sm" value={entry.progress} tone="sky" />}
                      {entry.failureReason && <p className="mt-1 text-[10px] text-rose-300/80">{entry.failureReason}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                        disabled={!playable}
                        onClick={() => {
                          if (!item) return;
                          if (offline) hub.notify('Opening from the local cache. Progress will sync when you reconnect.', 'info');
                          hub.openItem(item.id);
                        }}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Play
                      </Button>
                      {entry.status === 'ready' && item && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/50 hover:bg-white/10 hover:text-white"
                          onClick={() => {
                            hub.updateDownload(entry.id, { lastSyncAt: new Date().toISOString(), downloadedVersion: item.version });
                            hub.notify('Download re-synced with the current published version.', 'success');
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-300/70 hover:bg-rose-400/10 hover:text-rose-200"
                        onClick={() => {
                          hub.removeDownload(entry.id);
                          if (item) hub.addAudit(persona.name, 'removed download', item.title);
                          hub.notify('Download removed from this device.', 'info');
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>

        <div className="space-y-4">
          <Surface className="p-5">
            <MicroLabel>Download an item</MicroLabel>
            {downloadable.length === 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-white/40">
                Everything downloadable in your scope is already stored, or the publisher has restricted downloads.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {downloadable.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDraft({
                        itemId: item.id,
                        quality: item.downloadPolicy === 'audio_only' ? '360p' : '720p',
                        audioOnly: item.downloadPolicy === 'audio_only',
                        includeTranscript: true,
                      })
                    }
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                      draft?.itemId === item.id ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                    )}
                  >
                    <span className="text-white/40">{(() => { const Icon = KIND_ICON[item.kind]; return <Icon className="h-4 w-4" />; })()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-white/85">{item.title}</span>
                      <span className="text-[10px] text-white/35">{item.downloadPolicy === 'audio_only' ? 'Audio only policy' : 'Downloadable'}</span>
                    </span>
                    <span className="text-[10px] text-white/30">{item.fileSizeMb} MB</span>
                  </button>
                ))}
              </div>
            )}

            {draft && (
              <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white">Download options</p>
                  <span className="text-[10px] text-white/30">v{hub.items.find((item) => item.id === draft.itemId)?.version}</span>
                </div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-white/35">
                  Quality
                  <select
                    value={draft.quality}
                    onChange={(event) => setDraft({ ...draft, quality: event.target.value as Draft['quality'] })}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#0b1119] px-2 text-xs text-white outline-none"
                    disabled={draft.audioOnly}
                  >
                    {allowedQualities(hub.items.find((item) => item.id === draft.itemId) as ContentItem).map((quality) => (
                      <option key={quality} value={quality}>{quality}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center justify-between text-xs text-white/60">
                  Audio-only (low bandwidth)
                  <Switch checked={draft.audioOnly} onCheckedChange={(value) => setDraft({ ...draft, audioOnly: value })} />
                </label>
                <label className="flex items-center justify-between text-xs text-white/60">
                  Include transcript
                  <Switch checked={draft.includeTranscript} onCheckedChange={(value) => setDraft({ ...draft, includeTranscript: value })} />
                </label>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="ghost" className="flex-1 text-white/50 hover:bg-white/10 hover:text-white" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="flex-1 bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={begin}>
                    Download
                  </Button>
                </div>
              </div>
            )}
          </Surface>

          <Surface className="border-amber-400/20 bg-amber-400/[0.05] p-5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <p className="text-xs font-semibold text-white">Offline security rules</p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-white/50">
                  <li>Files are encrypted at rest and bound to the device enrolment.</li>
                  <li>View-only content is streamed with short-lived signed URLs and never cached.</li>
                  <li>Revocation is immediate when unit scope or clearance changes.</li>
                  <li>Playback is watermarked with your service number.</li>
                </ul>
              </div>
            </div>
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-white/30" />
              <p className="text-xs font-semibold text-white">Low-bandwidth mode</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/45">
              Audio-only downloads include the transcript when selected, so the content remains usable when a video stream
              is not practical. Progress events are queued offline and merged idempotently on reconnect.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-300/70">
              <CheckCircle2 className="h-3.5 w-3.5" /> Offline progress queue is idempotent
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
