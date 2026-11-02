import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Assessment,
  Attempt,
  CompetencySignoff,
  ContentItem,
  Persona,
  ProgressRecord,
  ProgressEvent,
} from '@/lib/defenceLearning';
import {
  competencyLadder,
  formatClock,
  formatDate,
  SOURCE_LABEL,
  STATUS_LABEL,
  formatDuration,
} from '@/lib/defenceLearning';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Bookmark, Check, CheckCircle2, ChevronRight, Captions, Download,
  FileCheck2, Gauge, HelpCircle, ListVideo, Lock, Pause, Play, RotateCcw,
  ShieldCheck, SkipBack, SkipForward, Sparkles, Timer, Volume2, X,
} from 'lucide-react';
import { ClearancePill, MicroLabel, MotifArt, Pill, ProgressRing, Surface } from './hubUi';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function currentCue(item: ContentItem, position: number) {
  let active = null;
  for (const cue of item.captions) {
    if (cue.startSec <= position) active = cue;
    if (cue.startSec > position) break;
  }
  return active;
}

export function LessonPlayer({
  item,
  persona,
  record,
  assessment,
  attempts,
  signoff,
  onClose,
  onRecord,
  onStartAssessment,
  onAskQuestion,
  onDownload,
}: {
  item: ContentItem;
  persona: Persona;
  record: ProgressRecord | null;
  assessment: Assessment | null;
  attempts: Attempt[];
  signoff: CompetencySignoff | null;
  onClose: () => void;
  onRecord: (positionSec: number, kind: ProgressEvent['kind']) => void;
  onStartAssessment?: () => void;
  onAskQuestion: () => void;
  onDownload?: () => void;
}) {
  const startAt = record?.completedAt ? 0 : Math.min(record?.positionSec ?? 0, item.durationSec - 1);
  const [position, setPosition] = useState(Math.max(0, startAt));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [tab, setTab] = useState<'chapters' | 'transcript' | 'bookmarks'>('chapters');
  const [search, setSearch] = useState('');
  const [bookmarks, setBookmarks] = useState<{ id: string; at: number; label: string }[]>([]);
  const [resumeNotice, setResumeNotice] = useState(Boolean(record && record.positionSec > 15 && !record.completedAt));
  const [acknowledged, setAcknowledged] = useState(Boolean(record?.acknowledgedAt));

  const positionRef = useRef(position);
  const lastBeatRef = useRef(0);
  const finishedRef = useRef(Boolean(record?.completedAt));
  const watermark = useMemo(
    () => `${persona.serviceNumber} · ${new Date().toISOString().slice(11, 19)}Z`,
    [persona.serviceNumber],
  );

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setPosition((current) => {
        const next = Math.min(item.durationSec, current + speed);
        if (next >= item.durationSec) setPlaying(false);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, speed, item.durationSec]);

  useEffect(() => {
    if (position >= item.durationSec && !finishedRef.current) {
      finishedRef.current = true;
      onRecord(item.durationSec, 'completed');
    }
    if (position - lastBeatRef.current >= 12) {
      lastBeatRef.current = position;
      onRecord(position, 'heartbeat');
    }
  }, [position, item.durationSec, onRecord]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((current) => !current);
      }
      if (event.code === 'ArrowRight') setPosition((current) => Math.min(item.durationSec, current + 10));
      if (event.code === 'ArrowLeft') setPosition((current) => Math.max(0, current - 10));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item.durationSec]);

  const seek = (next: number) => {
    setPosition(Math.min(item.durationSec, Math.max(0, Math.round(next))));
  };

  const close = () => {
    onRecord(positionRef.current, 'heartbeat');
    onClose();
  };

  const percent = item.durationSec > 0 ? (position / item.durationSec) * 100 : 0;
  const completionPercent = record?.completedAt ? 100 : Math.max(percent, record?.percent ?? 0);
  const cue = currentCue(item, position);
  const ladder = competencyLadder(record, attempts, signoff);
  const filteredTranscript = item.transcript.filter(
    (section) =>
      !search.trim()
      || section.text.toLowerCase().includes(search.toLowerCase())
      || section.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#05080d]/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to hub
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="amber">Synthetic training media</Pill>
            <ClearancePill clearance={item.classification} />
            <Pill tone="slate">v{item.version}</Pill>
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:text-white"
              aria-label="Close player"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {resumeNotice && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-3">
            <p className="text-xs text-sky-100">
              Resuming at {formatDuration(startAt)}. Progress is stored against your service number and synced across devices.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-sky-200 hover:bg-white/10" onClick={() => { seek(0); setResumeNotice(false); }}>
                Start over
              </Button>
              <Button size="sm" className="bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={() => setResumeNotice(false)}>
                Resume
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Pill tone={item.status === 'published' ? 'emerald' : 'neutral'}>{STATUS_LABEL[item.status]}</Pill>
                <Pill tone="violet">{SOURCE_LABEL[item.sourceType]}</Pill>
                {item.mandatory && <Pill tone="rose">Mandatory</Pill>}
                {item.acknowledgementRequired && <Pill tone="amber">Acknowledgement</Pill>}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl">{item.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/50">{item.summary}</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <div className="relative aspect-video">
                <MotifArt item={item} className="absolute inset-0 h-full w-full rounded-none border-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

                <div className="pointer-events-none absolute right-4 top-4 select-none text-right text-[10px] font-mono uppercase tracking-[0.18em] text-white/35">
                  <p>{watermark}</p>
                  <p className="mt-1">{item.classification} · {persona.unit}</p>
                </div>

                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 backdrop-blur">
                    <span className={cn('h-1.5 w-1.5 rounded-full', playing ? 'animate-pulse bg-rose-400' : 'bg-white/40')} />
                    {playing ? 'Playing' : 'Paused'}
                  </span>
                  {item.downloadPolicy === 'view_only' && (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                      <Lock className="h-3 w-3" /> View only
                    </span>
                  )}
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setPlaying((current) => !current)}
                    className="group relative flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur transition hover:scale-105 hover:border-sky-400/60"
                    aria-label={playing ? 'Pause' : 'Play'}
                  >
                    <span className="absolute inset-0 animate-ping rounded-full border border-sky-400/20" />
                    {playing ? <Pause className="h-8 w-8 text-white" /> : <Play className="ml-1 h-8 w-8 text-white" />}
                  </button>
                </div>

                <div className="absolute inset-x-4 bottom-4">
                  {captionsOn && cue && (
                    <div className="mx-auto mb-3 max-w-2xl rounded-lg bg-black/70 px-4 py-2 text-center text-sm leading-relaxed text-white backdrop-blur">
                      {cue.text}
                    </div>
                  )}
                  <div className="mb-2 flex items-center justify-between text-[11px] font-mono text-white/70">
                    <span>{formatDuration(position)}</span>
                    <span>{formatDuration(item.durationSec)}</span>
                  </div>
                  <div className="relative flex h-6 items-center">
                    <div className="absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" style={{ width: `${percent}%` }} />
                    </div>
                    {item.chapters.map((chapter) => (
                      <span
                        key={chapter.id}
                        className="absolute h-2.5 w-0.5 rounded bg-white/50"
                        style={{ left: `${(chapter.startSec / item.durationSec) * 100}%` }}
                      />
                    ))}
                    <input
                      type="range"
                      min={0}
                      max={item.durationSec}
                      step={1}
                      value={position}
                      onChange={(event) => seek(Number(event.target.value))}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Seek"
                    />
                    <span
                      className="pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-white shadow-lg"
                      style={{ left: `calc(${percent}% - 7px)` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => seek(position - 10)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Back 10 seconds">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setPlaying((current) => !current)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Play or pause">
                        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </button>
                      <button type="button" onClick={() => seek(position + 10)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Forward 10 seconds">
                        <SkipForward className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => seek(item.chapters[Math.max(0, item.chapters.findIndex((chapter) => chapter.startSec > position) - 1)]?.startSec ?? 0)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Previous chapter">
                        <SkipBack className="h-4 w-4" />
                      </button>
                      <span className="mx-1 hidden items-center gap-1 text-[11px] text-white/50 sm:flex">
                        <Volume2 className="h-4 w-4" /> {Math.round(62 + Math.sin(position / 30) * 8)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCaptionsOn((current) => !current)}
                        className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium', captionsOn ? 'bg-sky-400/20 text-sky-200' : 'text-white/60 hover:bg-white/10')}
                      >
                        <Captions className="h-4 w-4" /> CC
                      </button>
                      <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/70">
                        <Gauge className="h-3.5 w-3.5" />
                        <select
                          value={speed}
                          onChange={(event) => setSpeed(Number(event.target.value))}
                          className="bg-transparent text-[11px] text-white outline-none"
                          aria-label="Playback speed"
                        >
                          {SPEEDS.map((value) => (
                            <option key={value} value={value} className="bg-slate-900">
                              {value}×
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setBookmarks((current) => [
                            ...current,
                            { id: `bm-${Date.now()}`, at: Math.round(position), label: cue?.text.slice(0, 60) ?? `At ${formatDuration(position)}` },
                          ]);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white/70 hover:text-white"
                      >
                        <Bookmark className="h-3.5 w-3.5" /> Bookmark
                      </button>
                      <button
                        type="button"
                        onClick={() => setTranscriptOpen((current) => !current)}
                        className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium', transcriptOpen ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10')}
                      >
                        <ListVideo className="h-4 w-4" /> Transcript
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {item.acknowledgementRequired && (
              <Surface className={cn('flex flex-wrap items-center justify-between gap-4 p-4', acknowledged ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-amber-400/30 bg-amber-400/[0.07]')}>
                <div className="flex items-start gap-3">
                  <span className={cn('rounded-xl p-2', acknowledged ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300')}>
                    {acknowledged ? <CheckCircle2 className="h-5 w-5" /> : <FileCheck2 className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {acknowledged ? 'Acknowledgement recorded' : 'Acknowledgement required'}
                    </p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {acknowledged
                        ? 'Your acknowledgement is stored with a timestamp and appears in the unit report.'
                        : 'Confirm that you have read and understood this briefing. This is recorded against your service number.'}
                    </p>
                  </div>
                </div>
                {!acknowledged && (
                  <Button
                    className="bg-amber-400 text-slate-950 hover:bg-amber-300"
                    onClick={() => {
                      setAcknowledged(true);
                      onRecord(position, 'acknowledged');
                    }}
                  >
                    <Check className="mr-1.5 h-4 w-4" /> I acknowledge
                  </Button>
                )}
              </Surface>
            )}

            <Surface className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-3 py-2">
                {([
                  ['chapters', 'Chapters', ListVideo],
                  ['transcript', 'Transcript', Captions],
                  ['bookmarks', `Bookmarks${bookmarks.length ? ` (${bookmarks.length})` : ''}`, Bookmark],
                ] as const).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      tab === id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  {tab === 'transcript' && (
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search transcript"
                      className="h-8 w-44 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none"
                    />
                  )}
                  <Button size="sm" variant="ghost" className="text-white/60 hover:bg-white/10 hover:text-white" onClick={onAskQuestion}>
                    <HelpCircle className="mr-1.5 h-3.5 w-3.5" /> Ask about this
                  </Button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-4">
                {tab === 'chapters' && (
                  <div className="space-y-1">
                    {item.chapters.map((chapter) => (
                      <button
                        key={chapter.id}
                        type="button"
                        onClick={() => seek(chapter.startSec)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          chapter.startSec <= position && (item.chapters.find((next) => next.startSec > chapter.startSec)?.startSec ?? Infinity) > position
                            ? 'bg-sky-400/10 text-sky-100'
                            : 'text-white/60 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        <span className="font-mono text-[11px] text-white/40">{formatDuration(chapter.startSec)}</span>
                        <span className="flex-1">{chapter.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                      </button>
                    ))}
                  </div>
                )}
                {tab === 'transcript' && (
                  <div className="space-y-4">
                    {filteredTranscript.length === 0 && <p className="text-xs text-white/40">No transcript sections match that search.</p>}
                    {filteredTranscript.map((section) => (
                      <div key={section.id}>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-sky-300/80">{formatDuration(section.startSec)}</span>
                          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">{section.title}</h4>
                        </div>
                        <p className="text-sm leading-relaxed text-white/65">{section.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                {tab === 'bookmarks' && (
                  <div className="space-y-1">
                    {bookmarks.length === 0 && (
                      <p className="text-xs text-white/40">
                        No bookmarks yet. Use the bookmark button to mark a moment; bookmarks stay on this device for the session.
                      </p>
                    )}
                    {bookmarks.map((bookmark) => (
                      <button
                        key={bookmark.id}
                        type="button"
                        onClick={() => seek(bookmark.at)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs text-white/70 hover:bg-white/5"
                      >
                        <span className="font-mono text-[10px] text-white/40">{formatDuration(bookmark.at)}</span>
                        <span className="flex-1 truncate">{bookmark.label}</span>
                        <Bookmark className="h-3.5 w-3.5 text-amber-300" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Surface>

            {transcriptOpen && (
              <Surface className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <MicroLabel>Full transcript</MicroLabel>
                  <button type="button" onClick={() => setTranscriptOpen(false)} className="text-white/40 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  {item.transcript.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => seek(section.startSec)}
                      className="block w-full text-left"
                    >
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-sky-300/80">{formatDuration(section.startSec)}</span>
                        <span className="text-xs font-semibold text-white/70">{section.title}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-white/55">{section.text}</p>
                    </button>
                  ))}
                </div>
              </Surface>
            )}
          </div>

          <aside className="space-y-4">
            <Surface className="p-5">
              <MicroLabel>Competency ladder</MicroLabel>
              <div className="mt-3 space-y-3">
                {[
                  { key: 'viewed', label: 'Lesson viewed', done: ladder.viewed, detail: ladder.viewed ? 'Completed or ≥90% watched' : 'Watch to at least 90%' },
                  { key: 'knowledge', label: 'Knowledge passed', done: ladder.knowledgePassed, detail: assessment ? `${assessment.passMark}% pass mark` : 'No assessment attached' },
                  { key: 'practical', label: 'Practical completed', done: ladder.practicalCompleted, detail: signoff ? `Signed by ${signoff.signedBy}` : 'Requires instructor station' },
                  { key: 'signed', label: 'Competency signed off', done: ladder.competencySigned, detail: 'Final instructor sign-off' },
                ].map((step) => (
                  <div key={step.key} className="flex items-start gap-3">
                    <span className={cn('mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border', step.done ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' : 'border-white/15 text-white/25')}>
                      {step.done ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <div>
                      <p className={cn('text-xs font-medium', step.done ? 'text-white' : 'text-white/55')}>{step.label}</p>
                      <p className="text-[10px] text-white/35">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                <div className="relative">
                  <ProgressRing value={completionPercent} size={48} tone={completionPercent >= 90 ? '#34d399' : '#38bdf8'} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">{Math.round(completionPercent)}%</span>
                </div>
                <div className="text-xs text-white/50">
                  <p className="text-white/80">{record?.completedAt ? 'Completed' : 'In progress'}</p>
                  <p className="text-[10px]">{record?.updatedAt ? `Updated ${formatDate(record.updatedAt)}` : 'Not started'}</p>
                </div>
              </div>
              {assessment && onStartAssessment && (
                <Button className="mt-4 w-full bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={onStartAssessment}>
                  <Timer className="mr-1.5 h-4 w-4" /> Knowledge check
                </Button>
              )}
            </Surface>

            <Surface className="p-5">
              <MicroLabel>Record metadata</MicroLabel>
              <dl className="mt-3 space-y-2 text-xs">
                {[
                  ['Publisher', item.publisher.department],
                  ['Provenance', SOURCE_LABEL[item.sourceType]],
                  ['Reviewed by', item.reviewer ?? 'Not reviewed'],
                  ['Published', formatDate(item.publishedAt)],
                  ['Review due', formatDate(item.reviewDueAt)],
                  ['Version', item.version],
                  ['Duration', formatClock(item.durationSec)],
                  ['Channel', item.channelId.replace('_', ' ')],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <dt className="text-white/35">{label}</dt>
                    <dd className="max-w-[62%] text-right text-white/70">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[10px] text-emerald-200/80">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Publisher verified: {item.publisher.verified ? item.publisher.department : 'not verified'}
              </div>
              {item.approvedSources.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <MicroLabel>Approved sources</MicroLabel>
                  <ul className="mt-2 space-y-1 text-[11px] text-white/45">
                    {item.approvedSources.map((source) => (
                      <li key={source} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                        {source}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Surface>

            {item.derivedFromId && (
              <Surface className="border-amber-400/25 bg-amber-400/[0.06] p-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-[11px] leading-relaxed text-amber-100/80">
                    AI-assisted derivative. Every statement was checked against the approved source briefing by a named reviewer before publication.
                    AI output is never published without expert review.
                  </p>
                </div>
              </Surface>
            )}

            <Surface className="p-5">
              <MicroLabel>Take this with you</MicroLabel>
              <p className="mt-2 text-xs leading-relaxed text-white/45">
                Download policies are set by the publisher.{' '}
                {item.downloadPolicy === 'view_only' && 'This item is view-only and cannot be stored on a device.'}
                {item.downloadPolicy === 'audio_only' && 'An audio-only copy is available for low-bandwidth use.'}
                {item.downloadPolicy === 'denied' && 'Downloads are disabled for this item.'}
                {item.downloadPolicy === 'allowed' && 'Video, audio-only and transcript copies are available.'}
              </p>
              {onDownload && item.downloadPolicy !== 'denied' && item.downloadPolicy !== 'view_only' && (
                <Button variant="outline" className="mt-3 w-full border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={onDownload}>
                  <Download className="mr-1.5 h-4 w-4" /> Save for offline
                </Button>
              )}
            </Surface>
          </aside>
        </div>
      </div>
    </div>
  );
}
