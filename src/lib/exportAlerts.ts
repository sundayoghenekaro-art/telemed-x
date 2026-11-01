import { format } from 'date-fns';
import { VITAL_META } from '@/lib/vitalsThresholds';

interface AlertExportEntry {
  patientName: string;
  profileLabel: string;
  timestamp: string;
  vitalKey: string;
  value: number;
  level: string;
}

function alertsToCsvRows(alerts: AlertExportEntry[]): string[][] {
  const header = ['Patient', 'Profile', 'Severity', 'Vital', 'Value', 'Unit', 'Date', 'Time'];
  const rows = alerts.map(a => {
    const meta = VITAL_META[a.vitalKey];
    const dt = new Date(a.timestamp);
    return [
      a.patientName,
      a.profileLabel,
      a.level.toUpperCase(),
      meta?.label || a.vitalKey,
      String(a.value),
      meta?.unit || '',
      format(dt, 'yyyy-MM-dd'),
      format(dt, 'HH:mm'),
    ];
  });
  return [header, ...rows];
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportCsv(alerts: AlertExportEntry[], filename = 'vitals-alerts') {
  const rows = alertsToCsvRows(alerts);
  const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function buildReportHtml(alerts: AlertExportEntry[]): string {
  const rows = alertsToCsvRows(alerts);
  const [header, ...dataRows] = rows;

  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Vitals Alert Report</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #1a1a1a; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 10px; margin-bottom: 12px; }
  .summary { display: flex; gap: 12px; margin-bottom: 14px; }
  .badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .badge-critical { background: #fee2e2; color: #dc2626; }
  .badge-warning { background: #fef3c7; color: #d97706; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 10px; border-bottom: 2px solid #cbd5e1; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  tr.critical td { background: #fef2f2; }
  tr.warning td { background: #fffbeb; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Abnormal Vitals Report</h1>
<div class="meta">Generated ${format(new Date(), 'PPpp')} · ${alerts.length} alert(s)</div>
<div class="summary">
  ${criticalCount > 0 ? `<span class="badge badge-critical">${criticalCount} Critical</span>` : ''}
  ${warningCount > 0 ? `<span class="badge badge-warning">${warningCount} Warning</span>` : ''}
</div>
<table>
<thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${dataRows.map((r, i) => {
    const level = alerts[i]?.level || '';
    return `<tr class="${level}">${r.map(c => `<td>${c}</td>`).join('')}</tr>`;
  }).join('')}</tbody>
</table>
</body></html>`;
}

export function exportPdf(alerts: AlertExportEntry[], filename = 'vitals-alerts') {
  const html = buildReportHtml(alerts);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
