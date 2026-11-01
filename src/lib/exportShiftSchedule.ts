import { format, addDays, startOfWeek, differenceInDays } from 'date-fns';
import type { ShiftEntry, ShiftType } from '@/components/inpatient/ShiftSchedulePanel';

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: '☀ Morning',
  afternoon: '🌅 Afternoon',
  night: '🌙 Night',
  off: '— Off',
};

const SHIFT_COLORS: Record<ShiftType, { bg: string; text: string }> = {
  morning:   { bg: '#fef3c7', text: '#92400e' },
  afternoon: { bg: '#dbeafe', text: '#1e40af' },
  night:     { bg: '#e0e7ff', text: '#3730a3' },
  off:       { bg: '#f3f4f6', text: '#6b7280' },
};

export function exportShiftPdf(
  schedule: ShiftEntry[],
  nurses: string[],
  wardLabel: string,
  startDate: Date,
  endDate: Date,
) {
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(startDate, i));
  const dateRange = `${format(days[0], 'MMM d')} – ${format(days[days.length - 1], 'MMM d, yyyy')}`;

  const getShift = (nurse: string, day: Date): ShiftType => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return schedule.find(e => e.nurse === nurse && e.date === dateStr)?.shift ?? 'off';
  };

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Shift Schedule – ${dateRange}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
  h1 { font-size: 16px; margin-bottom: 2px; }
  .meta { color: #666; font-size: 10px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; text-align: center; padding: 6px 4px; font-size: 10px; border: 1px solid #cbd5e1; }
  th:first-child { text-align: left; width: 140px; }
  td { padding: 4px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px; }
  td:first-child { text-align: left; font-weight: 600; }
  .chip { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 9px; }
  .summary { margin-top: 16px; font-size: 10px; color: #666; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Weekly Shift Schedule</h1>
<div class="meta">${wardLabel} · ${dateRange} · Generated ${format(new Date(), 'PPpp')}</div>
<table>
<thead><tr>
  <th>Nurse</th>
  ${days.map(d => `<th>${format(d, 'EEE')}<br/>${format(d, 'MMM d')}</th>`).join('')}
</tr></thead>
<tbody>
${nurses.map(nurse => {
  const cells = days.map(d => {
    const s = getShift(nurse, d);
    const c = SHIFT_COLORS[s];
    return `<td><span class="chip" style="background:${c.bg};color:${c.text}">${SHIFT_LABELS[s]}</span></td>`;
  }).join('');
  return `<tr><td>${nurse}</td>${cells}</tr>`;
}).join('\n')}
</tbody>
</table>
<div class="summary">${nurses.length} nurse(s) · 7 days</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}
