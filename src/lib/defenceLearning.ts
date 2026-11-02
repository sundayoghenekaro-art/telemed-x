// Domain model and policy for the Defence Learning & Communications Hub.
//
// Every catalogue record in this module is synthetic demonstration content. The
// functions here are deliberately pure so the same permission and visibility
// rules can be unit-tested and mirrored by the SQL policies in
// supabase/migrations (see the learning-hub migration for the server-side copy).

export type LearningRole =
  | 'learner'
  | 'instructor'
  | 'training_officer'
  | 'hq_publisher'
  | 'reviewer'
  | 'auditor'
  | 'platform_admin';

export type TrainingPath = 'general' | 'first_responder' | 'medic' | 'clinician';

export type Clearance = 'unclassified' | 'restricted' | 'confidential' | 'secret';

export type ContentKind = 'video' | 'audio' | 'pdf' | 'slides' | 'doc';

export type ContentStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'withdrawn'
  | 'superseded'
  | 'rejected';

export type SourceType = 'official' | 'ai_assisted' | 'ai_translation' | 'ai_summary';

export type DownloadPolicy = 'allowed' | 'audio_only' | 'view_only' | 'denied';

export type ChannelId =
  | 'first_aid'
  | 'devices'
  | 'equipment'
  | 'policy'
  | 'leadership'
  | 'wellbeing'
  | 'courses';

export type Capability =
  | 'learning.view'
  | 'library.browse'
  | 'download.request'
  | 'assessment.take'
  | 'question.ask'
  | 'question.answer'
  | 'course.manage'
  | 'assessment.manage'
  | 'competency.signoff'
  | 'assignment.manage'
  | 'reports.view_unit'
  | 'reports.view_network'
  | 'reports.export'
  | 'publish.draft'
  | 'publish.submit'
  | 'publish.review'
  | 'publish.publish'
  | 'publish.withdraw'
  | 'audit.view'
  | 'admin.configure';

export const CLEARANCE_RANK: Record<Clearance, number> = {
  unclassified: 0,
  restricted: 1,
  confidential: 2,
  secret: 3,
};

export const LEARNING_ROLE_LABEL: Record<LearningRole, string> = {
  learner: 'Learner',
  instructor: 'Instructor',
  training_officer: 'Unit training officer',
  hq_publisher: 'HQ publisher',
  reviewer: 'Authorised reviewer',
  auditor: 'Auditor',
  platform_admin: 'Platform administrator',
};

export const TRAINING_PATH_LABEL: Record<TrainingPath, string> = {
  general: 'General personnel',
  first_responder: 'First responder',
  medic: 'Medic',
  clinician: 'Clinician',
};

export const CONTENT_KIND_LABEL: Record<ContentKind, string> = {
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF briefing',
  slides: 'Presentation',
  doc: 'Reference document',
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  withdrawn: 'Withdrawn',
  superseded: 'Superseded',
  rejected: 'Rejected',
};

export const SOURCE_LABEL: Record<SourceType, string> = {
  official: 'Official HQ material',
  ai_assisted: 'AI-assisted draft, expert reviewed',
  ai_translation: 'AI translation, expert reviewed',
  ai_summary: 'AI summary, expert reviewed',
};

// Capabilities are the single source of truth for navigation, buttons and
// actions. The SQL migration carries the equivalent role checks for the server.
const LEARNER_CAPABILITIES: Capability[] = [
  'learning.view',
  'library.browse',
  'download.request',
  'assessment.take',
  'question.ask',
];

export const ROLE_CAPABILITIES: Record<LearningRole, Capability[]> = {
  learner: LEARNER_CAPABILITIES,
  instructor: [
    ...LEARNER_CAPABILITIES,
    'question.answer',
    'course.manage',
    'assessment.manage',
    'competency.signoff',
    'reports.view_unit',
  ],
  training_officer: [
    ...LEARNER_CAPABILITIES,
    'assignment.manage',
    'reports.view_unit',
    'reports.export',
  ],
  hq_publisher: [
    ...LEARNER_CAPABILITIES,
    'publish.draft',
    'publish.submit',
    'reports.view_unit',
  ],
  reviewer: [
    ...LEARNER_CAPABILITIES,
    'publish.review',
    'publish.publish',
    'publish.withdraw',
    'reports.view_network',
    'reports.export',
    'audit.view',
  ],
  auditor: [
    'learning.view',
    'library.browse',
    'reports.view_network',
    'reports.export',
    'audit.view',
  ],
  platform_admin: [
    'learning.view',
    'library.browse',
    'download.request',
    'assessment.take',
    'question.ask',
    'question.answer',
    'course.manage',
    'assessment.manage',
    'competency.signoff',
    'assignment.manage',
    'reports.view_unit',
    'reports.view_network',
    'reports.export',
    'publish.draft',
    'publish.submit',
    'publish.review',
    'publish.publish',
    'publish.withdraw',
    'audit.view',
    'admin.configure',
  ],
};

