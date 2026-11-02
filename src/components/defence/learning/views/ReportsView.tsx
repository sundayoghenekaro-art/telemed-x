import { useMemo, useState } from 'react';
import {
  AlertTriangle, Award, CalendarClock, CheckCircle2, Download, FileSpreadsheet,
  ShieldCheck, UserPlus, Users,
} from 'lucide-react';
import {
  buildReportRows, can, dueLabel, filterVisible, formatDate, toCsv,
  type Assignment,
} from '@/lib/defenceLearning';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  AccessDenied, ClearancePill, EmptyState, MicroLabel, Pill, StatTile, Surface,
} from '../hubUi';
import type { HubApi } from '../hubApi';

const REPORT_HEADERS = [
  'Service person', 'Unit', 'Path', 'Assigned', 'Started', 'Completed', 'Overdue',
  'Acknowledged', 'Assessments passed', 'Competencies', 'Refreshers due',
];

export function ReportsView({ hub }: { hub: HubApi }) {
  const { persona } = hub;
  const canUnit = can(persona.role, 'reports.view_unit');
  const canNetwork = can(persona.role, 'reports.view_network');
  const canExport = can(persona.role, 'reports.export');
  const canAssign = can(persona.role, 'assignment.manage');

  const units = useMemo(() => Array.from(new Set(hub.personas.map((member) => member.unit))), [hub.personas]);
  const [scope, setScope] = useState<string>(canNetwork ? 'all' : persona.unit);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [form, setForm] = useState({
    targetKind: 'unit' as 'unit' | 'persona',
    targetId: persona.unit,
    mode: 'content' as 'content' | 'course',
    contentId: '',
    courseId: '',
    dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
    requireAcknowledgement: false,
  });

  if (!canUnit && !canNetwork) {
    return <AccessDenied capability="reports.view_unit" role={persona.role} />;
  }

  const unitScope = canNetwork ? (scope === 'all' ? null : scope) : persona.unit;
  const rows = buildReportRows(
    {
      personas: hub.personas,
      assignments: hub.assignments,
      ledger: hub.ledger,
      attempts: hub.attempts,
      signoffs: hub.signoffs,
      items: hub.items,
      courses: hub.courses,
    },
    unitScope,
  );

  const totals = rows.reduce(
    (accumulator, row) => ({
      assigned: accumulator.assigned + row.assigned,
      completed: accumulator.completed + row.completed,
      overdue: accumulator.overdue + row.overdue,
      competencies: accumulator.competencies + row.competencies,
    }),
    { assigned: 0, completed: 0, overdue: 0, competencies: 0 },
  );
  const completionRate = totals.assigned ? Math.round((totals.completed / totals.assigned) * 100) : 0;

  const exportCsv = () => {
    if (!canExport) return;
    const csv = toCsv(
      REPORT_HEADERS,
      rows.map((row) => [
        row.name, row.unit, row.path, row.assigned, row.started, row.completed, row.overdue,
        row.acknowledged, row.assessmentsPassed, row.competencies, row.refreshersDue,
      ]),
    );
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `defence-learning-report-${unitScope ?? 'network'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    hub.addAudit(
      `${persona.rank} ${persona.name}`,
      'exported report',
      `Training report — ${unitScope ?? 'Network'}`,
      `rows=${rows.length}; scope=${unitScope ?? 'network'}`,
    );
    hub.notify('Report exported. The export is recorded in the audit trail.', 'success');
  };

  const createAssignment = () => {
    const content = filterVisible(persona, hub.items).find((item) => item.id === form.contentId);
    const course = hub.courses.find((candidate) => candidate.id === form.courseId);
    const title = form.mode === 'content' ? content?.title : course?.title;
    if (!title) {
      hub.notify('Select content or a course to assign.', 'error');
      return;
    }
    const assignment: Assignment = {
      id: `as-${Date.now()}`,
      targetKind: form.targetKind,
      targetId: form.targetId,
      contentId: form.mode === 'content' ? content?.id : undefined,
      courseId: form.mode === 'course' ? course?.id : undefined,
      title,
      assignedBy: `${persona.rank} ${persona.name}`,
      assignedAt: new Date().toISOString(),
      dueAt: new Date(`${form.dueAt}T17:00:00`).toISOString(),
      requireAcknowledgement: form.requireAcknowledgement,
      assessmentId: course?.assessmentId ?? undefined,
      remindersDays: [7, 3, 1],
      status: 'active',
    };
    hub.addAssignment(assignment);
    hub.addAudit(`${persona.rank} ${persona.name}`, 'created assignment', title, `target=${form.targetKind}:${form.targetId}; due=${form.dueAt}`);
    hub.notify(`Assigned “${title}” to ${form.targetId}.`, 'success');
    setBuilderOpen(false);
    setForm({ ...form, contentId: '', courseId: '' });
  };

  const inputClass = 'mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#0b1119] px-2 text-xs text-white outline-none focus:border-sky-400/40';

  return (
    <div className="space-y-6">
      <Surface className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill tone="sky">Assignments & reports</Pill>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Unit training oversight</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/50">
              Aggregated completion, acknowledgements and competency counts. Reports never include clinical fields, free
              text or individual rankings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canNetwork ? (
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50">
                Scope
                <select value={scope} onChange={(event) => setScope(event.target.value)} className="bg-transparent text-xs text-white outline-none">
                  <option value="all" className="bg-slate-900">All units (network)</option>
                  {units.map((unit) => <option key={unit} value={unit} className="bg-slate-900">{unit}</option>)}
                </select>
              </label>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/50">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Scope locked to {persona.unit}
              </div>
            )}
            <Button className="bg-sky-400 text-slate-950 hover:bg-sky-300" disabled={!canExport} onClick={exportCsv}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
            {canAssign && (
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setBuilderOpen((current) => !current)}>
                <UserPlus className="mr-1.5 h-4 w-4" /> New assignment
              </Button>
            )}
          </div>
        </div>
        <p className="mt-4 text-[10px] text-white/30">
          Generated {formatDate(new Date().toISOString())} · {rows.length} service persons · {canExport ? 'CSV export enabled' : 'export requires reports.export'}
        </p>
      </Surface>

      {builderOpen && canAssign && (
        <Surface className="border-sky-400/25 bg-sky-400/[0.04] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Create an assignment</h3>
              <p className="mt-0.5 text-xs text-white/40">Assign by service person or whole unit. Reminders are queued at 7, 3 and 1 day.</p>
            </div>
            <Pill tone="sky">Assignment builder</Pill>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-[10px] uppercase tracking-[0.12em] text-white/35">
              Target type
              <select className={inputClass} value={form.targetKind} onChange={(event) => {
                const targetKind = event.target.value as 'unit' | 'persona';
                setForm({ ...form, targetKind, targetId: targetKind === 'unit' ? persona.unit : persona.id });
              }}>
                <option value="unit">Unit</option>
                <option value="persona">Service person</option>
              </select>
            </label>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-white/35">
              Target
              <select className={inputClass} value={form.targetId} onChange={(event) => setForm({ ...form, targetId: event.target.value })}>
                {form.targetKind === 'unit'
                  ? units.map((unit) => <option key={unit} value={unit}>{unit}</option>)
                  : hub.personas.map((member) => <option key={member.id} value={member.id}>{member.rank} {member.name} — {member.unit}</option>)}
              </select>
            </label>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-white/35">
              Assign
              <select className={inputClass} value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as 'content' | 'course' })}>
                <option value="content">A lesson or briefing</option>
                <option value="course">A course</option>
              </select>
            </label>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-white/35">
              Due date
              <input type="date" className={inputClass} value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} />
            </label>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-white/35 sm:col-span-2">
              {form.mode === 'content' ? 'Lesson' : 'Course'}
              <select
                className={inputClass}
                value={form.mode === 'content' ? form.contentId : form.courseId}
                onChange={(event) => setForm(form.mode === 'content' ? { ...form, contentId: event.target.value } : { ...form, courseId: event.target.value })}
              >
                <option value="">Select…</option>
                {form.mode === 'content'
                  ? filterVisible(persona, hub.items).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)
                  : hub.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </label>
            <label className="flex items-end justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/35">
              Acknowledgement
              <Switch checked={form.requireAcknowledgement} onCheckedChange={(value) => setForm({ ...form, requireAcknowledgement: value })} />
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
              <Button size="sm" className="w-full bg-sky-400 text-slate-950 hover:bg-sky-300" onClick={createAssignment}>
                Create assignment
              </Button>
            </div>
          </div>
        </Surface>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Service persons" value={rows.length} detail={unitScope ?? 'Network-wide'} tone="sky" icon={Users} />
        <StatTile label="Completion" value={`${completionRate}%`} detail={`${totals.completed} of ${totals.assigned} assignments`} tone="emerald" icon={CheckCircle2} />
        <StatTile label="Overdue" value={totals.overdue} detail="Open past their due date" tone={totals.overdue ? 'rose' : 'slate'} icon={AlertTriangle} />
        <StatTile label="Competencies" value={totals.competencies} detail="Signed practical competencies" tone="violet" icon={Award} />
      </div>

      <Surface className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Completion by service person</h3>
            <p className="mt-0.5 text-xs text-white/40">Aggregated counts only — no clinical data, no ranking</p>
          </div>
          <Pill tone="slate">{unitScope ?? 'All units'}</Pill>
        </div>
        {rows.length === 0 ? (
          <div className="p-5"><EmptyState icon={FileSpreadsheet} title="No data in scope" description="No service persons match the selected scope." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/35">
                  {REPORT_HEADERS.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => (
                  <tr key={row.personaId} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white/85">{row.name}</p>
                        <ClearancePill clearance={hub.personas.find((member) => member.id === row.personaId)?.clearance ?? 'restricted'} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/45">{row.unit}</td>
                    <td className="px-4 py-3 capitalize text-white/45">{row.path.replace('_', ' ')}</td>
                    <td className="px-4 py-3 tabular-nums text-white/60">{row.assigned}</td>
                    <td className="px-4 py-3 tabular-nums text-white/60">{row.started}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-300">{row.completed}</td>
                    <td className={cn('px-4 py-3 tabular-nums', row.overdue ? 'text-rose-300' : 'text-white/35')}>{row.overdue}</td>
                    <td className="px-4 py-3 tabular-nums text-white/60">{row.acknowledged}</td>
                    <td className="px-4 py-3 tabular-nums text-white/60">{row.assessmentsPassed}</td>
                    <td className="px-4 py-3 tabular-nums text-violet-300">{row.competencies}</td>
                    <td className="px-4 py-3 tabular-nums text-amber-300">{row.refreshersDue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
          <p className="text-[10px] text-white/30">
            Unit-scoped staff see only their own unit. Network scope requires reports.view_network.
          </p>
          <p className="text-[10px] text-white/30">{canExport ? 'Every export writes an audit event.' : 'Export unavailable for this role.'}</p>
        </div>
      </Surface>

      <Surface className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Active assignments</h3>
            <p className="mt-0.5 text-xs text-white/40">{hub.assignments.length} records across {units.length} units</p>
          </div>
          <Pill tone="slate">Reminders 7 / 3 / 1 day</Pill>
        </div>
        <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
          {hub.assignments.map((assignment) => {
            const due = dueLabel(assignment.dueAt);
            return (
              <div key={assignment.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <CalendarClock className={cn('h-4 w-4 shrink-0', due.tone === 'overdue' ? 'text-rose-300' : due.tone === 'soon' ? 'text-amber-300' : 'text-white/30')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white/85">{assignment.title}</p>
                  <p className="text-[10px] text-white/35">
                    {assignment.targetKind === 'unit' ? 'Unit' : 'Person'} · {assignment.targetId} · by {assignment.assignedBy}
                  </p>
                </div>
                <Pill tone={due.tone === 'overdue' ? 'rose' : due.tone === 'soon' ? 'amber' : 'slate'}>{due.text}</Pill>
              </div>
            );
          })}
        </div>
      </Surface>

      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[10px] leading-relaxed text-white/35">
        <MicroLabel className="shrink-0">Privacy</MicroLabel>
        Reports expose aggregate training state only. There are no free-text notes, no clinical observations and no
        performance ranking. Export permissions, scope and row counts are written to the audit trail.
      </div>
    </div>
  );
}
