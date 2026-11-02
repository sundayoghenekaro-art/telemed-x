import {
  AlertTriangle, ArrowRight, BookOpen, CalendarClock, CheckCircle2, Clock,
  FlaskConical, GraduationCap, Play, ShieldCheck, Sparkles, Target, TrendingUp,
} from 'lucide-react';
import type { Assignment, Course, ContentItem, Persona } from '@/lib/defenceLearning';
import {
  CLEARANCE_RANK, competencyLadder, dueLabel, filterVisible, formatClock,
  formatDate, getRecord, TRAINING_PATH_LABEL,
} from '@/lib/defenceLearning';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ClearancePill, EmptyState, MicroLabel, Meter, MotifArt, Pill, ProgressRing,
  StatTile, Surface,
} from '../hubUi';
import type { HubApi } from '../hubApi';

interface AssignmentState {
  assignment: Assignment;
  percent: number;
  completed: boolean;
  acknowledged: boolean;
  item: ContentItem | null;
  course: Course | null;
}

function assignmentState(hub: HubApi, assignment: Assignment, persona: Persona): AssignmentState {
  if (assignment.contentId) {
    const item = filterVisible(persona, hub.items).find((candidate) => candidate.id === assignment.contentId) ?? null;
    const record = getRecord(hub.ledger, persona.id, assignment.contentId);
    return {
      assignment,
      percent: record?.percent ?? 0,
      completed: Boolean(record?.completedAt),
      acknowledged: Boolean(record?.acknowledgedAt),
      item,
      course: null,
    };
  }
  const course = hub.courses.find((candidate) => candidate.id === assignment.courseId) ?? null;
  const records = (course?.lessonIds ?? []).map((lessonId) => getRecord(hub.ledger, persona.id, lessonId));
  const percent = records.length
    ? Math.round(records.reduce((total, record) => total + (record?.percent ?? 0), 0) / records.length)
    : 0;
  return {
    assignment,
    percent,
    completed: records.length > 0 && records.every((record) => Boolean(record?.completedAt)),
    acknowledged: records.every((record) => Boolean(record?.acknowledgedAt)) && records.length > 0,
    item: null,
    course,
  };
}

