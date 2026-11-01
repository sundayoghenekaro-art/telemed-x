import { format, differenceInDays } from 'date-fns';
import { generateMockTimeline, TimelineEvent } from '@/components/inpatient/PatientTimeline';
import { Bed } from '@/data/inpatientMockData';

const typeLabels: Record<TimelineEvent['type'], { label: string; color: string; bg: string }> = {
  admission: { label: 'Admission', color: '#16a34a', bg: '#f0fdf4' },
  transfer: { label: 'Transfer', color: '#0284c7', bg: '#f0f9ff' },
  vitals: { label: 'Vitals', color: '#7c3aed', bg: '#f5f3ff' },
  medication: { label: 'Medication', color: '#d97706', bg: '#fffbeb' },
  note: { label: 'Clinical Note', color: '#6b7280', bg: '#f9fafb' },
  procedure: { label: 'Procedure', color: '#0891b2', bg: '#ecfeff' },
  alert: { label: 'Alert', color: '#dc2626', bg: '#fef2f2' },
};

export function generateDischargeSummaryHtml(bed: Bed): string {
  const events = generateMockTimeline(bed);
  // Sort ascending for the report
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const admitDate = bed.admissionDate ? new Date(bed.admissionDate) : null;
  const now = new Date();
  const los = admitDate ? differenceInDays(now, admitDate) : 0;

  // Group events by date
  const grouped = new Map<string, TimelineEvent[]>();
  for (const evt of sorted) {
    const key = format(evt.timestamp, 'yyyy-MM-dd');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(evt);
  }

  const eventRows = Array.from(grouped.entries()).map(([dateKey, dayEvents]) => {
    const dateLabel = format(new Date(dateKey), 'EEEE, MMMM d, yyyy');
    const rows = dayEvents.map(evt => {
      const cfg = typeLabels[evt.type];
      return `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;white-space:nowrap;">${format(evt.timestamp, 'h:mm a')}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">
            <span style="display:inline-block;padding:1px 8px;border-radius:4px;font-size:10px;font-weight:600;color:${cfg.color};background:${cfg.bg};">${cfg.label}</span>
          </td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:500;">${evt.title}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#6b7280;">${evt.description || '—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#6b7280;">${evt.actor || '—'}</td>
        </tr>`;
    }).join('');

    return `
      <tr><td colspan="5" style="padding:10px 10px 4px;font-weight:700;font-size:12px;background:#f8fafc;border-bottom:2px solid #cbd5e1;">${dateLabel}</td></tr>
      ${rows}`;
  }).join('');

  const acuityColors: Record<string, string> = {
    critical: '#dc2626',
    high: '#d97706',
    medium: '#0284c7',
    low: '#16a34a',
  };

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Discharge Summary — ${bed.patientName || 'Patient'}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; padding: 24px 32px; color: #1a1a1a; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .subtitle { font-size: 11px; color: #6b7280; margin-bottom: 16px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 18px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
  .info-grid dt { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-grid dd { font-size: 12px; font-weight: 500; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; padding: 6px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #cbd5e1; }
  @media print { body { padding: 12px; } .no-print { display: none; } }
</style></head><body>
<h1>Discharge Summary Report</h1>
<div class="subtitle">Generated ${format(now, 'PPpp')}</div>

<dl class="info-grid">
  <dt>Patient</dt><dd>${bed.patientName || 'Unknown'}</dd>
  <dt>Ward / Bed</dt><dd>${bed.wardName} — Bed ${bed.bedNumber}</dd>
  <dt>Attending Physician</dt><dd>${bed.physician || '—'}</dd>
  <dt>Acuity</dt><dd style="color:${acuityColors[bed.acuity || ''] || '#1a1a1a'};font-weight:600;">${(bed.acuity || '—').toUpperCase()}</dd>
  <dt>Admission Date</dt><dd>${admitDate ? format(admitDate, 'PPP') : '—'}</dd>
  <dt>Length of Stay</dt><dd>${los} day${los !== 1 ? 's' : ''}</dd>
</dl>

<h2 style="font-size:14px;margin-bottom:4px;">Clinical Timeline</h2>
<table>
  <thead><tr>
    <th>Time</th><th>Type</th><th>Event</th><th>Details</th><th>By</th>
  </tr></thead>
  <tbody>${eventRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#9ca3af;">No events recorded</td></tr>'}</tbody>
</table>

<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#9ca3af;">
  This report was generated automatically. Please verify all information with the patient's medical records.
</div>
</body></html>`;
}

export function openDischargeSummary(bed: Bed) {
  const html = generateDischargeSummaryHtml(bed);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
