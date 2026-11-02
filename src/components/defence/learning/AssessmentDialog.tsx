import { useEffect, useState } from 'react';
import type { Assessment, Attempt, Persona } from '@/lib/defenceLearning';
import { attemptsRemaining, formatDate, gradeAttempt } from '@/lib/defenceLearning';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, CircleAlert, Lock, RotateCcw, Trophy } from 'lucide-react';
import { Meter, Pill, Surface } from './hubUi';

interface GradeResult {
  score: number;
  passed: boolean;
  correct: string[];
  incorrect: string[];
}

export function AssessmentDialog({
  open,
  assessment,
  persona,
  attempts,
  onClose,
  onComplete,
}: {
  open: boolean;
  assessment: Assessment | null;
  persona: Persona;
  attempts: Attempt[];
  onClose: () => void;
  onComplete: (attempt: Attempt) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submitted, setSubmitted] = useState<Attempt | null>(null);

  useEffect(() => {
    if (open) {
      setAnswers({});
      setResult(null);
      setSubmitted(null);
    }
  }, [open, assessment?.id]);

  if (!assessment) return null;

  const remaining = attemptsRemaining(assessment, attempts);
  const locked = remaining === 0 && !result;
  const complete = assessment.questions.every((question) => Boolean(answers[question.id]));

  const submit = () => {
    const graded = gradeAttempt(assessment, answers);
    const attempt: Attempt = {
      id: `at-${Date.now()}`,
      assessmentId: assessment.id,
      personaId: persona.id,
      score: graded.score,
      passed: graded.passed,
      completedAt: new Date().toISOString(),
      answers,
    };
    setResult(graded);
    setSubmitted(attempt);
    onComplete(attempt);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0b1119] text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-5 w-5 text-sky-400" /> {assessment.title}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {assessment.questions.length} questions · pass mark {assessment.passMark}% · {remaining} of {assessment.maxAttempts} attempts remaining
          </DialogDescription>
        </DialogHeader>

        {locked && (
          <Surface className="border-rose-400/25 bg-rose-400/[0.07] p-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 text-rose-300" />
              <div>
                <p className="text-sm font-semibold text-white">Attempts exhausted</p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  You have used all {assessment.maxAttempts} attempts. Contact your instructor to request a supervised
                  retake. The record stays visible to your unit training officer.
                </p>
              </div>
            </div>
          </Surface>
        )}

        {!locked && !result && (
          <div className="space-y-4">
            {assessment.questions.map((question, index) => (
              <Surface key={question.id} className="p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-white/60">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-white">{question.prompt}</p>
                </div>
                <div className="space-y-1.5 pl-9">
                  {question.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                        answers[question.id] === option.id
                          ? 'border-sky-400/50 bg-sky-400/10 text-white'
                          : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white/85',
                      )}
                    >
                      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', answers[question.id] === option.id ? 'border-sky-300 bg-sky-400' : 'border-white/25')}>
                        {answers[question.id] === option.id && <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />}
                      </span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </Surface>
            ))}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <Surface className={cn('p-5', result.passed ? 'border-emerald-400/30 bg-emerald-400/[0.08]' : 'border-rose-400/30 bg-rose-400/[0.08]')}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/40">Result</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{result.score}%</p>
                  <p className={cn('mt-1 text-sm', result.passed ? 'text-emerald-300' : 'text-rose-300')}>
                    {result.passed ? 'Passed — knowledge stage complete' : `Not passed — ${assessment.passMark}% required`}
                  </p>
                </div>
                <div className="text-right text-xs text-white/45">
                  <p>{result.correct.length} correct</p>
                  <p>{result.incorrect.length} incorrect</p>
                  {submitted && <p className="mt-1">{formatDate(submitted.completedAt)}</p>}
                </div>
              </div>
              <Meter className="mt-4" value={result.score} tone={result.passed ? 'emerald' : 'rose'} />
            </Surface>

            <div className="space-y-3">
              {assessment.questions.map((question) => {
                const wasCorrect = result.correct.includes(question.id);
                return (
                  <Surface key={question.id} className="p-4">
                    <div className="flex items-start gap-2">
                      {wasCorrect ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                      )}
                      <div>
                        <p className="text-xs font-medium text-white/85">{question.prompt}</p>
                        <p className="mt-1 text-[11px] text-white/50">
                          Correct answer: {question.options.find((option) => option.id === question.answerId)?.label}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/40">{question.rationale}</p>
                      </div>
                    </div>
                  </Surface>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!result && !locked && (
            <>
              <Button variant="ghost" className="text-white/60 hover:bg-white/10 hover:text-white" onClick={onClose}>
                Cancel
              </Button>
              <Button className="bg-sky-400 text-slate-950 hover:bg-sky-300" disabled={!complete} onClick={submit}>
                Submit answers
              </Button>
            </>
          )}
          {locked && (
            <Button variant="ghost" className="text-white/60 hover:bg-white/10 hover:text-white" onClick={onClose}>
              Close
            </Button>
          )}
          {result && (
            <>
              <Pill tone={result.passed ? 'emerald' : 'rose'}>{result.passed ? 'Knowledge stage passed' : 'Attempt recorded'}</Pill>
              {!result.passed && remaining > 0 && (
                <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => { setAnswers({}); setResult(null); setSubmitted(null); }}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Retake
                </Button>
              )}
              <Button className="bg-white text-slate-950 hover:bg-white/90" onClick={onClose}>
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
