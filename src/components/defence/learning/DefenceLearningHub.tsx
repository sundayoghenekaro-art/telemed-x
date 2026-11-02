import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, BarChart3, BookOpen, ChevronDown, ClipboardList, CloudDownload,
  GraduationCap, LayoutDashboard, LifeBuoy, Library, Lock, Menu, MessageCircleQuestion,
  RadioTower, ScrollText, Shield, ShieldAlert, Siren, UploadCloud, UserRound, Wifi, X,
} from 'lucide-react';
import {
  LEARNING_ROLE_LABEL, TRAINING_PATH_LABEL,
  applyProgressEvent, can, canDownload, getRecord, isLearnerVisible, isPipelineVisible,
  type Announcement, type Assessment, type Assignment, type Attempt, type AuditEvent,
  type Capability, type ContentItem, type DownloadEntry,
  type LearningRole, type ProcessingJob, type ProgressEvent, type PublicationEvent,
  type QuestionThread,
} from '@/lib/defenceLearning';
import {
  ANNOUNCEMENTS, ASSESSMENTS, ASSIGNMENTS, AUDIT_EVENTS, CONTENT_ITEMS, COURSES,
  DEFAULT_PERSONA_ID, PERSONAS, PUBLICATION_EVENTS, SEEDED_ATTEMPTS, SEEDED_DOWNLOADS,
  SEEDED_JOBS, SEEDED_LEDGER, SEEDED_QUESTIONS, SEEDED_SIGNOFFS,
} from '@/data/defenceLearningMockData';
import { Button } from '@/components/ui/button';
import { useAiStatus } from '@/lib/defenceAi';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ClearancePill, Pill, Surface } from './hubUi';
import { LessonPlayer } from './LessonPlayer';
import { AssessmentDialog } from './AssessmentDialog';
import type { HubApi, HubView } from './hubApi';
import { MyLearningView } from './views/MyLearningView';
import { UpdatesView } from './views/UpdatesView';
import { LibraryView } from './views/LibraryView';
import { CoursesView } from './views/CoursesView';
import { DownloadsView } from './views/DownloadsView';
import { QuestionsView } from './views/QuestionsView';
import { PublishingView } from './views/PublishingView';
import { ReportsView } from './views/ReportsView';
import { AuditView } from './views/AuditView';

const PUBLISH_CAPABILITIES: Capability[] = [
  'publish.draft', 'publish.submit', 'publish.review', 'publish.publish', 'publish.withdraw',
];

function canPublish(role: LearningRole) {
  return PUBLISH_CAPABILITIES.some((capability) => can(role, capability));
}

function canView(view: HubView, role: LearningRole) {
  switch (view) {
    case 'publishing':
      return canPublish(role);
    case 'reports':
      return can(role, 'reports.view_unit') || can(role, 'reports.view_network');
    case 'audit':
      return can(role, 'audit.view');
    case 'downloads':
      return can(role, 'download.request');
    case 'library':
      return can(role, 'library.browse');
    case 'questions':
      return can(role, 'question.ask');
    default:
      return true;
  }
}

const NAV_ITEMS: { id: HubView; label: string; short: string; icon: typeof LayoutDashboard; group: 'learn' | 'manage' }[] = [
  { id: 'my-learning', label: 'My Learning', short: 'Home', icon: LayoutDashboard, group: 'learn' },
  { id: 'updates', label: 'Official HQ Updates', short: 'Updates', icon: RadioTower, group: 'learn' },
  { id: 'library', label: 'Content Library', short: 'Library', icon: Library, group: 'learn' },
  { id: 'courses', label: 'Courses & Paths', short: 'Courses', icon: GraduationCap, group: 'learn' },
  { id: 'downloads', label: 'Downloads', short: 'Offline', icon: CloudDownload, group: 'learn' },
  { id: 'questions', label: 'Questions & Support', short: 'Support', icon: MessageCircleQuestion, group: 'learn' },
  { id: 'publishing', label: 'Publishing & Review', short: 'Publishing', icon: UploadCloud, group: 'manage' },
  { id: 'reports', label: 'Assignments & Reports', short: 'Reports', icon: BarChart3, group: 'manage' },
  { id: 'audit', label: 'Audit & Lifecycle', short: 'Audit', icon: ScrollText, group: 'manage' },
];

