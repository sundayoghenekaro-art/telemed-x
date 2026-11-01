import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Archive,
  Download,
  FileSignature,
  History,
  Lock,
  ScanLine,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ConsentRecord,
  mockAuditEvents,
  mockConsentRecords,
  mockDicomStudies,
} from '@/data/programmeOpsMockData';
import { cn } from '@/lib/utils';

interface CompliancePanelProps {
  canManage?: boolean;
}

const RETENTION_POLICY = [
  {
    dataClass: 'Clinical records',
    examples: 'Encounters, results, imaging reports',
    retention: '7 years after last visit',
    controls: 'Encrypted at rest · region-locked · access-logged',
  },
  {
    dataClass: 'Billing & claims',
    examples: 'Invoices, payments, payer submissions',
    retention: '7 years',
    controls: 'Encrypted at rest · finance role only',
  },
  {
    dataClass: 'Telemedicine',
    examples: 'Chat transcripts, session recordings',
    retention: 'Recordings 90 days · transcripts 2 years',
    controls: 'Patient consent required · access-logged',
  },
  {
    dataClass: 'Audit & access logs',
    examples: 'Sign-ins, record opens, exports',
    retention: '2 years',
    controls: 'Append-only · tamper-evident',
  },
  {
    dataClass: 'Consent & marketing',
    examples: 'Opt-ins, withdrawals, e-signatures',
    retention: 'Until withdrawn + 1 year',
    controls: 'Signed hash retained for proof',
  },
];

const CONSENT_STYLE: Record<ConsentRecord['status'], string> = {
  active: 'bg-success/10 text-success border-success/30',
  withdrawn: 'bg-muted text-muted-foreground border-border',
  expired: 'bg-warning/10 text-warning border-warning/30',
};

const METHOD_LABEL: Record<ConsentRecord['method'], string> = {
  'e-signature': 'E-signature (CA)',
  otp: 'OTP verification',
  paper: 'Paper scan',
};

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CompliancePanel({ canManage = false }: CompliancePanelProps) {
  const [consents, setConsents] = useState<ConsentRecord[]>(mockConsentRecords);
  const [pendingWithdraw, setPendingWithdraw] = useState<ConsentRecord | null>(null);

  const withdrawConsent = (record: ConsentRecord) => {
    setConsents((prev) =>
      prev.map((entry) => (entry.id === record.id ? { ...entry, status: 'withdrawn' } : entry)),
    );
    setPendingWithdraw(null);
    toast.success('Consent withdrawn', {
      description: `${record.purpose} · ${record.patientName}. Downstream sharing stops immediately.`,
    });
  };

  const exportMetadata = () => {
    downloadJson('dicom-metadata-export.json', {
      exportedAt: new Date().toISOString(),
      source: 'Trika Health PACS',
      studies: mockDicomStudies.map((study) => ({
        studyInstanceUid: study.studyInstanceUid,
        patientName: study.patientName,
        modality: study.modality,
        bodyPart: study.bodyPart,
        acquiredAt: study.acquiredAt,
        seriesCount: study.seriesCount,
        imageCount: study.imageCount,
        reportStatus: study.reportStatus,
      })),
    });
    toast.success('DICOM metadata exported', { description: `${mockDicomStudies.length} studies · dicom-metadata-export.json` });
  };

  const exportConsents = () => {
    downloadJson('consent-register.json', {
      exportedAt: new Date().toISOString(),
      consents,
    });
    toast.success('Consent register exported', { description: 'consent-register.json' });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Compliance &amp; data governance
        </h2>
        <p className="text-sm text-muted-foreground">
          Consent register, e-signature evidence, audit trail, imaging metadata and retention policy
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-4 w-4 text-primary" /> Consent register
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={exportConsents}>
            <Download className="mr-1 h-3 w-3" /> Export
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {consents.map((record) => (
            <div key={record.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{record.patientName}</p>
                  <p className="text-[11px] text-muted-foreground">{record.purpose}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {METHOD_LABEL[record.method]} · signed {format(new Date(record.signedAt), 'dd MMM yyyy HH:mm')} ·{' '}
                    <span className="font-mono">{record.hash}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', CONSENT_STYLE[record.status])}>
                    {record.status}
                  </span>
                  {canManage && record.status === 'active' && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPendingWithdraw(record)}>
                      <Undo2 className="mr-1 h-3 w-3" /> Withdraw
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            E-signatures are CA-issued and hash-stamped at signing. Withdrawal is prospective and does not delete
            records already disclosed under the original consent.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="h-4 w-4 text-primary" /> Imaging metadata (DICOM)
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={exportMetadata}>
              <Download className="mr-1 h-3 w-3" /> Export JSON
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockDicomStudies.map((study) => (
              <div key={study.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {study.modality} {study.bodyPart}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {study.patientName}</span>
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{study.studyInstanceUid}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {study.seriesCount} series · {study.imageCount} images ·{' '}
                      {format(new Date(study.acquiredAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">{study.reportStatus}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" /> Recent audit trail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockAuditEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{event.action}</p>
                <p className="text-[11px] text-muted-foreground">
                  {event.actor} · {event.subject} · {format(new Date(event.occurredAt), 'dd MMM yyyy HH:mm')}
                </p>
                <p className="text-[11px] text-muted-foreground">{event.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Archive className="h-4 w-4 text-primary" /> Data classification &amp; retention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Data class</th>
                  <th className="py-2 pr-3 font-medium">Examples</th>
                  <th className="py-2 pr-3 font-medium">Retention</th>
                  <th className="py-2 font-medium">Controls</th>
                </tr>
              </thead>
              <tbody>
                {RETENTION_POLICY.map((row) => (
                  <tr key={row.dataClass} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{row.dataClass}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.examples}</td>
                    <td className="py-2 pr-3">{row.retention}</td>
                    <td className="py-2 text-muted-foreground">{row.controls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" /> Retention jobs purge eligible records nightly; legal holds suspend deletion.
          </p>
        </CardContent>
      </Card>

      <Dialog open={pendingWithdraw !== null} onOpenChange={(open) => !open && setPendingWithdraw(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw consent</DialogTitle>
            <DialogDescription>
              {pendingWithdraw
                ? `${pendingWithdraw.patientName} · ${pendingWithdraw.purpose}. Downstream sharing stops immediately and the withdrawal is written to the audit trail.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Withdrawal is prospective and cannot be undone here; the signed hash is retained as evidence of the original
            consent.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingWithdraw(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingWithdraw && withdrawConsent(pendingWithdraw)}
            >
              Withdraw consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
