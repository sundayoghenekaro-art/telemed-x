import { describe, expect, it } from 'vitest';
import {
  applyProgressEvent, buildReportRows, can, csvEscape, gradeAttempt,
  isLearnerVisible, isPipelineVisible, makeEmptyLedger, retrieveApproved, toCsv,
  type ProgressEvent,
} from '@/lib/defenceLearning';
import {
  ASSESSMENTS, CONTENT_BY_ID, COURSES, PERSONAS, SEEDED_ATTEMPTS,
  SEEDED_LEDGER, SEEDED_SIGNOFFS, ASSIGNMENTS,
} from '@/data/defenceLearningMockData';

const adeyemi = PERSONAS.find((persona) => persona.id === 'p-adeyemi')!;
const tarfa = PERSONAS.find((persona) => persona.id === 'p-tarfa')!;
const hassan = PERSONAS.find((persona) => persona.id === 'p-hassan')!;
const eze = PERSONAS.find((persona) => persona.id === 'p-eze')!;

describe('learner visibility', () => {
  it('hides unpublished, withdrawn and superseded records', () => {
    expect(isLearnerVisible(adeyemi, CONTENT_BY_ID['c-draft-triage'])).toBe(false);
    expect(isLearnerVisible(adeyemi, CONTENT_BY_ID['c-review-resus'])).toBe(false);
    expect(isLearnerVisible(adeyemi, CONTENT_BY_ID['c-withdrawn-analgesia'])).toBe(false);
    expect(isLearnerVisible(adeyemi, CONTENT_BY_ID['c-old-tourniquet'])).toBe(false);
    expect(isLearnerVisible(adeyemi, CONTENT_BY_ID['c-scheduled-winter'])).toBe(false);
  });

  it('hides published records whose media failed processing', () => {
    const failed = CONTENT_BY_ID['c-failed-evac'];
    expect(failed.status).toBe('published');
    expect(isLearnerVisible(adeyemi, failed)).toBe(false);
  });

  it('enforces unit targeting', () => {
    const defib = CONTENT_BY_ID['c-device-defib'];
    expect(isLearnerVisible(adeyemi, defib)).toBe(true);
    expect(isLearnerVisible(tarfa, defib)).toBe(false);
  });

  it('enforces clearance and training path', () => {
    expect(isLearnerVisible(adeyemi, CONTENT_BY_ID['c-secret-command'])).toBe(false);
    expect(isLearnerVisible(eze, CONTENT_BY_ID['c-secret-command'])).toBe(true);
  });
});

describe('pipeline visibility', () => {
  it('lets a publisher see their own records across the pipeline only', () => {
    expect(isPipelineVisible({ role: 'hq_publisher', personaId: hassan.id }, CONTENT_BY_ID['c-draft-triage'])).toBe(true);
    expect(isPipelineVisible({ role: 'hq_publisher', personaId: hassan.id }, CONTENT_BY_ID['c-review-resus'])).toBe(true);
    expect(isPipelineVisible({ role: 'hq_publisher', personaId: hassan.id }, CONTENT_BY_ID['c-tourniquet'])).toBe(false);
  });

  it('lets a reviewer see submitted work but not another publisher\'s draft', () => {
    expect(isPipelineVisible({ role: 'reviewer', personaId: eze.id }, CONTENT_BY_ID['c-review-resus'])).toBe(true);
    expect(isPipelineVisible({ role: 'reviewer', personaId: eze.id }, CONTENT_BY_ID['c-draft-triage'])).toBe(false);
  });

  it('limits auditors to published, withdrawn and superseded records', () => {
    expect(isPipelineVisible({ role: 'auditor', personaId: 'p-danjuma' }, CONTENT_BY_ID['c-tourniquet'])).toBe(true);
    expect(isPipelineVisible({ role: 'auditor', personaId: 'p-danjuma' }, CONTENT_BY_ID['c-review-resus'])).toBe(false);
  });
});

describe('progress ledger', () => {
  const completed: ProgressEvent = {
    eventId: 'evt-1',
    personaId: adeyemi.id,
    contentId: 'c-tourniquet',
    positionSec: 642,
    durationSec: 642,
    kind: 'completed',
    at: '2026-10-01T10:00:00.000Z',
  };

  it('applies the same event exactly once', () => {
    const once = applyProgressEvent(makeEmptyLedger(), completed);
    const twice = applyProgressEvent(once, completed);
    const record = twice.records[`${adeyemi.id}:c-tourniquet`];

    expect(twice.seenEventIds).toEqual(['evt-1']);
    expect(record.percent).toBe(100);
    expect(record.completedAt).toBe('2026-10-01T10:00:00.000Z');
  });

  it('never clears a completion on a later replay or heartbeat', () => {
    const base = applyProgressEvent(makeEmptyLedger(), completed);
    const replay = applyProgressEvent(base, {
      ...completed,
      eventId: 'evt-2',
      positionSec: 120,
      kind: 'heartbeat',
      at: '2026-10-01T10:05:00.000Z',
    });
    const record = replay.records[`${adeyemi.id}:c-tourniquet`];
    expect(record.completedAt).toBe('2026-10-01T10:00:00.000Z');
    expect(record.maxPositionSec).toBe(642);
    expect(record.percent).toBe(100);
  });

  it('keeps resume position from the latest event while percentage stays monotonic', () => {
    const base = applyProgressEvent(makeEmptyLedger(), {
      ...completed,
      eventId: 'evt-a',
      kind: 'heartbeat',
      positionSec: 300,
    });
    const later = applyProgressEvent(base, {
      ...completed,
      eventId: 'evt-b',
      kind: 'heartbeat',
      positionSec: 120,
      at: '2026-10-01T10:10:00.000Z',
    });
    const record = later.records[`${adeyemi.id}:c-tourniquet`];
    expect(record.positionSec).toBe(120);
    expect(record.maxPositionSec).toBe(300);
    expect(record.percent).toBe(47);
  });
});