const VIEW_TITLE: Record<HubView, string> = {
  'my-learning': 'My Learning',
  updates: 'Official HQ Updates',
  library: 'Content Library',
  courses: 'Courses & Learning Paths',
  downloads: 'Downloads & Offline',
  questions: 'Questions & Instructor Support',
  publishing: 'Publishing & Review',
  reports: 'Assignments & Reports',
  audit: 'Audit & Lifecycle',
};

export function DefenceLearningHub() {
  const navigate = useNavigate();
  const aiStatus = useAiStatus();

  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA_ID);
  const persona = useMemo(
    () => PERSONAS.find((candidate) => candidate.id === personaId) ?? PERSONAS[0],
    [personaId],
  );

  const [view, setView] = useState<HubView>('my-learning');
  const [items, setItems] = useState<ContentItem[]>(CONTENT_ITEMS);
  const [assignments, setAssignments] = useState<Assignment[]>(ASSIGNMENTS);
  const [ledger, setLedger] = useState(SEEDED_LEDGER);
  const [attempts, setAttempts] = useState<Attempt[]>(SEEDED_ATTEMPTS);
  const [downloads, setDownloads] = useState<DownloadEntry[]>(SEEDED_DOWNLOADS);
  const [questions, setQuestions] = useState<QuestionThread[]>(SEEDED_QUESTIONS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(ANNOUNCEMENTS);
  const [publication, setPublication] = useState<PublicationEvent[]>(PUBLICATION_EVENTS);
  const [audit, setAudit] = useState<AuditEvent[]>(AUDIT_EVENTS);
  const [jobs, setJobs] = useState<ProcessingJob[]>(SEEDED_JOBS);
  const [acknowledgements, setAcknowledgements] = useState<Record<string, string[]>>({
    'p-adeyemi': [ANNOUNCEMENTS[0]?.id].filter(Boolean) as string[],
    'p-hassan': ANNOUNCEMENTS.slice(0, 2).map((announcement) => announcement.id),
  });

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!canView(view, persona.role)) setView('my-learning');
  }, [view, persona.role]);

  const acknowledgedAnnouncements = acknowledgements[persona.id] ?? [];

  const notify = useCallback<HubApi['notify']>((message, type = 'info') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.info(message);
  }, []);

  const addAudit = useCallback<HubApi['addAudit']>((actor, action, target, meta) => {
    setAudit((current) => [
      { id: `au-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, actor, action, target, at: new Date().toISOString(), meta },
      ...current,
    ]);
  }, []);

  const recordEvent = useCallback<HubApi['recordEvent']>((contentId, positionSec, kind) => {
    const at = new Date().toISOString();
    const event: ProgressEvent = {
      eventId: `${persona.id}:${contentId}:${kind}:${Math.round(positionSec)}:${at}`,
      personaId: persona.id,
      contentId,
      positionSec,
      durationSec: items.find((item) => item.id === contentId)?.durationSec ?? 0,
      kind,
      at,
    };
    const alreadyCompleted = Boolean(getRecord(ledger, persona.id, contentId)?.completedAt);
    setLedger((current) => applyProgressEvent(current, event));
    if (kind === 'completed' && !alreadyCompleted) {
      const item = items.find((candidate) => candidate.id === contentId);
      if (item) addAudit(`${persona.rank} ${persona.name}`, 'completed lesson', item.title, `version=${item.version}`);
    }
  }, [persona, items, ledger, addAudit]);

  const openItem = useCallback((contentId: string) => {
    const item = items.find((candidate) => candidate.id === contentId);
    if (!item) {
      notify('That record is no longer in the catalogue.', 'error');
      return;
    }
    if (!isLearnerVisible(persona, item)) {
      notify('This content is outside your clearance, unit or training scope.', 'error');
      return;
    }
    if (item.processing?.status === 'failed') {
      notify('This media failed processing and is not yet playable.', 'error');
      return;
    }
    setViewingId(contentId);
    addAudit(`${persona.rank} ${persona.name}`, 'opened lesson', item.title, `classification=${item.classification}`);
  }, [items, persona, notify, addAudit]);

  const viewItem = useCallback((contentId: string) => {
    const item = items.find((candidate) => candidate.id === contentId);
    if (!item) {
      notify('That record is not in the catalogue.', 'error');
      return;
    }
    if (!isPipelineVisible({ role: persona.role, personaId: persona.id }, item)) {
      notify('That record is outside your pipeline scope.', 'error');
      return;
    }
    setViewingId(contentId);
  }, [items, persona, notify]);

  const startAssessment = useCallback((id: string) => {
    setAssessmentId(id);
  }, []);

  const addAssignment = useCallback<HubApi['addAssignment']>((assignment) => {
    setAssignments((current) => [assignment, ...current]);
  }, []);

  const updateContent = useCallback<HubApi['updateContent']>((item) => {
    setItems((current) => current.map((candidate) => (candidate.id === item.id ? item : candidate)));
  }, []);

  const addContent = useCallback<HubApi['addContent']>((item) => {
    setItems((current) => [item, ...current]);
  }, []);

  const addPublication = useCallback<HubApi['addPublication']>((event) => {
    setPublication((current) => [event, ...current]);
  }, []);

  const addJob = useCallback<HubApi['addJob']>((job) => {
    setJobs((current) => [job, ...current]);
  }, []);

  const updateJob = useCallback<HubApi['updateJob']>((id, patch) => {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  }, []);

  const addDownload = useCallback<HubApi['addDownload']>((entry) => {
    setDownloads((current) => [entry, ...current]);
  }, []);

  const updateDownload = useCallback<HubApi['updateDownload']>((id, patch) => {
    setDownloads((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }, []);

  const removeDownload = useCallback<HubApi['removeDownload']>((id) => {
    setDownloads((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const addQuestion = useCallback<HubApi['addQuestion']>((thread) => {
    setQuestions((current) => [thread, ...current]);
  }, []);

  const answerQuestion = useCallback<HubApi['answerQuestion']>((id, answer, citations) => {
    setQuestions((current) => current.map((thread) => (
      thread.id === id
        ? {
            ...thread,
            status: 'answered',
            answer,
            citations,
            answeredBy: `${persona.rank} ${persona.name}`,
          }
        : thread
    )));
  }, [persona]);

  const acknowledgeAnnouncement = useCallback<HubApi['acknowledgeAnnouncement']>((id) => {
    setAcknowledgements((current) => {
      const existing = current[persona.id] ?? [];
      if (existing.includes(id)) return current;
      return { ...current, [persona.id]: [...existing, id] };
    });
    const announcement = announcements.find((candidate) => candidate.id === id);
    if (announcement) {
      addAudit(`${persona.rank} ${persona.name}`, 'acknowledged update', announcement.title, `classification=${announcement.classification}`);
    }
    notify('Acknowledgement recorded.', 'success');
  }, [persona, announcements, addAudit, notify]);

  const requestDownload = useCallback((contentId: string) => {
    const item = items.find((candidate) => candidate.id === contentId);
    if (!item || !canDownload(persona, item)) {
      notify('The publisher does not allow a download of this item for your role.', 'error');
      return;
    }
    const existing = downloads.find(
      (entry) => entry.personaId === persona.id && entry.contentId === contentId && entry.status !== 'revoked',
    );
    if (existing) {
      notify('This item is already stored on the device.', 'info');
      return;
    }
    const entry: DownloadEntry = {
      id: `dl-${Date.now()}`,
      personaId: persona.id,
      contentId,
      quality: item.downloadPolicy === 'audio_only' ? '360p' : '720p',
      audioOnly: item.downloadPolicy === 'audio_only',
      includeTranscript: true,
      sizeMb: Math.max(3, Math.round(item.fileSizeMb * (item.downloadPolicy === 'audio_only' ? 0.45 : 1))),
      status: 'downloading',
      progress: 0,
      downloadedVersion: item.version,
      lastSyncAt: null,
    };
    addDownload(entry);
    addAudit(`${persona.rank} ${persona.name}`, 'requested download', item.title, `policy=${item.downloadPolicy}`);
    [24, 58, 86].forEach((progress, index) => {
      window.setTimeout(() => updateDownload(entry.id, { progress }), 600 * (index + 1));
    });
    window.setTimeout(() => {
      updateDownload(entry.id, { status: 'ready', progress: 100, lastSyncAt: new Date().toISOString() });
      notify(`${item.title} is ready for offline use.`, 'success');
    }, 3000);
  }, [items, persona, downloads, notify, addDownload, addAudit, updateDownload]);

  const viewingItem = viewingId ? items.find((item) => item.id === viewingId) ?? null : null;
  const activeAssessment: Assessment | null = assessmentId
    ? ASSESSMENTS.find((assessment) => assessment.id === assessmentId) ?? null
    : null;
  const itemAssessment = viewingItem
    ? ASSESSMENTS.find((assessment) => assessment.contentId === viewingItem.id) ?? null
    : null;
  const itemRecord = viewingItem ? getRecord(ledger, persona.id, viewingItem.id) : null;
  const itemSignoff = viewingItem
    ? SEEDED_SIGNOFFS.find((signoff) => signoff.personaId === persona.id && signoff.contentId === viewingItem.id) ?? null
    : null;
  const itemAttempts = viewingItem ? attempts.filter((attempt) => attempt.personaId === persona.id) : [];

  const hub: HubApi = {
    persona,
    personas: PERSONAS,
    items,
    courses: COURSES,
    assessments: ASSESSMENTS,
    assignments,
    ledger,
    attempts,
    signoffs: SEEDED_SIGNOFFS,
    downloads,
    questions,
    announcements,
    publication,
    audit,
    jobs,
    acknowledgedAnnouncements,
    openItem,
    viewItem,
    recordEvent,
    startAssessment,
    addAssignment,
    updateContent,
    addContent,
    addAudit,
    addPublication,
    addJob,
    updateJob,
    addDownload,
    updateDownload,
    removeDownload,
    addQuestion,
    answerQuestion,
    acknowledgeAnnouncement,
    notify,
    goTo: (next) => {
      setView(next);
      setMobileNavOpen(false);
    },
  };

  const visibleNav = NAV_ITEMS.filter((item) => canView(item.id, persona.role));
  const pendingAcks = announcements.filter(
    (announcement) => announcement.acknowledgementRequired && !acknowledgedAnnouncements.includes(announcement.id),
  ).length;

  const renderView = () => {
    switch (view) {
      case 'updates':
        return <UpdatesView hub={hub} />;
      case 'library':
        return <LibraryView hub={hub} />;
      case 'courses':
        return <CoursesView hub={hub} />;
      case 'downloads':
        return <DownloadsView hub={hub} />;
      case 'questions':
        return <QuestionsView hub={hub} />;
      case 'publishing':
        return <PublishingView hub={hub} />;
      case 'reports':
        return <ReportsView hub={hub} />;
      case 'audit':
        return <AuditView hub={hub} />;
      default:
        return <MyLearningView hub={hub} />;
    }
  };

  const navList = (compact: boolean) => (
    <nav className={cn('space-y-6', compact && 'px-1')}>
      {(['learn', 'manage'] as const).map((group) => {
        const groupItems = visibleNav.filter((item) => item.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group}>
            <p className="px-3 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/25">
              {group === 'learn' ? 'Learn' : 'Manage'}
            </p>
            <div className="mt-2 space-y-0.5">
              {groupItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setView(item.id); setMobileNavOpen(false); }}
                    className={cn(
                      'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors',
                      active
                        ? 'border border-sky-400/30 bg-sky-400/10 text-white'
                        : 'border border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/85',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-sky-300' : 'text-white/35 group-hover:text-white/60')} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.id === 'updates' && pendingAcks > 0 && (
                      <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200">{pendingAcks}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--gradient-hero)' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 top-0 h-[520px] w-[520px] rounded-full opacity-[0.16] blur-[130px]" style={{ background: 'hsl(40 90% 45%)' }} />
        <div className="absolute -left-40 bottom-0 h-[460px] w-[460px] rounded-full opacity-[0.14] blur-[120px]" style={{ background: 'hsl(202 57% 44%)' }} />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070c14]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <button type="button" onClick={() => navigate('/defense-health')} className="flex items-center gap-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20">
              <Shield className="h-5 w-5 text-amber-400" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold tracking-tight">Defence Learning</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-white/35">& Communications Hub</span>
            </span>
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-2 text-[11px] text-white/35 md:flex">
            <span className="text-white/25">/</span>
            <span className="truncate text-white/60">{VIEW_TITLE[view]}</span>
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white/40">
              <Wifi className="h-2.5 w-2.5 text-emerald-300" /> synced {clock.toISOString().slice(11, 16)}Z
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="hidden border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20 sm:inline-flex"
              onClick={() => setEmergencyOpen(true)}
            >
              <Siren className="mr-1.5 h-3.5 w-3.5" /> Emergency
            </Button>

            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-2.5 py-1.5">
              <UserRound className="h-3.5 w-3.5 text-white/35" />
              <span className="hidden text-[9px] uppercase tracking-[0.14em] text-white/30 xl:block">Simulated sign-in</span>
              <select
                value={persona.id}
                onChange={(event) => {
                  setPersonaId(event.target.value);
                  setViewingId(null);
                  setAssessmentId(null);
                }}
                className="max-w-[10rem] bg-transparent text-[11px] text-white outline-none"
                aria-label="Switch demonstration persona"
              >
                {PERSONAS.map((candidate) => (
                  <option key={candidate.id} value={candidate.id} className="bg-slate-900">
                    {candidate.rank} {candidate.name} — {LEARNING_ROLE_LABEL[candidate.role]}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3 w-3 text-white/30" />
            </label>

            <Button
              size="sm"
              variant="ghost"
              className="hidden text-white/50 hover:bg-white/10 hover:text-white lg:inline-flex"
              onClick={() => navigate('/defense-health')}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Defence home
            </Button>
          </div>
        </div>

        <div className="border-t border-white/5 bg-black/20">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
            <ClearancePill clearance={persona.clearance} />
            <Pill tone="slate">{TRAINING_PATH_LABEL[persona.path]}</Pill>
            <Pill tone="slate">{persona.unit}</Pill>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-white/30">
              <Lock className="h-3 w-3" /> Service number {persona.serviceNumber}
            </span>
          </div>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-[1500px] gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-32 space-y-5">
            <Surface className="p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-sky-400/25 bg-sky-400/10 p-1.5 text-sky-300">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{persona.rank} {persona.name}</p>
                  <p className="truncate text-[10px] text-white/40">{LEARNING_ROLE_LABEL[persona.role]}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-[10px] text-white/35">
                <p className="flex items-center justify-between"><span>Branch</span><span className="uppercase text-white/55">{persona.branch}</span></p>
                <p className="flex items-center justify-between"><span>Formation</span><span className="truncate pl-2 text-right text-white/55">{persona.formation}</span></p>
                <p className="flex items-center justify-between"><span>Facility</span><span className="truncate pl-2 text-right text-white/55">{persona.facility}</span></p>
              </div>
            </Surface>
            {navList(false)}
            <Surface className="border-amber-400/20 bg-amber-400/[0.05] p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/80">
                <ShieldAlert className="h-3 w-3" /> Synthetic demo
              </p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
                Catalogue, media and people are synthetic. No live clinical records, no real accreditation and no
                stored media are used in this environment.
              </p>
            </Surface>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-2">
              <ClearancePill clearance={persona.clearance} />
              <Pill tone="slate">{LEARNING_ROLE_LABEL[persona.role]}</Pill>
            </div>
            <Button size="sm" variant="outline" className="border-rose-400/30 bg-rose-400/10 text-rose-200" onClick={() => setEmergencyOpen(true)}>
              <Siren className="mr-1.5 h-3.5 w-3.5" /> Emergency
            </Button>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-[10px] leading-relaxed text-white/35">
            <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
            <span>
              Every catalogue record below is synthetic demonstration content. Permissions shown in the interface mirror
              the SQL policies in the hub migration;{' '}
              {aiStatus?.configured
                ? `generated answers use ${aiStatus.provider} (${aiStatus.model}) and cite approved sections only.`
                : 'AI features remain unavailable until a provider is configured.'}
            </span>
          </div>

          {renderView()}

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 text-[10px] text-white/25">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-500/50" /> Defence Learning & Communications Hub — by TRIKA Health</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><LifeBuoy className="h-3 w-3" /> Not an emergency channel</span>
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Authorised personnel only</span>
            </span>
          </footer>
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-white/10 bg-[#080d16] px-4 py-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold"><Shield className="h-4 w-4 text-amber-400" /> Defence Learning</p>
              <button type="button" onClick={() => setMobileNavOpen(false)} className="rounded-lg border border-white/10 p-1.5 text-white/50" aria-label="Close navigation">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-medium text-white">{persona.rank} {persona.name}</p>
              <p className="text-[10px] text-white/40">{LEARNING_ROLE_LABEL[persona.role]} · {persona.unit}</p>
            </div>
            {navList(true)}
            <Button
              variant="outline"
              className="mt-6 w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => navigate('/defense-health')}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Defence home
            </Button>
          </div>
        </div>
      )}

      {viewingItem && (
        <LessonPlayer
          item={viewingItem}
          persona={persona}
          record={itemRecord}
          assessment={itemAssessment}
          attempts={itemAttempts}
          signoff={itemSignoff}
          onClose={() => setViewingId(null)}
          onRecord={(positionSec, kind) => recordEvent(viewingItem.id, positionSec, kind)}
          onStartAssessment={itemAssessment ? () => { setViewingId(null); startAssessment(itemAssessment.id); } : undefined}
          onAskQuestion={() => {
            setViewingId(null);
            setView('questions');
            notify('Your position is saved. Ask your question below.', 'info');
          }}
          onDownload={() => requestDownload(viewingItem.id)}
        />
      )}

      <AssessmentDialog
        open={Boolean(activeAssessment)}
        assessment={activeAssessment}
        persona={persona}
        attempts={attempts.filter((attempt) => attempt.personaId === persona.id)}
        onClose={() => setAssessmentId(null)}
        onComplete={(attempt) => {
          setAttempts((current) => [...current, attempt]);
          const assessment = activeAssessment;
          addAudit(
            `${persona.rank} ${persona.name}`,
            attempt.passed ? 'passed assessment' : 'attempted assessment',
            assessment?.title ?? attempt.assessmentId,
            `score=${attempt.score}%; passMark=${assessment?.passMark ?? '—'}%`,
          );
          notify(
            attempt.passed
              ? `Assessment passed with ${attempt.score}%.`
              : `Scored ${attempt.score}% — below the ${assessment?.passMark ?? 0}% pass mark.`,
            attempt.passed ? 'success' : 'error',
          );
        }}
      />

      <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
        <DialogContent className="border-white/10 bg-[#0b1119] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Siren className="h-5 w-5 text-rose-300" /> This hub is not an emergency channel
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Training content, AI support and instructor questions are not monitored for emergencies and must never be
              used for clinical decisions in an emergency.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-4 text-xs leading-relaxed text-white/60">
            For a clinical emergency, use the casualty evacuation net or contact the on-call command surgeon directly.
            For a security incident, notify the defence health watch officer. Do not upload patient-identifiable data to
            this hub.
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setEmergencyOpen(false)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
