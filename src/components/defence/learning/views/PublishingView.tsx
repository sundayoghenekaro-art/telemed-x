import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BadgeCheck, CalendarClock, Check, CheckCircle2,
  CloudUpload, FileVideo, History, Loader2, Lock, PackageCheck,
  Play, RefreshCw, Send, ShieldAlert, ShieldCheck, Sparkles, UploadCloud, XCircle,
} from 'lucide-react';
import type {
  ChannelId, Clearance, ContentItem, ContentKind, ContentStatus, DownloadPolicy,
  ProcessingJob, SourceType, TrainingPath,
} from '@/lib/defenceLearning';
import {
  AI_PROVIDER, can, CONTENT_KIND_LABEL, formatDate, isPipelineVisible, SOURCE_LABEL,
  STATUS_LABEL,
} from '@/lib/defenceLearning';
import {
  AiError, generateDraft, useAiStatus,
} from '@/lib/defenceAi';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  AccessDenied, ClearancePill, EmptyState, MicroLabel, Meter, MotifArt, Pill, Surface,
} from '../hubUi';
import { CHANNELS } from '@/data/defenceLearningMockData';
import type { HubApi } from '../hubApi';

type WorkspaceTab = 'pipeline' | 'upload' | 'ai' | 'jobs';

const STATUS_TONE: Record<ContentStatus, 'neutral' | 'amber' | 'sky' | 'emerald' | 'rose' | 'violet' | 'slate'> = {
  draft: 'slate',
  in_review: 'amber',
  approved: 'sky',
  scheduled: 'violet',
  published: 'emerald',
  withdrawn: 'rose',
  superseded: 'neutral',
  rejected: 'rose',
};

const CHANNEL_MOTIF: Record<ChannelId, ContentItem['motif']> = {
  first_aid: 'bleeding',
  devices: 'device',
  equipment: 'escalation',
  policy: 'policy',
  leadership: 'leadership',
  wellbeing: 'wellbeing',
  courses: 'policy',
};

const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'm4v', 'mp3', 'wav', 'pdf', 'pptx', 'docx'];

function makeSyntheticContent(input: {
  title: string;
  summary: string;
  channelId: ChannelId;
  kind: ContentKind;
  classification: Clearance;
  downloadPolicy: DownloadPolicy;
  mandatory: boolean;
  acknowledgementRequired: boolean;
  branches: 'all' | string;
  groups: 'all' | TrainingPath;
  sizeMb: number;
  version: string;
  publisherId: string;
  sourceType: SourceType;
  derivedFromId?: string;
}): ContentItem {
  const id = `c-new-${Date.now()}`;
  return {
    id,
    title: input.title,
    summary: input.summary,
    channelId: input.channelId,
    kind: input.kind,
    tags: [input.channelId, 'new upload', 'synthetic'],
    language: 'en-GB',
    synthetic: true,
    publisher: {
      department: 'Defence Health HQ — Publishing',
      verified: true,
      verifiedBy: input.publisherId,
    },
    sourceType: input.sourceType,
    derivedFromId: input.derivedFromId,
    version: input.version,
    status: 'draft',
    classification: input.classification,
    audience: {
      branches: input.branches === 'all' ? 'all' : [input.branches],
      units: 'all',
      trainingGroups: input.groups === 'all' ? 'all' : [input.groups],
      minClearance: input.classification,
    },
    downloadPolicy: input.downloadPolicy,
    mandatory: input.mandatory,
    acknowledgementRequired: input.acknowledgementRequired,
    languageResources: ['en-GB'],
    approvedSources: ['Pending source confirmation'],
    reviewer: null,
    reviewedAt: null,
    publishedAt: null,
    reviewDueAt: null,
    durationSec: 480,
    fileSizeMb: input.sizeMb,
    chapters: [],
    captions: [],
    transcript: [
      {
        id: 'new-1',
        title: 'Draft placeholder',
        startSec: 0,
        text:
          'This is a synthetic draft created in the demonstration workspace. Replace this placeholder transcript with the approved wording before review.',
      },
    ],
    relatedIds: [],
    competenceLevel: 'Foundational',
    palette: ['#0f766e', '#38bdf8'],
    motif: CHANNEL_MOTIF[input.channelId],
    processing: { status: 'ready' },
  };
}