describe('grounded retrieval', () => {
  it('only answers from content the persona can open', () => {
    const hits = retrieveApproved(adeyemi, Object.values(CONTENT_BY_ID), 'mass casualty command decision');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((hit) => hit.contentId === 'c-secret-command')).toBe(false);
    expect(hits.some((hit) => hit.contentId === 'c-failed-evac')).toBe(false);
  });

  it('returns nothing for an empty or under-length query', () => {
    expect(retrieveApproved(adeyemi, Object.values(CONTENT_BY_ID), 'a of')).toEqual([]);
    expect(retrieveApproved(adeyemi, Object.values(CONTENT_BY_ID), '')).toEqual([]);
  });

  it('finds tourniquet material for a first responder', () => {
    const hits = retrieveApproved(adeyemi, Object.values(CONTENT_BY_ID), 'tourniquet bleeding');
    expect(hits[0]?.contentId).toBe('c-tourniquet');
    expect(hits[0]?.sectionTitle.length).toBeGreaterThan(0);
  });
});

describe('capabilities', () => {
  it('gates roles against the same matrix as the SQL policies', () => {
    expect(can('learner', 'reports.view_unit')).toBe(false);
    expect(can('learner', 'publish.draft')).toBe(false);
    expect(can('instructor', 'competency.signoff')).toBe(true);
    expect(can('training_officer', 'reports.export')).toBe(true);
    expect(can('hq_publisher', 'publish.publish')).toBe(false);
    expect(can('reviewer', 'publish.publish')).toBe(true);
    expect(can('auditor', 'assessment.take')).toBe(false);
    expect(can('auditor', 'audit.view')).toBe(true);
    expect(can('platform_admin', 'admin.configure')).toBe(true);
  });
});

describe('assessment grading', () => {
  it('grades against the server-held answer key', () => {
    const assessment = ASSESSMENTS[0];
    const answers = Object.fromEntries(assessment.questions.map((question) => [question.id, question.answerId]));
    const result = gradeAttempt(assessment, answers);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.incorrect).toEqual([]);
  });

  it('does not pass a partial attempt below the pass mark', () => {
    const assessment = ASSESSMENTS[0];
    const answers = Object.fromEntries(
      assessment.questions.map((question, index) => [question.id, index < 2 ? 'not-the-answer' : question.answerId]),
    );
    const result = gradeAttempt(assessment, answers);
    expect(result.score).toBeLessThan(assessment.passMark);
    expect(result.passed).toBe(false);
  });
});

describe('csv export', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "no"')).toBe('"say ""no"""');
    expect(csvEscape('line\nbreak')).toBe('"line\nbreak"');
    expect(csvEscape(null)).toBe('');
  });

  it('writes a header row plus one row per record', () => {
    const csv = toCsv(['Name', 'Count'], [['Ada, A.', 2], ['Bello', 0]]);
    expect(csv.split('\n')).toHaveLength(3);
    expect(csv).toContain('"Ada, A."');
  });
});

describe('aggregate reports', () => {
  it('includes course assignments evaluated from lesson completion', () => {
    const rows = buildReportRows(
      {
        personas: PERSONAS,
        assignments: ASSIGNMENTS,
        ledger: SEEDED_LEDGER,
        attempts: SEEDED_ATTEMPTS,
        signoffs: SEEDED_SIGNOFFS,
        items: Object.values(CONTENT_BY_ID),
        courses: COURSES,
      },
      '1 Field Medical Regiment',
    );

    expect(rows.length).toBeGreaterThan(0);
    const adeyemiRow = rows.find((row) => row.personaId === adeyemi.id);
    expect(adeyemiRow).toBeDefined();
    expect(adeyemiRow!.assigned).toBeGreaterThan(0);
    expect(adeyemiRow!.competencies).toBeGreaterThanOrEqual(0);
    expect(rows.every((row) => row.unit === '1 Field Medical Regiment')).toBe(true);
  });
});
