import { useMemo, useState } from 'react';
import {
  ArrowRight, BadgeCheck, CalendarCheck2, CheckCircle2, Circle, GraduationCap,
  ListChecks, PlayCircle, RefreshCw, Target,
} from 'lucide-react';
import type { Course } from '@/lib/defenceLearning';
import {
  attemptsRemaining, can, competencyLadder, dueLabel, filterVisible, formatClock,
  formatDate, getRecord, TRAINING_PATH_LABEL,
} from '@/lib/defenceLearning';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmptyState, FilterChip, Meter, MotifArt, Pill, ProgressRing, Surface } from '../hubUi';
import type { HubApi } from '../hubApi';

function courseState(hub: HubApi, course: Course) {
  const inScope = filterVisible(hub.persona, hub.items);
  const lessons = course.lessonIds
    .map((id) => inScope.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const records = course.lessonIds.map((id) => getRecord(hub.ledger, hub.persona.id, id));
  const percent = records.length
    ? Math.round(records.reduce((total, record) => total + (record?.percent ?? 0), 0) / records.length)
    : 0;
  const completedLessons = records.filter((record) => record?.completedAt).length;
  const nextLesson = course.lessonIds.find((id) => !getRecord(hub.ledger, hub.persona.id, id)?.completedAt);
  const assessment = hub.assessments.find((candidate) => candidate.id === course.assessmentId) ?? null;
  const attempts = assessment
    ? hub.attempts.filter((attempt) => attempt.assessmentId === assessment.id && attempt.personaId === hub.persona.id)
    : [];
  const practicalSignoffs = hub.signoffs.filter(
    (signoff) => signoff.personaId === hub.persona.id && course.lessonIds.includes(signoff.contentId),
  );
  const lastCompleted = records
    .map((record) => record?.completedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .pop();
  const refresherDue = course.refresherMonths && lastCompleted
    ? new Date(new Date(lastCompleted).setMonth(new Date(lastCompleted).getMonth() + course.refresherMonths)).toISOString()
    : null;
  return {
    lessons,
    records,
    percent,
    completedLessons,
    nextLesson,
    assessment,
    attempts,
    practicalSignoffs,
    refresherDue,
    completed: lessons.length > 0 && completedLessons === lessons.length,
  };
}

export function CoursesView({ hub }: { hub: HubApi }) {
  const visible = filterVisible(hub.persona, hub.items);
  const visibleCourses = hub.courses.filter((course) =>
    course.lessonIds.some((lessonId) => visible.some((item) => item.id === lessonId)),
  );
  const [path, setPath] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(visibleCourses[0]?.id ?? null);

  const courses = useMemo(
    () => visibleCourses.filter((course) => path === 'all' || course.path === path),
    [visibleCourses, path],
  );

  return (
    <div className="space-y-6">
      <Surface className="p-6">
        <Pill tone="violet">Courses & learning paths</Pill>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Structured training and competency</h1>
        <p className="mt-1 max-w-3xl text-sm text-white/50">
          Courses link lessons, a knowledge check, practical sign-off and a refresher interval. Completion of a course
          does not grant a clinical competency on its own — the ladder is completed by an instructor.
        </p>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={path === 'all'} onClick={() => setPath('all')}>All paths</FilterChip>
          {Object.entries(TRAINING_PATH_LABEL).map(([value, label]) => (
            <FilterChip key={value} active={path === value} onClick={() => setPath(value)}>{label}</FilterChip>
          ))}
        </div>
      </Surface>

      {courses.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No courses for this path" description="No course in your scope belongs to the selected training path." />
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const state = courseState(hub, course);
            const isOpen = expanded === course.id;
            const assessmentRemaining = state.assessment ? attemptsRemaining(state.assessment, state.attempts) : 0;
            const knowledgePassed = state.attempts.some((attempt) => attempt.passed);
            const practicalSigned = state.practicalSignoffs.some((signoff) => signoff.level === 'competent');
            return (
              <Surface key={course.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : course.id)}
                  className="flex w-full flex-wrap items-center gap-5 p-5 text-left"
                >
                  <div className="relative shrink-0">
                    <ProgressRing value={state.percent} size={62} tone={state.completed ? '#34d399' : '#a78bfa'} />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">
                      {Math.round(state.percent)}%
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="violet">{TRAINING_PATH_LABEL[course.path]}</Pill>
                      {course.mandatory && <Pill tone="rose">Mandatory</Pill>}
                      {state.completed && <Pill tone="emerald">Course complete</Pill>}
                      {state.refresherDue && dueLabel(state.refresherDue).tone !== 'normal' && (
                        <Pill tone="amber">Refresher {dueLabel(state.refresherDue).text.toLowerCase()}</Pill>
                      )}
                    </div>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">{course.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">{course.summary}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-white/35">
                      <span className="flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5" /> {state.completedLessons}/{course.lessonIds.length} lessons</span>
                      <span className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> {course.estimatedMinutes} min</span>
                      <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {course.owner}</span>
                      {state.refresherDue && <span className="flex items-center gap-1"><CalendarCheck2 className="h-3.5 w-3.5" /> Refresher {formatDate(state.refresherDue)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Meter className="hidden w-28 lg:block" value={state.percent} tone={state.completed ? 'emerald' : 'violet'} />
                    <span className={cn('rounded-full border border-white/10 bg-white/5 p-2 text-white/50 transition-transform', isOpen && 'rotate-90')}>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/10">
                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Lessons</p>
                        <div className="mt-2 space-y-1.5">
                          {state.lessons.map((lesson, index) => {
                            const record = getRecord(hub.ledger, hub.persona.id, lesson.id);
                            const done = Boolean(record?.completedAt);
                            return (
                              <button
                                key={lesson.id}
                                type="button"
                                onClick={() => hub.openItem(lesson.id)}
                                className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                              >
                                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border text-[10px]', done ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' : 'border-white/15 text-white/35')}>
                                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                                </span>
                                <MotifArt item={lesson} className="hidden h-10 w-16 shrink-0 sm:block" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-white/85">{lesson.title}</p>
                                  <p className="text-[10px] text-white/35">{formatClock(lesson.durationSec)} · v{lesson.version}</p>
                                </div>
                                <span className="text-[10px] text-white/35">{record ? `${record.percent}%` : 'Not started'}</span>
                              </button>
                            );
                          })}
                        </div>

                        {course.practicalRequired && (
                          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                            <div className="flex items-center gap-2">
                              {practicalSigned ? <BadgeCheck className="h-4 w-4 text-emerald-300" /> : <Target className="h-4 w-4 text-amber-300" />}
                              <p className="text-xs font-semibold text-white">Practical sign-off</p>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                              {practicalSigned
                                ? `Signed by ${state.practicalSignoffs.find((signoff) => signoff.level === 'competent')?.signedBy}.`
                                : 'Practical competencies are recorded by an instructor after a supervised station.'}
                            </p>
                            {state.practicalSignoffs.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {state.practicalSignoffs.map((signoff) => {
                                  const item = visible.find((candidate) => candidate.id === signoff.contentId);
                                  return (
                                    <p key={signoff.id} className="text-[10px] text-white/35">
                                      {item ? item.title : 'Lesson no longer in scope'} — {signoff.level.replace('_', ' ')} · {signoff.signedBy}
                                    </p>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Assessment</p>
                          {state.assessment ? (
                            <>
                              <p className="mt-2 text-xs text-white/70">{state.assessment.title}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <Pill tone={knowledgePassed ? 'emerald' : 'slate'}>
                                  {knowledgePassed ? 'Passed' : 'Not passed'}
                                </Pill>
                                <Pill tone="slate">{state.assessment.passMark}% pass</Pill>
                                <Pill tone="slate">{assessmentRemaining} attempts left</Pill>
                              </div>
                              {can(hub.persona.role, 'assessment.take') && (
                                <Button
                                  size="sm"
                                  className="mt-3 w-full bg-sky-400 text-slate-950 hover:bg-sky-300"
                                  disabled={assessmentRemaining === 0 && !knowledgePassed}
                                  onClick={() => hub.startAssessment(state.assessment!.id)}
                                >
                                  {knowledgePassed ? 'Retake assessment' : 'Start assessment'}
                                </Button>
                              )}
                            </>
                          ) : (
                            <p className="mt-2 text-[11px] text-white/40">No knowledge check is attached to this course.</p>
                          )}
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Next step</p>
                          <p className="mt-2 text-[11px] leading-relaxed text-white/50">
                            {state.completed
                              ? knowledgePassed
                                ? practicalSigned
                                  ? 'All stages complete. The refresher interval applies from the last completed lesson.'
                                  : 'Course complete. Practical sign-off is still outstanding.'
                                : 'Lessons complete. Take the knowledge check to progress.'
                              : 'Continue with the next incomplete lesson.'}
                          </p>
                          <Button
                            className="mt-3 w-full bg-white/10 text-white hover:bg-white/15"
                            onClick={() => {
                              if (state.nextLesson) hub.openItem(state.nextLesson);
                              else if (state.assessment) hub.startAssessment(state.assessment.id);
                              else hub.notify('This course is complete.', 'success');
                            }}
                          >
                            {state.completed ? <RefreshCw className="mr-1.5 h-4 w-4" /> : <PlayCircle className="mr-1.5 h-4 w-4" />}
                            {state.nextLesson ? (state.completedLessons ? 'Continue course' : 'Start course') : 'Review assessment'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Surface>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-white/35">
        <Circle className="mt-0.5 h-2 w-2 shrink-0 fill-current" />
        Assessment attempts are limited and recorded. Instructor sign-off is required before a competency appears on the
        learner's ladder, even when every lesson and the knowledge check are complete.
      </div>
    </div>
  );
}
