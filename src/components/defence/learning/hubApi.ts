import type {
  Announcement,
  Assessment,
  Assignment,
  Attempt,
  AuditEvent,
  CompetencySignoff,
  ContentItem,
  Course,
  DownloadEntry,
  Persona,
  ProcessingJob,
  ProgressEvent,
  ProgressLedger,
  PublicationEvent,
  QuestionThread,
} from '@/lib/defenceLearning';

export type HubView =
  | 'my-learning'
  | 'updates'
  | 'library'
  | 'courses'
  | 'downloads'
  | 'questions'
  | 'publishing'
  | 'reports'
  | 'audit';

export interface HubApi {
  persona: Persona;
  personas: Persona[];
  items: ContentItem[];
  courses: Course[];
  assessments: Assessment[];
  assignments: Assignment[];
  ledger: ProgressLedger;
  attempts: Attempt[];
  signoffs: CompetencySignoff[];
  downloads: DownloadEntry[];
  questions: QuestionThread[];
  announcements: Announcement[];
  publication: PublicationEvent[];
  audit: AuditEvent[];
  jobs: ProcessingJob[];
  acknowledgedAnnouncements: string[];
  openItem: (contentId: string) => void;
  viewItem: (contentId: string) => void;
  recordEvent: (contentId: string, positionSec: number, kind: ProgressEvent['kind']) => void;
  startAssessment: (assessmentId: string) => void;
  addAssignment: (assignment: Assignment) => void;
  updateContent: (item: ContentItem) => void;
  addContent: (item: ContentItem) => void;
  addAudit: (actor: string, action: string, target: string, meta?: string) => void;
  addPublication: (event: PublicationEvent) => void;
  addJob: (job: ProcessingJob) => void;
  updateJob: (id: string, patch: Partial<ProcessingJob>) => void;
  addDownload: (entry: DownloadEntry) => void;
  updateDownload: (id: string, patch: Partial<DownloadEntry>) => void;
  removeDownload: (id: string) => void;
  addQuestion: (thread: QuestionThread) => void;
  answerQuestion: (id: string, answer: string, citations: QuestionThread['citations']) => void;
  acknowledgeAnnouncement: (id: string) => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  goTo: (view: HubView) => void;
}