export function can(role: LearningRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export interface Audience {
  branches: string[] | 'all';
  units: string[] | 'all';
  trainingGroups: TrainingPath[] | 'all';
  minClearance: Clearance;
}

export interface Chapter {
  id: string;
  label: string;
  startSec: number;
}

export interface CaptionCue {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
}

export interface TranscriptSection {
  id: string;
  title: string;
  startSec: number;
  text: string;
}

export interface ContentItem {
  id: string;
  title: string;
  summary: string;
  channelId: ChannelId;
  kind: ContentKind;
  tags: string[];
  language: string;
  /** Synthetic demonstration records never claim real accreditation. */
  synthetic: true;
  publisher: {
    department: string;
    verified: boolean;
    verifiedBy: string | null;
  };
  sourceType: SourceType;
  derivedFromId?: string;
  version: string;
  status: ContentStatus;
  classification: Clearance;
  audience: Audience;
  downloadPolicy: DownloadPolicy;
  mandatory: boolean;
  acknowledgementRequired: boolean;
  languageResources: string[];
  approvedSources: string[];
  reviewer: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  reviewDueAt: string | null;
  supersededById?: string;
  supersedesId?: string;
  durationSec: number;
  fileSizeMb: number;
  chapters: Chapter[];
  captions: CaptionCue[];
  transcript: TranscriptSection[];
  relatedIds: string[];
  competenceLevel: 'Awareness' | 'Foundational' | 'Operational' | 'Advanced';
  palette: [string, string];
  motif: 'bleeding' | 'burns' | 'wounds' | 'fractures' | 'heat' | 'infection' | 'escalation' | 'device' | 'storage' | 'policy' | 'leadership' | 'wellbeing' | 'resuscitation';
  processing?: {
    status: 'pending' | 'ready' | 'scanning' | 'transcoding' | 'failed';
    failureReason?: string;
  };
}

export interface Course {
  id: string;
  title: string;
  summary: string;
  path: TrainingPath;
  lessonIds: string[];
  estimatedMinutes: number;
  mandatory: boolean;
  refresherMonths: number | null;
  owner: string;
  practicalRequired: boolean;
  assessmentId: string | null;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
  answerId: string;
  rationale: string;
  sectionId: string;
}

export interface Assessment {
  id: string;
  contentId: string;
  title: string;
  passMark: number;
  maxAttempts: number;
  questions: QuizQuestion[];
}

export interface Attempt {
  id: string;
  assessmentId: string;
  personaId: string;
  score: number;
  passed: boolean;
  completedAt: string;
  answers: Record<string, string>;
}

export interface CompetencySignoff {
  id: string;
  contentId: string;
  personaId: string;
  level: 'not_assessed' | 'developing' | 'competent';
  signedBy: string;
  signedAt: string;
  notes: string;
}

export interface Assignment {
  id: string;
  targetKind: 'persona' | 'unit';
  targetId: string;
  contentId?: string;
  courseId?: string;
  title: string;
  assignedBy: string;
  assignedAt: string;
  dueAt: string;
  requireAcknowledgement: boolean;
  assessmentId?: string;
  remindersDays: number[];
  status: 'active' | 'completed' | 'overdue';
}

export interface ProgressRecord {
  personaId: string;
  contentId: string;
  positionSec: number;
  maxPositionSec: number;
  percent: number;
  viewedAt: string | null;
  completedAt: string | null;
  acknowledgedAt: string | null;
  updatedAt: string;
}

export interface ProgressEvent {
  eventId: string;
  personaId: string;
  contentId: string;
  positionSec: number;
  durationSec: number;
  kind: 'heartbeat' | 'viewed' | 'acknowledged' | 'completed';
  at: string;
}

export interface ProgressLedger {
  records: Record<string, ProgressRecord>;
  seenEventIds: string[];
}

export interface DownloadEntry {
  id: string;
  personaId: string;
  contentId: string;
  quality: '360p' | '720p' | '1080p';
  audioOnly: boolean;
  includeTranscript: boolean;
  sizeMb: number;
  status: 'queued' | 'downloading' | 'ready' | 'failed' | 'revoked';
  progress: number;
  downloadedVersion: string;
  lastSyncAt: string | null;
  failureReason?: string;
}

export interface QuestionThread {
  id: string;
  personaId: string;
  contentId: string | null;
  body: string;
  status: 'queued' | 'answered' | 'escalated';
  createdAt: string;
  answeredBy?: string;
  answer?: string;
  citations?: { contentId: string; section: string; startSec: number }[];
}

export interface PublicationEvent {
  id: string;
  contentId: string;
  action: 'created' | 'submitted' | 'approved' | 'rejected' | 'published' | 'withdrawn' | 'superseded' | 'derivative_flagged';
  actor: string;
  at: string;
  note: string;
  version: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  meta?: string;
}

export interface ProcessingJob {
  id: string;
  kind: 'scan' | 'transcode' | 'ai_draft' | 'publish' | 'sync';
  targetId: string;
  label: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  progress: number;
  attempts: number;
  error?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  channelId: ChannelId;
  classification: Clearance;
  publishedAt: string;
  author: string;
  acknowledgementRequired: boolean;
  readMinutes: number;
}

export interface Persona {
  id: string;
  name: string;
  rank: string;
  role: LearningRole;
  branch: 'army' | 'navy' | 'airforce' | 'joint';
  formation: string;
  unit: string;
  facility: string;
  clearance: Clearance;
  path: TrainingPath;
  serviceNumber: string;
  email: string;
  joinedAt: string;
}

interface ScopeMatchable {
  branches: string[] | 'all';
  units: string[] | 'all';
  trainingGroups: TrainingPath[] | 'all';
  minClearance: Clearance;
}

function matchesScope(
  persona: Pick<Persona, 'branch' | 'unit' | 'path' | 'clearance'>,
  audience: ScopeMatchable,
): boolean {
  if (CLEARANCE_RANK[persona.clearance] < CLEARANCE_RANK[audience.minClearance]) return false;
  if (audience.branches !== 'all' && !audience.branches.includes(persona.branch)) return false;
  if (audience.units !== 'all' && !audience.units.includes(persona.unit)) return false;
  if (audience.trainingGroups !== 'all' && !audience.trainingGroups.includes(persona.path)) {
    return false;
  }
  return true;
}

/** Published content a learner may see at all. Withdrawn, superseded, draft and
 *  in-review records never reach learner surfaces — title, thumbnail and
 *  transcript included. */
export function isLearnerVisible(persona: Persona, item: ContentItem): boolean {
  if (item.status !== 'published') return false;
  if (item.processing && item.processing.status === 'failed') return false;
  return matchesScope(persona, item.audience);
}

export interface PipelineScope {
  role: LearningRole;
  personaId: string;
}

/** Records available inside publishing/review/audit surfaces. */
export function isPipelineVisible(scope: PipelineScope, item: ContentItem): boolean {
  if (scope.role === 'platform_admin') return true;
  if (scope.role === 'reviewer') return item.status !== 'draft' || item.publisher.verifiedBy === scope.personaId;
  if (scope.role === 'hq_publisher') return item.publisher.verifiedBy === scope.personaId;
  if (scope.role === 'auditor') {
    return ['published', 'withdrawn', 'superseded'].includes(item.status);
  }
  return item.status === 'published';
}

export function filterVisible(persona: Persona, items: ContentItem[]): ContentItem[] {
  return items.filter((item) => isLearnerVisible(persona, item));
}

export function canDownload(persona: Persona, item: ContentItem): boolean {
  if (!isLearnerVisible(persona, item)) return false;
  if (item.downloadPolicy === 'denied' || item.downloadPolicy === 'view_only') return false;
  return can(persona.role, 'download.request');
}

export function allowedQualities(item: ContentItem): ('360p' | '720p' | '1080p')[] {
  if (item.downloadPolicy === 'audio_only') return ['360p'];
  return ['360p', '720p', '1080p'];
}

export function progressKey(personaId: string, contentId: string): string {
  return `${personaId}:${contentId}`;
}

export function makeEmptyLedger(): ProgressLedger {
  return { records: {}, seenEventIds: [] };
}

/**
 * Apply a progress event exactly once. Reconnecting devices replay heartbeats,
 * so an event id that has already been processed must not create a second
 * completion. Position still advances monotonically for resume.
 */
export function applyProgressEvent(ledger: ProgressLedger, event: ProgressEvent): ProgressLedger {
  if (ledger.seenEventIds.includes(event.eventId)) return ledger;

  const key = progressKey(event.personaId, event.contentId);
  const previous = ledger.records[key];
  const percent = event.durationSec > 0
    ? Math.min(100, Math.round((event.positionSec / event.durationSec) * 100))
    : 0;

  const record: ProgressRecord = previous
    ? {
        ...previous,
        positionSec: event.positionSec,
        maxPositionSec: Math.max(previous.maxPositionSec, event.positionSec),
        percent: Math.max(previous.percent, percent),
        viewedAt: previous.viewedAt ?? (event.kind === 'viewed' || percent > 0 ? event.at : null),
        completedAt: previous.completedAt ?? (event.kind === 'completed' ? event.at : null),
        acknowledgedAt: previous.acknowledgedAt ?? (event.kind === 'acknowledged' ? event.at : null),
        updatedAt: event.at,
      }
    : {
        personaId: event.personaId,
        contentId: event.contentId,
        positionSec: event.positionSec,
        maxPositionSec: event.positionSec,
        percent,
        viewedAt: event.kind === 'viewed' || percent > 0 ? event.at : null,
        completedAt: event.kind === 'completed' ? event.at : null,
        acknowledgedAt: event.kind === 'acknowledged' ? event.at : null,
        updatedAt: event.at,
      };

  return {
    records: { ...ledger.records, [key]: record },
    seenEventIds: [...ledger.seenEventIds, event.eventId].slice(-600),
  };
}

export function getRecord(ledger: ProgressLedger, personaId: string, contentId: string): ProgressRecord | null {
  return ledger.records[progressKey(personaId, contentId)] ?? null;
}

export interface CompetencyLadder {
  viewed: boolean;
  knowledgePassed: boolean;
  practicalCompleted: boolean;
  competencySigned: boolean;
}

export function competencyLadder(
  record: ProgressRecord | null,
  attempts: Attempt[],
  signoff: CompetencySignoff | null,
): CompetencyLadder {
  return {
    viewed: Boolean(record?.completedAt || (record?.percent ?? 0) >= 90),
    knowledgePassed: attempts.some((attempt) => attempt.passed),
    practicalCompleted: signoff?.level === 'competent' || signoff?.level === 'developing',
    competencySigned: signoff?.level === 'competent',
  };
}

export function gradeAttempt(
  assessment: Assessment,
  answers: Record<string, string>,
): { score: number; passed: boolean; correct: string[]; incorrect: string[] } {
  const correct = assessment.questions.filter((q) => answers[q.id] === q.answerId).map((q) => q.id);
  const incorrect = assessment.questions.filter((q) => answers[q.id] !== q.answerId).map((q) => q.id);
  const score = assessment.questions.length === 0
    ? 0
    : Math.round((correct.length / assessment.questions.length) * 100);
  return { score, passed: score >= assessment.passMark, correct, incorrect };
}

export function attemptsRemaining(assessment: Assessment, attempts: Attempt[]): number {
  return Math.max(0, assessment.maxAttempts - attempts.length);
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  return `${mins}m`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(value: string): number {
  const target = new Date(value).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / 86_400_000);
}

export function dueLabel(value: string): { text: string; tone: 'overdue' | 'soon' | 'normal' } {
  const days = daysUntil(value);
  if (days < 0) return { text: `Overdue by ${Math.abs(days)}d`, tone: 'overdue' };
  if (days === 0) return { text: 'Due today', tone: 'soon' };
  if (days <= 3) return { text: `Due in ${days}d`, tone: 'soon' };
  return { text: `Due ${formatDate(value)}`, tone: 'normal' };
}

export interface RetrievalHit {
  contentId: string;
  title: string;
  sectionId: string;
  sectionTitle: string;
  startSec: number;
  snippet: string;
  score: number;
}

/**
 * Deterministic lookup over approved, learner-visible material. This is not a
 * generative model: it never invents an answer and never indexes content the
 * persona cannot open. Uploaded transcripts are treated as data only.
 */
export function retrieveApproved(
  persona: Persona,
  items: ContentItem[],
  query: string,
): RetrievalHit[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);

  if (tokens.length === 0) return [];

  const hits: RetrievalHit[] = [];

  for (const item of filterVisible(persona, items)) {
    if (item.processing?.status === 'failed') continue;
    const title = item.title.toLowerCase();
    const summary = item.summary.toLowerCase();
    const tags = item.tags.join(' ').toLowerCase();

    for (const section of item.transcript) {
      const text = section.text.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (title.includes(token)) score += 6;
        if (tags.includes(token)) score += 3;
        if (summary.includes(token)) score += 2;
        if (text.includes(token)) score += 1;
      }
      if (score === 0) continue;

      const firstIndex = Math.max(
        0,
        section.text.toLowerCase().indexOf(tokens[0]),
      );
      const snippet = section.text.slice(Math.max(0, firstIndex - 40), firstIndex + 180).trim();

      hits.push({
        contentId: item.id,
        title: item.title,
        sectionId: section.id,
        sectionTitle: section.title,
        startSec: section.startSec,
        snippet: `${snippet}${snippet.length >= 218 ? '…' : ''}`,
        score,
      });
    }
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function questionIsCovered(hits: RetrievalHit[]): boolean {
  return hits.length > 0 && hits[0].score >= 6;
}

export function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export interface ReportRow {
  personaId: string;
  name: string;
  unit: string;
  path: TrainingPath;
  assigned: number;
  started: number;
  completed: number;
  overdue: number;
  acknowledged: number;
  assessmentsPassed: number;
  competencies: number;
  refreshersDue: number;
}

export interface ReportInput {
  personas: Persona[];
  assignments: Assignment[];
  ledger: ProgressLedger;
  attempts: Attempt[];
  signoffs: CompetencySignoff[];
  items: ContentItem[];
  courses: Course[];
}

interface AssignmentState {
  assignment: Assignment;
  started: boolean;
  completed: boolean;
  acknowledged: boolean;
}

function evaluateAssignment(
  persona: Persona,
  assignment: Assignment,
  input: ReportInput,
): AssignmentState {
  if (assignment.contentId) {
    const record = getRecord(input.ledger, persona.id, assignment.contentId);
    return {
      assignment,
      started: Boolean(record?.viewedAt || record?.percent),
      completed: Boolean(record?.completedAt),
      acknowledged: Boolean(record?.acknowledgedAt),
    };
  }

  const course = input.courses.find((candidate) => candidate.id === assignment.courseId);
  const lessons = course?.lessonIds ?? [];
  const records = lessons.map((lessonId) => getRecord(input.ledger, persona.id, lessonId));
  return {
    assignment,
    started: records.some((record) => Boolean(record?.viewedAt)),
    completed: lessons.length > 0 && records.every((record) => Boolean(record?.completedAt)),
    acknowledged: false,
  };
}

/** Unit-scoped aggregates. Deliberately no ranking and no clinical fields. */
export function buildReportRows(input: ReportInput, unitScope: string | null): ReportRow[] {
  const scopedPersonas = unitScope
    ? input.personas.filter((persona) => persona.unit === unitScope)
    : input.personas;

  const now = Date.now();

  return scopedPersonas.map((persona) => {
    const assignments = input.assignments.filter(
      (assignment) =>
        assignment.targetKind === 'persona'
          ? assignment.targetId === persona.id
          : assignment.targetId === persona.unit,
    );

    const states = assignments.map((assignment) => evaluateAssignment(persona, assignment, input));

    return {
      personaId: persona.id,
      name: persona.name,
      unit: persona.unit,
      path: persona.path,
      assigned: assignments.length,
      started: states.filter((state) => state.started).length,
      completed: states.filter((state) => state.completed).length,
      overdue: assignments.filter(
        (assignment) =>
          new Date(assignment.dueAt).getTime() < now
          && !states.find((state) => state.assignment.id === assignment.id)?.completed,
      ).length,
      acknowledged: states.filter((state) => state.acknowledged).length,
      assessmentsPassed: input.attempts.filter(
        (attempt) => attempt.personaId === persona.id && attempt.passed,
      ).length,
      competencies: input.signoffs.filter(
        (signoff) => signoff.personaId === persona.id && signoff.level === 'competent',
      ).length,
      refreshersDue: assignments.filter((assignment) => {
        const item = input.items.find((candidate) => candidate.id === assignment.contentId);
        if (!item?.reviewDueAt) return false;
        return new Date(item.reviewDueAt).getTime() < now + 30 * 86_400_000;
      }).length,
    };
  });
}

export const AI_PROVIDER = {
  name: 'OpenAI',
  envKey: 'OPENAI_API_KEY',
  setupNote:
    'The AI gateway is not configured in this environment. '
    + 'Upload, review and publication workflows remain fully available.',
} as const;