export function PublishingView({ hub }: { hub: HubApi }) {
  const { persona } = hub;
  const canDraft = can(persona.role, 'publish.draft');
  const canSubmit = can(persona.role, 'publish.submit');
  const canReview = can(persona.role, 'publish.review');
  const canPublish = can(persona.role, 'publish.publish');
  const canWithdraw = can(persona.role, 'publish.withdraw');

  const [tab, setTab] = useState<WorkspaceTab>('pipeline');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [replacementId, setReplacementId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const pipeline = useMemo(
    () => hub.items
      .filter((item) => isPipelineVisible({ role: persona.role, personaId: persona.id }, item))
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')),
    [hub.items, persona.role, persona.id],
  );

  if (!canDraft && !canReview && !canPublish && !canWithdraw) {
    return <AccessDenied capability="publish.draft / publish.review" role={persona.role} />;
  }

  const selected = pipeline.find((item) => item.id === selectedId) ?? pipeline[0] ?? null;
  const timeline = selected
    ? hub.publication.filter((event) => event.contentId === selected.id).sort((a, b) => b.at.localeCompare(a.at))
    : [];

  const recordTransition = (
    item: ContentItem,
    status: ContentStatus,
    action: 'submitted' | 'approved' | 'rejected' | 'published' | 'withdrawn' | 'superseded' | 'derivative_flagged',
    note: string,
    extra: Partial<ContentItem> = {},
  ) => {
    hub.updateContent({ ...item, status, ...extra });
    hub.addPublication({
      id: `pe-${Date.now()}`,
      contentId: item.id,
      action,
      actor: `${persona.rank} ${persona.name}`,
      at: new Date().toISOString(),
      note,
      version: item.version,
    });
    hub.addAudit(`${persona.rank} ${persona.name}`, action.replace('_', ' '), `${item.title} — v${item.version}`, note);
    hub.notify(`${item.title}: ${STATUS_LABEL[status].toLowerCase()}.`, 'success');
    setActionError(null);
  };

  return (
    <div className="space-y-6">
      <Surface className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill tone="amber">Publishing & review workspace</Pill>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Controlled publication</h1>
            <p className="mt-1 max-w-3xl text-sm text-white/50">
              Upload, review and publish HQ material. Scanning and transcoding run only when a processor is configured.
              Publishing requires an authorised reviewer — a publisher can draft and submit but cannot approve or
              release their own content.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={canDraft ? 'emerald' : 'slate'}>{canDraft ? 'Publisher' : 'No draft rights'}</Pill>
            <Pill tone={canReview ? 'emerald' : 'slate'}>{canReview ? 'Reviewer' : 'No review rights'}</Pill>
            <Pill tone={canPublish ? 'emerald' : 'slate'}>{canPublish ? 'Publish' : 'No publish rights'}</Pill>
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {([
            ['pipeline', 'Pipeline', PackageCheck],
            ['upload', 'Upload', UploadCloud],
            ['ai', 'AI drafting', Sparkles],
            ['jobs', 'Processing jobs', Loader2],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
                tab === id ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-white/10 bg-white/[0.02] text-white/55 hover:border-white/20 hover:text-white',
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </Surface>

      {tab === 'pipeline' && (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Surface className="overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <h3 className="text-sm font-semibold text-white">Records in your workspace</h3>
              <p className="mt-0.5 text-xs text-white/40">{pipeline.length} visible to your role</p>
            </div>
            <div className="max-h-[720px] divide-y divide-white/5 overflow-y-auto">
              {pipeline.length === 0 && (
                <div className="p-5">
                  <EmptyState icon={PackageCheck} title="Nothing in the pipeline" description="No records are visible to this role yet." />
                </div>
              )}
              {pipeline.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setSelectedId(item.id); setActionError(null); }}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    selected?.id === item.id ? 'bg-amber-400/[0.08]' : 'hover:bg-white/[0.04]',
                  )}
                >
                  <MotifArt item={item} className="h-12 w-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/85">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Pill tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Pill>
                      <span className="text-[10px] text-white/30">v{item.version}</span>
                      {item.processing?.status === 'failed' && <Pill tone="rose">Processing failed</Pill>}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-white/25" />
                </button>
              ))}
            </div>
          </Surface>

          {selected ? (
            <Surface className="overflow-hidden">
              <div className="border-b border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Pill>
                      <ClearancePill clearance={selected.classification} />
                      <Pill tone="slate">{CONTENT_KIND_LABEL[selected.kind]}</Pill>
                      <Pill tone="slate">v{selected.version}</Pill>
                      {selected.sourceType !== 'official' && <Pill tone="amber">AI-assisted</Pill>}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{selected.title}</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/45">{selected.summary}</p>
                  </div>
                  {selected.status === 'published' && (
                    <Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => hub.openItem(selected.id)}>
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Preview
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-2">
                <div>
                  <MicroLabel>Distribution & policy</MicroLabel>
                  <dl className="mt-2 space-y-1.5 text-xs">
                    {[
                      ['Minimum clearance', selected.classification],
                      ['Branches', selected.audience.branches === 'all' ? 'All branches' : selected.audience.branches.join(', ')],
                      ['Units', selected.audience.units === 'all' ? 'All units' : selected.audience.units.join(', ')],
                      ['Training groups', selected.audience.trainingGroups === 'all' ? 'All groups' : selected.audience.trainingGroups.join(', ')],
                      ['Download', selected.downloadPolicy.replace('_', ' ')],
                      ['Mandatory', selected.mandatory ? 'Yes' : 'No'],
                      ['Acknowledgement', selected.acknowledgementRequired ? 'Required' : 'Not required'],
                      ['Review due', formatDate(selected.reviewDueAt)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3">
                        <dt className="text-white/35">{label}</dt>
                        <dd className="text-right text-white/70">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {selected.processing && (
                    <div className={cn('mt-3 rounded-lg border px-3 py-2 text-[11px]', selected.processing.status === 'failed'
                      ? 'border-rose-400/30 bg-rose-400/[0.06] text-rose-200'
                      : selected.processing.status === 'pending'
                        ? 'border-amber-400/30 bg-amber-400/[0.06] text-amber-200'
                        : 'border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-200')}>
                      <span className="flex items-center gap-1.5">
                        {selected.processing.status === 'failed' || selected.processing.status === 'pending' ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {selected.processing.status === 'pending' ? 'Not scanned or transcoded' : `Processing: ${selected.processing.status}`}
                      </span>
                      {selected.processing.failureReason && <p className="mt-1 text-[10px] opacity-70">{selected.processing.failureReason}</p>}
                    </div>
                  )}
                </div>

                <div>
                  <MicroLabel>Lifecycle actions</MicroLabel>
                  <div className="mt-2 space-y-2">
                    {selected.status === 'draft' && canSubmit && (
                      <ActionRow
                        title="Submit for review"
                        hint="Moves the draft to the clinical review queue."
                        action={() => recordTransition(selected, 'in_review', 'submitted', 'Submitted for clinical and classification review.')}
                        icon={Send}
                        tone="amber"
                        label="Submit"
                      />
                    )}
                    {selected.status === 'draft' && !canSubmit && (
                      <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-white/40">Draft saved. Submitting requires the publish.submit capability.</p>
                    )}

                    {selected.status === 'in_review' && canReview && (
                      <>
                        <ActionRow
                          title="Approve content"
                          hint="Confirms clinical wording, classification and audience."
                          action={() => recordTransition(selected, 'approved', 'approved', 'Clinical wording, classification and audience confirmed.', { reviewer: `${persona.rank} ${persona.name}`, reviewedAt: new Date().toISOString() })}
                          icon={BadgeCheck}
                          tone="emerald"
                          label="Approve"
                        />
                        <ActionRow
                          title="Reject and return"
                          hint="Returns the draft to the publisher with the reason recorded."
                          action={() => recordTransition(selected, 'rejected', 'rejected', 'Returned to publisher for correction.')}
                          icon={XCircle}
                          tone="rose"
                          label="Reject"
                        />
                      </>
                    )}

                    {selected.status === 'in_review' && !canReview && (
                      <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-white/40">Awaiting an authorised reviewer. Publishers cannot approve their own submissions.</p>
                    )}

                    {(selected.status === 'approved' || selected.status === 'draft' || selected.status === 'rejected') && canPublish && (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-xs font-medium text-white">Release to learners</p>
                        <p className="mt-0.5 text-[10px] text-white/35">Leave the schedule empty to publish immediately.</p>
                        <input
                          type="datetime-local"
                          value={scheduleAt}
                          onChange={(event) => setScheduleAt(event.target.value)}
                          className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-[#0b1119] px-2 text-xs text-white outline-none"
                        />
                        <Button
                          size="sm"
                          className="mt-2 w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                          onClick={() => {
                            if (selected.status === 'approved' || selected.status === 'draft') {
                              const scheduled = Boolean(scheduleAt) && new Date(scheduleAt).getTime() > Date.now();
                              recordTransition(
                                selected,
                                scheduled ? 'scheduled' : 'published',
                                'published',
                                scheduled ? `Scheduled for ${formatDate(scheduleAt)}.` : 'Released to the approved audience.',
                                {
                                  publishedAt: scheduled ? null : new Date().toISOString(),
                                  reviewer: selected.reviewer ?? `${persona.rank} ${persona.name}`,
                                  reviewedAt: selected.reviewedAt ?? new Date().toISOString(),
                                },
                              );
                              setScheduleAt('');
                            } else {
                              setActionError('Only approved content can be released. Submit the draft for review first.');
                            }
                          }}
                        >
                          <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> {scheduleAt ? 'Schedule publication' : 'Publish now'}
                        </Button>
                      </div>
                    )}

                    {(selected.status === 'published' || selected.status === 'scheduled') && canWithdraw && (
                      <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-3">
                        <p className="text-xs font-medium text-white">Withdraw from learners</p>
                        <p className="mt-0.5 text-[10px] text-white/35">Withdrawal is immediate and audited. The record is retained.</p>
                        <input
                          value={withdrawReason}
                          onChange={(event) => setWithdrawReason(event.target.value)}
                          placeholder="Reason for withdrawal"
                          className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-[#0b1119] px-2 text-xs text-white placeholder:text-white/25 outline-none"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15"
                          onClick={() => {
                            if (!withdrawReason.trim()) {
                              setActionError('A withdrawal reason is required.');
                              return;
                            }
                            recordTransition(selected, 'withdrawn', 'withdrawn', withdrawReason.trim(), { publishedAt: selected.publishedAt });
                            setWithdrawReason('');
                          }}
                        >
                          <Lock className="mr-1.5 h-3.5 w-3.5" /> Withdraw
                        </Button>
                      </div>
                    )}

                    {selected.status === 'published' && canPublish && (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-xs font-medium text-white">Supersede with a newer edition</p>
                        <select
                          value={replacementId}
                          onChange={(event) => setReplacementId(event.target.value)}
                          className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-[#0b1119] px-2 text-xs text-white outline-none"
                        >
                          <option value="">Select replacement</option>
                          {hub.items
                            .filter((item) => item.id !== selected.id && item.channelId === selected.channelId && item.status !== 'withdrawn')
                            .map((item) => (
                              <option key={item.id} value={item.id}>{item.title} — v{item.version}</option>
                            ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
                          disabled={!replacementId}
                          onClick={() => {
                            const replacement = hub.items.find((item) => item.id === replacementId);
                            if (!replacement) return;
                            recordTransition(selected, 'superseded', 'superseded', `Superseded by ${replacement.title} v${replacement.version}.`, { supersededById: replacement.id });
                            setReplacementId('');
                          }}
                        >
                          <History className="mr-1.5 h-3.5 w-3.5" /> Mark superseded
                        </Button>
                      </div>
                    )}

                    {actionError && (
                      <p className="flex items-start gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2 text-[11px] text-rose-200">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {actionError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 p-5">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-white/35" />
                  <MicroLabel>Version & publication history</MicroLabel>
                </div>
                <div className="mt-3 space-y-2">
                  {timeline.length === 0 && <p className="text-[11px] text-white/35">No publication events recorded for this record yet.</p>}
                  {timeline.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-white/80">
                          {event.action.replace('_', ' ')} by {event.actor}
                          <span className="ml-2 text-[10px] text-white/30">v{event.version}</span>
                        </p>
                        <p className="text-[10px] text-white/40">{event.note}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-white/25">{formatDate(event.at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Surface>
          ) : (
            <EmptyState icon={PackageCheck} title="Select a record" description="Choose a record to see its metadata, lifecycle actions and publication history." />
          )}
        </div>
      )}

      {tab === 'upload' && <UploadWizard hub={hub} />}
      {tab === 'ai' && <AiDrafting hub={hub} />}
      {tab === 'jobs' && <JobsPanel hub={hub} />}
    </div>
  );
}

function ActionRow({
  title, hint, action, icon: Icon, tone, label,
}: {
  title: string;
  hint: string;
  action: () => void;
  icon: typeof Send;
  tone: 'amber' | 'emerald' | 'rose';
  label: string;
}) {
  const tones = {
    amber: 'border-amber-400/25 bg-amber-400/[0.05] text-amber-200 hover:bg-amber-400/10',
    emerald: 'border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-200 hover:bg-emerald-400/10',
    rose: 'border-rose-400/25 bg-rose-400/[0.05] text-rose-200 hover:bg-rose-400/10',
  } as const;
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-xl border p-3', tones[tone])}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-white">{title}</p>
          <p className="text-[10px] text-white/40">{hint}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 border-current bg-transparent text-current hover:bg-white/10" onClick={action}>
        {label}
      </Button>
    </div>
  );
}

function UploadWizard({ hub }: { hub: HubApi }) {
  const { persona } = hub;
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<{ name: string; sizeMb: number } | null>(null);
  const [fileError, setFileError] = useState('');
  const [form, setForm] = useState({
    title: '',
    summary: '',
    channelId: 'first_aid' as ChannelId,
    kind: 'video' as ContentKind,
    classification: 'restricted' as Clearance,
    branches: 'all',
    groups: 'all',
    downloadPolicy: 'allowed' as DownloadPolicy,
    mandatory: false,
    acknowledgementRequired: false,
    version: '1.0',
    publishAt: '',
  });
  const [created, setCreated] = useState<string | null>(null);

  const pickFile = (selected: File | null) => {
    setFileError('');
    if (!selected) {
      setFile(null);
      return;
    }
    const extension = selected.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setFileError(`Unsupported format .${extension}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`);
      setFile(null);
      return;
    }
    const sizeMb = Math.round(selected.size / (1024 * 1024));
    if (sizeMb > 2048) {
      setFileError('Source file exceeds the 2 GB upload limit.');
      setFile(null);
      return;
    }
    setFile({ name: selected.name, sizeMb: Math.max(1, sizeMb) });
  };

  const useSample = () => {
    setFileError('');
    setFile({ name: 'synthetic-informed-consent-refresher.mp4', sizeMb: 164 });
    setForm((current) => ({
      ...current,
      title: current.title || 'Informed consent refresher (2026)',
      summary: current.summary || 'A short refresher on consent conversations, refusal recording and capacity assessment. Synthetic demonstration upload.',
    }));
  };

  const createDraft = () => {
    if (!file) {
      setFileError('Select a source file before creating a draft.');
      return;
    }
    const item = makeSyntheticContent({
      title: form.title.trim() || 'Untitled HQ briefing',
      summary: form.summary.trim() || 'Uploaded HQ briefing awaiting metadata completion.',
      channelId: form.channelId,
      kind: form.kind,
      classification: form.classification,
      downloadPolicy: form.downloadPolicy,
      mandatory: form.mandatory,
      acknowledgementRequired: form.acknowledgementRequired,
      branches: form.branches,
      groups: form.groups as 'all' | TrainingPath,
      sizeMb: file.sizeMb,
      version: form.version || '1.0',
      publisherId: persona.id,
      sourceType: 'official',
    });
    item.processing = {
      status: 'pending',
      failureReason: 'No malware scanner or transcoder is configured. This source has not been scanned or processed.',
    };
    hub.addContent(item);
    hub.addPublication({
      id: `pe-${Date.now()}`,
      contentId: item.id,
      action: 'created',
      actor: `${persona.rank} ${persona.name}`,
      at: new Date().toISOString(),
      note: `Uploaded ${file.name}; scan not run; transcode not run (no processor configured).`,
      version: item.version,
    });
    hub.addAudit(`${persona.rank} ${persona.name}`, 'uploaded content', `${item.title} — v${item.version}`, `file=${file.name}; scan=not-run; transcode=not-run; processor=not-configured`);
    hub.addJob({ id: `job-${Date.now()}-scan`, kind: 'scan', targetId: item.id, label: `Malware scan — not configured (${file.name})`, status: 'queued', progress: 0, attempts: 0 });
    hub.addJob({ id: `job-${Date.now()}-tc`, kind: 'transcode', targetId: item.id, label: 'Transcode — not configured', status: 'queued', progress: 0, attempts: 0 });
    hub.notify('Draft created. No scanner or transcoder is configured, so the file is unprocessed.', 'info');
    setCreated(item.id);
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setFileError('');
    setCreated(null);
    setForm({
      title: '', summary: '', channelId: 'first_aid', kind: 'video', classification: 'restricted',
      branches: 'all', groups: 'all', downloadPolicy: 'allowed', mandatory: false,
      acknowledgementRequired: false, version: '1.0', publishAt: '',
    });
  };

  const inputClass = 'mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0b1119] px-2.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-amber-400/40';

  return (
    <StreetWizardShell
      title="Upload and ingest HQ content"
      description="Files are validated before a draft exists. Scanning and transcoding require a configured processor; nothing becomes visible to learners until an authorised reviewer publishes it."
      steps={['Source file', 'Metadata', 'Distribution', 'Processing']}
      current={step}
    >
      {step === 1 && (
        <div className="space-y-4">
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              pickFile(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <CloudUpload className="h-8 w-8 text-white/30" />
            <p className="mt-3 text-sm font-medium text-white">Drop a source file or browse</p>
            <p className="mt-1 text-[11px] text-white/35">MP4, MOV, MP3, WAV, PDF, PPTX, DOCX · up to 2 GB</p>
            <input ref={fileRef} type="file" className="hidden" onChange={(event) => pickFile(event.target.files?.[0] ?? null)} />
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => fileRef.current?.click()}>
                <FileVideo className="mr-1.5 h-3.5 w-3.5" /> Browse files
              </Button>
              <Button size="sm" variant="ghost" className="text-white/55 hover:bg-white/10 hover:text-white" onClick={useSample}>
                Use a synthetic sample
              </Button>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-emerald-100">
                <CheckCircle2 className="h-4 w-4" /> {file.name}
              </div>
              <span className="text-[11px] text-emerald-200/60">{file.sizeMb} MB</span>
            </div>
          )}
          {fileError && (
            <p className="flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2 text-[11px] text-rose-200">
              <AlertTriangle className="h-3.5 w-3.5" /> {fileError}
            </p>
          )}

          <div className="flex justify-end">
            <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={!file} onClick={() => setStep(2)}>
              Continue <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <label className="block text-xs text-white/50">
            Title
            <input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Briefing title" />
          </label>
          <label className="block text-xs text-white/50">
            Summary
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-white/10 bg-[#0b1119] px-2.5 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-amber-400/40"
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
              placeholder="What this briefing covers and who it is for"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs text-white/50">
              Channel
              <select className={inputClass} value={form.channelId} onChange={(event) => setForm({ ...form, channelId: event.target.value as ChannelId })}>
                {CHANNELS.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}
              </select>
            </label>
            <label className="block text-xs text-white/50">
              Format
              <select className={inputClass} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as ContentKind })}>
                {Object.entries(CONTENT_KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-xs text-white/50">
              Version
              <input className={inputClass} value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} />
            </label>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" className="text-white/50 hover:bg-white/10 hover:text-white" onClick={() => setStep(1)}>Back</Button>
            <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={!form.title.trim()} onClick={() => setStep(3)}>
              Continue <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/50">
              Classification
              <select className={inputClass} value={form.classification} onChange={(event) => setForm({ ...form, classification: event.target.value as Clearance })}>
                {['unclassified', 'restricted', 'confidential', 'secret'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="block text-xs text-white/50">
              Branch scope
              <select className={inputClass} value={form.branches} onChange={(event) => setForm({ ...form, branches: event.target.value })}>
                <option value="all">All branches</option>
                <option value="army">Army</option>
                <option value="navy">Navy</option>
                <option value="airforce">Air force</option>
                <option value="joint">Joint</option>
              </select>
            </label>
            <label className="block text-xs text-white/50">
              Training group
              <select className={inputClass} value={form.groups} onChange={(event) => setForm({ ...form, groups: event.target.value })}>
                <option value="all">All groups</option>
                <option value="general">General personnel</option>
                <option value="first_responder">First responder</option>
                <option value="medic">Medic</option>
                <option value="clinician">Clinician</option>
              </select>
            </label>
            <label className="block text-xs text-white/50">
              Download policy
              <select className={inputClass} value={form.downloadPolicy} onChange={(event) => setForm({ ...form, downloadPolicy: event.target.value as DownloadPolicy })}>
                <option value="allowed">Allowed</option>
                <option value="audio_only">Audio only</option>
                <option value="view_only">View only</option>
                <option value="denied">Denied</option>
              </select>
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/60">
              Mandatory briefing
              <Switch checked={form.mandatory} onCheckedChange={(value) => setForm({ ...form, mandatory: value })} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/60">
              Acknowledgement required
              <Switch checked={form.acknowledgementRequired} onCheckedChange={(value) => setForm({ ...form, acknowledgementRequired: value })} />
            </label>
          </div>
          <div className="rounded-lg border border-sky-400/20 bg-sky-400/[0.05] px-3 py-2 text-[10px] leading-relaxed text-sky-100/60">
            Organisation separation: uploads are bound to the publisher's department. Learners outside the selected
            branch, unit, training group or clearance never receive the record.
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" className="text-white/50 hover:bg-white/10 hover:text-white" onClick={() => setStep(2)}>Back</Button>
            <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => setStep(4)}>
              Continue to processing <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          {!created && (
            <>
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  <p className="text-xs font-semibold text-amber-100">No processor is configured</p>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-100/70">
                  This environment has no malware scanner or transcoder. The file is accepted as an untrusted source and a
                  draft is created for review. Nothing is scanned, transcoded or made playable.
                </p>
              </div>
              <p className="text-[11px] leading-relaxed text-white/40">
                Do not publish this record until a processor has run and the scan result has been recorded in the audit trail.
              </p>
              <div className="flex justify-between">
                <Button variant="ghost" className="text-white/50 hover:bg-white/10 hover:text-white" onClick={() => setStep(3)}>Back</Button>
                <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={createDraft}>
                  <FileVideo className="mr-1.5 h-4 w-4" />
                  Create draft without scanning
                </Button>
              </div>
            </>
          )}

          {created && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-5">
              <div className="flex items-center gap-2 text-amber-200">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-semibold">Draft created — not scanned or transcoded</p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-amber-100/70">
                The record is a draft and is not visible to learners. The file has not been through a malware scan or
                transcode, and the audit trail records that. Do not publish it until a processor has run.
              </p>
              <Button size="sm" variant="outline" className="mt-3 border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15" onClick={reset}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Upload another file
              </Button>
            </div>
          )}
        </div>
      )}
    </StreetWizardShell>
  );
}

function StreetWizardShell({
  title, description, steps, current, children,
}: {
  title: string;
  description: string;
  steps: string[];
  current: number;
  children: React.ReactNode;
}) {
  return (
    <Surface className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/45">{description}</p>
        </div>
        <Pill tone="amber">Controlled ingest</Pill>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold', current > index + 1 ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' : current === index + 1 ? 'border-amber-400/50 bg-amber-400/15 text-amber-200' : 'border-white/10 text-white/25')}>
              {current > index + 1 ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span className={cn('text-[10px] uppercase tracking-[0.12em]', current === index + 1 ? 'text-white/70' : 'text-white/30')}>{label}</span>
            {index < steps.length - 1 && <span className="mx-1 h-px w-6 bg-white/10" />}
          </div>
        ))}
      </div>
      <div className="mt-6">{children}</div>
    </Surface>
  );
}

function AiDrafting({ hub }: { hub: HubApi }) {
  const { persona } = hub;
  const canDraft = can(persona.role, 'publish.draft');
  const [sourceId, setSourceId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ text: string; model: string; sourceId: string } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const ai = useAiStatus();
  const aiConfigured = Boolean(ai?.configured);
  const sources = hub.items.filter((item) => item.status === 'published' && item.sourceType === 'official');
  const selectedSource = sources.find((item) => item.id === sourceId) ?? null;

  const commitDraft = (
    source: ContentItem,
    options: { summary: string; transcriptText: string; actor: string; note: string },
  ) => {
    const item = makeSyntheticContent({
      title: `${source.title} — quick reference`,
      summary: options.summary,
      channelId: source.channelId,
      kind: 'doc',
      classification: source.classification,
      downloadPolicy: 'allowed',
      mandatory: false,
      acknowledgementRequired: false,
      branches: 'all',
      groups: 'all',
      sizeMb: 4,
      version: '1.0',
      publisherId: persona.id,
      sourceType: 'ai_summary',
      derivedFromId: source.id,
    });
    item.transcript = [{ id: 'gen-1', title: 'AI-assisted draft', startSec: 0, text: options.transcriptText }];
    item.chapters = [{ id: 'gen-1', label: 'AI-assisted draft', startSec: 0 }];
    hub.addContent(item);
    hub.addPublication({
      id: `pe-${Date.now()}`,
      contentId: item.id,
      action: 'created',
      actor: options.actor,
      at: new Date().toISOString(),
      note: options.note,
      version: item.version,
    });
    hub.addPublication({
      id: `pe-${Date.now()}-flag`,
      contentId: item.id,
      action: 'derivative_flagged',
      actor: 'System',
      at: new Date().toISOString(),
      note: 'AI-assisted provenance label applied. Publication blocked until a reviewer approves.',
      version: item.version,
    });
    hub.addAudit(`${persona.rank} ${persona.name}`, 'created AI-assisted draft', `${item.title} — v${item.version}`, `source=${source.id}; review=required`);
    hub.notify('AI-assisted draft created. It is flagged and requires expert review before publication.', 'success');
    setGenerated(null);
  };

  const manualDraft = () => {
    const source = selectedSource;
    if (!source) {
      hub.notify('Select an approved source first.', 'error');
      return;
    }
    commitDraft(source, {
      summary: `AI-assisted summary of “${source.title}”, reviewed by a clinician before publication.`,
      transcriptText:
        'This is a synthetic draft created in the demonstration workspace. Replace this placeholder transcript with the approved wording before review.',
      actor: 'AI drafting workspace (manual)',
      note: `Derivative draft created from approved source (${source.title}). Expert review required.`,
    });
  };

  const generateAiDraft = async () => {
    if (!selectedSource || generating) return;
    setGenerating(true);
    setGenerationError(null);
    setGenerated(null);
    try {
      const result = await generateDraft({
        title: selectedSource.title,
        version: selectedSource.version,
        classification: selectedSource.classification,
        transcript: selectedSource.transcript.slice(0, 12).map((section) => ({
          title: section.title,
          text: section.text,
        })),
      });
      if (!result.draft.trim()) {
        setGenerationError('The provider returned an empty draft. Nothing was created.');
        return;
      }
      setGenerated({ text: result.draft, model: result.model, sourceId: selectedSource.id });
    } catch (error) {
      setGenerationError(
        error instanceof AiError
          ? error.message
          : 'The drafting service could not be reached. The manual workflow below still works.',
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Surface className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">AI-assisted content production</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/45">
              Source → draft → expert review → rendered review → approval. Generated text is never published without a
              named expert review, and the AI-assisted provenance stays visible on the learner surface.
            </p>
          </div>
          <Pill tone={aiConfigured ? 'emerald' : ai === null ? 'slate' : 'amber'}>
            {aiConfigured ? `${ai?.provider} · ${ai?.model}` : ai === null ? 'Checking provider…' : 'Setup required'}
          </Pill>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {['Approved source', 'AI draft', 'Expert review', 'Rendered review', 'Approval'].map((stage, index) => (
            <div key={stage} className="flex items-center gap-1.5">
              <span className={cn('rounded-full border px-2.5 py-1 text-[10px]', index === 0 ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : index === 1 && !aiConfigured ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-white/10 text-white/35')}>
                {stage}
              </span>
              {index < 4 && <ArrowRight className="h-3 w-3 text-white/20" />}
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-xs text-white/50">
            Approved source
            <select
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0b1119] px-2.5 text-xs text-white outline-none"
            >
              <option value="">Select a published official source</option>
              {sources.map((item) => (
                <option key={item.id} value={item.id}>{item.title} — v{item.version}</option>
              ))}
            </select>
          </label>

          {ai && !ai.configured && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                <Sparkles className="h-4 w-4" /> Generation unavailable in this environment
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-amber-100/60">
                {AI_PROVIDER.setupNote}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-amber-100/45">
                To enable generation, set <span className="font-mono">{AI_PROVIDER.envKey}</span> on the server —
                <span className="font-mono"> .env.local</span> for local development, a deployment secret in production.
                It must never be a <span className="font-mono">VITE_</span> variable. The workflow below stays fully
                usable without a provider.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              disabled={!canDraft || !sourceId || !aiConfigured || generating}
              onClick={generateAiDraft}
            >
              {generating ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generating draft</>
              ) : (
                <><Sparkles className="mr-1.5 h-4 w-4" /> Generate AI draft</>
              )}
            </Button>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              disabled={!canDraft || !sourceId}
              onClick={manualDraft}
            >
              <FileVideo className="mr-1.5 h-4 w-4" /> Create derivative draft manually
            </Button>
          </div>

          {generationError && (
            <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-3 text-[11px] leading-relaxed text-rose-100/75">
              {generationError}
            </div>
          )}

          {generated && (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" /> Generated draft · {generated.model}
                </p>
                <Pill tone="amber">Not yet reviewed</Pill>
              </div>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-white/70">
                {generated.text}
              </pre>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/50 hover:bg-white/10 hover:text-white"
                  onClick={() => setGenerated(null)}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  onClick={() => {
                    const source = sources.find((item) => item.id === generated.sourceId);
                    if (!source) return;
                    const firstLine = generated.text.split('\n').find((line) => line.trim().length > 0) ?? '';
                    commitDraft(source, {
                      summary: firstLine.slice(0, 240),
                      transcriptText: generated.text,
                      actor: `AI drafting workspace (${generated.model})`,
                      note: `Generated from approved source (${source.title}) by ${generated.model}. Expert review required before publication.`,
                    });
                  }}
                >
                  Create draft record for review
                </Button>
              </div>
            </div>
          )}
          {!canDraft && <p className="text-[10px] text-white/35">Creating a derivative draft requires publish.draft.</p>}
        </div>
      </Surface>

      <Surface className="p-5">
        <MicroLabel>Guardrails</MicroLabel>
        <ul className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-white/50">
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" /> Output is grounded only in the selected approved source.</li>
          <li className="flex gap-2"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> No diagnosis, prescribing or clinical decision support.</li>
          <li className="flex gap-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" /> The reviewer must approve the rendered output, not just the text.</li>
          <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" /> Provenance label is permanent and visible to learners.</li>
        </ul>
        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-white/35">
          Equipment and weapons safety sources are restricted to safety-of-handling content. The drafting adapter refuses
          requests for weapon repair, modification or tactical employment.
        </div>
      </Surface>
    </div>
  );
}

function JobsPanel({ hub }: { hub: HubApi }) {
  const [retrying, setRetrying] = useState<string | null>(null);

  const retry = (job: ProcessingJob) => {
    setRetrying(job.id);
    hub.updateJob(job.id, { status: 'running', progress: 5, attempts: job.attempts + 1, error: undefined });
    [30, 62, 88, 100].forEach((progress, index) => {
      window.setTimeout(() => hub.updateJob(job.id, { progress }), 500 * (index + 1));
    });
    window.setTimeout(() => {
      hub.updateJob(job.id, { status: 'complete', progress: 100 });
      const target = hub.items.find((item) => item.id === job.targetId);
      if (target) hub.updateContent({ ...target, processing: { status: 'ready' } });
      hub.addAudit(hub.persona.name, 'retried processing job', job.label, `attempt=${job.attempts + 1}`);
      hub.notify('Processing job completed. The record is ready for review.', 'success');
      setRetrying(null);
    }, 2400);
  };

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Processing jobs</h3>
          <p className="mt-0.5 text-xs text-white/40">Malware scanning, transcoding, AI drafting and scheduled publication</p>
        </div>
        <Pill tone="slate">{hub.jobs.length} jobs</Pill>
      </div>
      <div className="divide-y divide-white/5">
        {hub.jobs.length === 0 && (
          <div className="p-5"><EmptyState icon={Loader2} title="No jobs" description="Upload content or create a derivative draft to see processing jobs." /></div>
        )}
        {hub.jobs.map((job) => (
          <div key={job.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className={cn('rounded-xl border p-2', job.status === 'failed' ? 'border-rose-400/25 bg-rose-400/10 text-rose-300' : job.status === 'complete' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-white/50')}>
              {job.status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : job.status === 'failed' ? <AlertTriangle className="h-4 w-4" /> : <Loader2 className={cn('h-4 w-4', job.status === 'running' && 'animate-spin')} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-xs font-medium text-white/85">{job.label}</p>
                <Pill tone={job.status === 'failed' ? 'rose' : job.status === 'complete' ? 'emerald' : 'sky'}>{job.status}</Pill>
                <span className="text-[10px] text-white/30">attempt {job.attempts}</span>
              </div>
              <Meter className="mt-2 max-w-md" value={job.progress} tone={job.status === 'failed' ? 'rose' : job.status === 'complete' ? 'emerald' : 'sky'} />
              {job.error && <p className="mt-1 text-[10px] text-rose-300/80">{job.error}</p>}
            </div>
            {job.status === 'failed' && (
              <Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" disabled={retrying === job.id} onClick={() => retry(job)}>
                {retrying === job.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />} Retry
              </Button>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