export function MyLearningView({ hub }: { hub: HubApi }) {
  const { persona } = hub;
  const visible = filterVisible(persona, hub.items);
  const myAssignments = hub.assignments.filter(
    (assignment) =>
      assignment.targetKind === 'persona'
        ? assignment.targetId === persona.id
        : assignment.targetId === persona.unit,
  );
  const states = myAssignments.map((assignment) => assignmentState(hub, assignment, persona));

  const completedCount = states.filter((state) => state.completed).length;
  const overdue = states.filter(
    (state) => !state.completed && new Date(state.assignment.dueAt).getTime() < Date.now(),
  );
  const competencies = hub.signoffs.filter(
    (signoff) => signoff.personaId === persona.id && signoff.level === 'competent',
  );

  const records = Object.values(hub.ledger.records)
    .filter((record) => record.personaId === persona.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const continueRecord = records.find((record) => {
    if (record.completedAt) return false;
    const item = hub.items.find((candidate) => candidate.id === record.contentId);
    return item ? visible.some((candidate) => candidate.id === item.id) : false;
  });
  const continueItem = continueRecord
    ? hub.items.find((item) => item.id === continueRecord.contentId) ?? null
    : null;

  const focusItem = visible.find((item) => item.id === 'c-tourniquet') ?? visible[0] ?? null;
  const focusRecord = focusItem ? getRecord(hub.ledger, persona.id, focusItem.id) : null;
  const focusAssessment = hub.assessments.find((assessment) => assessment.contentId === focusItem?.id) ?? null;
  const focusAttempts = focusAssessment
    ? hub.attempts.filter((attempt) => attempt.assessmentId === focusAssessment.id && attempt.personaId === persona.id)
    : [];
  const focusSignoff = focusItem
    ? hub.signoffs.find((signoff) => signoff.personaId === persona.id && signoff.contentId === focusItem.id) ?? null
    : null;
  const ladder = competencyLadder(focusRecord, focusAttempts, focusSignoff);

  const recommended = visible
    .filter((item) => item.id !== continueItem?.id && item.id !== focusItem?.id)
    .sort((a, b) => Number(b.mandatory) - Number(a.mandatory) || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, 3);

  const latestUpdates = hub.announcements
    .filter((announcement) => CLEARANCE_RANK[announcement.classification] <= CLEARANCE_RANK[persona.clearance])
    .slice(0, 3);

  const openAssignment = (state: AssignmentState) => {
    if (state.assignment.contentId) {
      hub.openItem(state.assignment.contentId);
      return;
    }
    const course = state.course;
    if (!course) {
      hub.notify('The linked course is not available in this catalogue.', 'error');
      return;
    }
    const nextLesson = course.lessonIds.find((lessonId) => !getRecord(hub.ledger, persona.id, lessonId)?.completedAt)
      ?? course.lessonIds[0];
    if (nextLesson) hub.openItem(nextLesson);
    else hub.notify('This course has no lessons attached yet.', 'error');
  };

  return (
    <div className="space-y-6">
      <Surface className="relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="amber">Synthetic demonstration dataset</Pill>
              <ClearancePill clearance={persona.clearance} />
              <Pill tone="slate">{TRAINING_PATH_LABEL[persona.path]}</Pill>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {persona.rank} {persona.name}
            </h1>
            <p className="mt-1 text-sm text-white/45">
              {persona.unit} · {persona.formation} · {persona.serviceNumber}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">
              Your learning, mandatory briefings and competency record live here. Everything you see is scoped to your
              unit, clearance and training path.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
            <div className="relative">
              <ProgressRing
                value={states.length ? Math.round((completedCount / states.length) * 100) : 0}
                size={72}
                tone="#38bdf8"
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
                {states.length ? Math.round((completedCount / states.length) * 100) : 0}%
              </span>
            </div>
            <div className="text-xs text-white/50">
              <p className="text-sm font-semibold text-white">Assignment completion</p>
              <p>{completedCount} of {states.length} complete</p>
              <p className="mt-1 text-[11px] text-white/35">Due dates are set by your training officer.</p>
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Assigned" value={states.length} detail="Items and courses in scope" tone="sky" icon={BookOpen} />
        <StatTile label="Completed" value={completedCount} detail="Finished with a completion record" tone="emerald" icon={CheckCircle2} />
        <StatTile label="Overdue" value={overdue.length} detail={overdue.length ? 'Escalated to your unit officer' : 'Nothing overdue'} tone={overdue.length ? 'rose' : 'slate'} icon={AlertTriangle} />
        <StatTile label="Competencies" value={competencies.length} detail="Signed practical competencies" tone="violet" icon={GraduationCap} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {continueItem ? (
            <Surface interactive className="overflow-hidden">
              <div className="grid gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
                <MotifArt item={continueItem} className="h-44 w-full rounded-none border-0 md:h-full" />
                <div className="flex flex-col justify-between gap-4 p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <MicroLabel>Continue where you left off</MicroLabel>
                      {continueItem.mandatory && <Pill tone="rose">Mandatory</Pill>}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{continueItem.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-white/45">{continueItem.summary}</p>
                  </div>
                  <div>
                    <Meter value={continueRecord?.percent ?? 0} tone="sky" />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-white/40">
                        {(continueRecord?.percent ?? 0)}% · {formatClock(continueItem.durationSec)}
                      </span>
                      <Button className="bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={() => hub.openItem(continueItem.id)}>
                        <Play className="mr-1.5 h-4 w-4" /> Resume
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Surface>
          ) : (
            <Surface className="p-6">
              <EmptyState
                icon={Sparkles}
                title="You have no lessons in progress"
                description="Start with a mandatory briefing below, or open the content library to browse everything in your scope."
                action={(
                  <Button className="bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={() => hub.goTo('library')}>
                    Browse the library <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                )}
              />
            </Surface>
          )}

          <Surface className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Assigned to you</h3>
                <p className="mt-0.5 text-xs text-white/40">Persona assignments plus unit-wide tasking for {persona.unit}</p>
              </div>
              <Pill tone="slate">{myAssignments.length} items</Pill>
            </div>
            <div className="divide-y divide-white/5">
              {states.length === 0 && (
                <div className="p-5">
                  <EmptyState icon={Target} title="Nothing assigned" description="Your training officer has not assigned anything to you or your unit." />
                </div>
              )}
              {states
                .slice()
                .sort((a, b) => new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime())
                .map((state) => {
                  const due = dueLabel(state.assignment.dueAt);
                  const title = state.item?.title ?? state.course?.title ?? state.assignment.title;
                  const meta = state.item
                    ? `${state.item.kind} · ${formatClock(state.item.durationSec)}`
                    : `${state.course?.lessonIds.length ?? 0} lessons · ${state.course?.estimatedMinutes ?? 0} min`;
                  return (
                    <div key={state.assignment.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                        {state.item ? <BookOpen className="h-4 w-4 text-sky-300" /> : <GraduationCap className="h-4 w-4 text-violet-300" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">{title}</p>
                          {state.completed && <Pill tone="emerald">Complete</Pill>}
                          {!state.completed && due.tone === 'overdue' && <Pill tone="rose">{due.text}</Pill>}
                          {!state.completed && due.tone === 'soon' && <Pill tone="amber">{due.text}</Pill>}
                          {state.assignment.requireAcknowledgement && !state.acknowledged && <Pill tone="slate">Ack needed</Pill>}
                        </div>
                        <p className="mt-0.5 text-[11px] text-white/35">
                          {meta} · Assigned by {state.assignment.assignedBy}
                        </p>
                        <Meter className="mt-2 max-w-xs" value={state.percent} tone={state.completed ? 'emerald' : 'sky'} />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => openAssignment(state)}
                      >
                        {state.completed ? 'Review' : state.percent > 0 ? 'Continue' : 'Start'}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
            </div>
          </Surface>

          {focusItem && (
            <Surface className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Competency focus</h3>
                  <p className="mt-0.5 text-xs text-white/40">{focusItem.title}</p>
                </div>
                <Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => hub.openItem(focusItem.id)}>
                  Open lesson
                </Button>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Lesson viewed', done: ladder.viewed, hint: '≥90% watched', icon: Play },
                  { label: 'Knowledge passed', done: ladder.knowledgePassed, hint: focusAssessment ? `${focusAssessment.passMark}% pass mark` : 'No assessment', icon: FlaskConical },
                  { label: 'Practical completed', done: ladder.practicalCompleted, hint: focusSignoff?.signedBy ?? 'Instructor station', icon: Target },
                  { label: 'Competency signed', done: ladder.competencySigned, hint: 'Final sign-off', icon: ShieldCheck },
                ].map((step) => (
                  <div key={step.label} className={cn('rounded-xl border p-4', step.done ? 'border-emerald-400/25 bg-emerald-400/[0.06]' : 'border-white/10 bg-white/[0.02]')}>
                    <step.icon className={cn('h-4 w-4', step.done ? 'text-emerald-300' : 'text-white/30')} />
                    <p className={cn('mt-3 text-xs font-medium', step.done ? 'text-white' : 'text-white/50')}>{step.label}</p>
                    <p className="mt-0.5 text-[10px] text-white/35">{step.hint}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
                <p className="text-[11px] text-white/35">
                  Competency levels are tracked separately from course completion. Practical sign-off can only be recorded by an instructor.
                </p>
                {focusAssessment && ladder.knowledgePassed === false && (
                  <Button size="sm" className="bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={() => hub.startAssessment(focusAssessment.id)}>
                    <FlaskConical className="mr-1.5 h-3.5 w-3.5" /> Take knowledge check
                  </Button>
                )}
              </div>
            </Surface>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recommended for your path</h3>
              <button type="button" className="text-xs text-sky-300 hover:text-sky-200" onClick={() => hub.goTo('library')}>
                Open library
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {recommended.map((item) => (
                <button key={item.id} type="button" onClick={() => hub.openItem(item.id)} className="text-left">
                  <Surface interactive className="h-full overflow-hidden">
                    <MotifArt item={item} className="h-28 rounded-none border-0 border-b border-white/10" />
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.mandatory && <Pill tone="rose">Mandatory</Pill>}
                        <Pill tone="slate">{formatClock(item.durationSec)}</Pill>
                        {item.sourceType !== 'official' && <Pill tone="amber">AI-assisted</Pill>}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">{item.summary}</p>
                    </div>
                  </Surface>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Surface className="p-5">
            <div className="flex items-center justify-between">
              <MicroLabel>Deadlines</MicroLabel>
              <CalendarClock className="h-4 w-4 text-white/30" />
            </div>
            <div className="mt-3 space-y-3">
              {states
                .filter((state) => !state.completed)
                .sort((a, b) => new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime())
                .slice(0, 4)
                .map((state) => {
                  const due = dueLabel(state.assignment.dueAt);
                  return (
                    <div key={state.assignment.id} className="flex items-start gap-3">
                      <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', due.tone === 'overdue' ? 'bg-rose-400' : due.tone === 'soon' ? 'bg-amber-400' : 'bg-sky-400')} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-white/80">{state.assignment.title}</p>
                        <p className={cn('text-[10px]', due.tone === 'overdue' ? 'text-rose-300' : due.tone === 'soon' ? 'text-amber-300' : 'text-white/35')}>
                          {due.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              {states.every((state) => state.completed) && (
                <p className="text-xs text-white/40">No open deadlines. Your assigned training is complete.</p>
              )}
            </div>
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center justify-between">
              <MicroLabel>HQ updates</MicroLabel>
              <button type="button" className="text-[11px] text-sky-300 hover:text-sky-200" onClick={() => hub.goTo('updates')}>
                View all
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {latestUpdates.map((announcement) => (
                <button key={announcement.id} type="button" onClick={() => hub.goTo('updates')} className="block w-full text-left">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-xs font-medium leading-snug text-white/80">{announcement.title}</p>
                      <p className="mt-0.5 text-[10px] text-white/35">{formatDate(announcement.publishedAt)} · {announcement.readMinutes} min read</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Surface>

          <Surface className="border-sky-400/20 bg-sky-400/[0.05] p-5">
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <div>
                <p className="text-xs font-semibold text-white">Why you see this</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                  Content is filtered server-side by clearance, branch, unit and training path. Withdrawn, superseded and
                  in-review records never reach learner surfaces — including their titles.
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-white/35">
                  <Clock className="h-3 w-3" /> Progress syncs from every device, idempotently.
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
