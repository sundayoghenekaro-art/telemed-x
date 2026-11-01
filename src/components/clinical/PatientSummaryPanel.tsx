import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  Download,
  FileJson,
  FilePlus2,
  Send,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PatientSummary,
  TransferDocument,
  mockPatientSummaries,
  mockTransferDocuments,
} from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const DOC_STATUS_STYLE: Record<TransferDocument['status'], string> = {
  draft: 'bg-warning/10 text-warning border-warning/30',
  final: 'bg-success/10 text-success border-success/30',
};

const DOC_TYPE_LABEL: Record<TransferDocument['type'], string> = {
  ips: 'International Patient Summary',
  discharge: 'Discharge summary',
  referral: 'Referral letter',
};

function buildComposition(summary: PatientSummary) {
  return {
    resourceType: 'Composition',
    id: summary.id,
    status: 'final',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '60591-5',
          display: 'Patient summary Document',
        },
      ],
    },
    subject: { reference: `Patient/${summary.upid}`, display: summary.patientName },
    date: summary.generatedAt,
    author: [{ display: 'Trika General Hospital' }],
    title: `International Patient Summary — ${summary.patientName}`,
    section: summary.sections.map((section) => ({
      title: section.title,
      text: {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${section.items.join('; ')}</div>`,
      },
    })),
  };
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/fhir+json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PatientSummaryPanel({ canSend = false }: { canSend?: boolean }) {
  const [selectedId, setSelectedId] = useState(mockPatientSummaries[0].id);
  const [documents, setDocuments] = useState<TransferDocument[]>(mockTransferDocuments);
  const [sentAt, setSentAt] = useState<Record<string, string>>({});

  const summary =
    mockPatientSummaries.find((entry) => entry.id === selectedId) ?? mockPatientSummaries[0];

  const docCounts = useMemo(
    () => ({
      final: documents.filter((doc) => doc.status === 'final').length,
      draft: documents.filter((doc) => doc.status === 'draft').length,
    }),
    [documents],
  );

  const exportIps = () => {
    downloadJson(`${summary.id}-${summary.upid}.json`, buildComposition(summary));
    toast.success('FHIR Composition exported', {
      description: `${summary.patientName} · ${summary.sections.length} sections · application/fhir+json`,
    });
  };

  const sendToNcpeh = () => {
    setSentAt((prev) => ({ ...prev, [summary.id]: new Date().toISOString() }));
    toast.success('Sent to NCPeH', {
      description: `${summary.patientName} · myHealth@EU gateway accepted ${summary.id}. Cross-border retrieval is now available.`,
    });
  };

  const createDocument = () => {
    const nextId = `DOC-2026-${String(143 + documents.length).padStart(4, '0')}`;
    const doc: TransferDocument = {
      id: nextId,
      type: 'discharge',
      patientName: summary.patientName,
      facility: 'Trika General Hospital',
      createdAt: new Date().toISOString(),
      status: 'draft',
      sections: summary.sections.length,
    };
    setDocuments((prev) => [doc, ...prev]);
    toast.success('Draft discharge summary created', {
      description: `${nextId} · ${summary.patientName}. Review and finalise before sending.`,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileJson className="h-5 w-5 text-primary" />
          Patient summary &amp; transfer documents
        </h2>
        <p className="text-sm text-muted-foreground">
          Patient summaries use the HL7 FHIR International Patient Summary and the EU cross-border gateway
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{mockPatientSummaries.length}</p>
            <p className="text-xs text-muted-foreground">Summaries available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{docCounts.final}</p>
            <p className="text-xs text-muted-foreground">Final documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-warning">{docCounts.draft}</p>
            <p className="text-xs text-muted-foreground">Drafts in review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{Object.keys(sentAt).length}</p>
            <p className="text-xs text-muted-foreground">Sent to NCPeH this session</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" /> {summary.patientName}
            </span>
            <div className="flex items-center gap-2">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="h-8 w-[220px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockPatientSummaries.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.patientName} · {entry.upid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="font-mono text-[10px]">{summary.id}</Badge>
            <span>UPID {summary.upid}</span>
            <span>Born {summary.dateOfBirth}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Generated {format(new Date(summary.generatedAt), 'dd MMM yyyy HH:mm')}
            </span>
            {sentAt[summary.id] && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <CheckCircle2 className="h-3 w-3" /> sent to NCPeH
              </Badge>
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {summary.sections.map((section) => (
              <div key={section.title} className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={exportIps}>
              <Download className="h-4 w-4" /> Export FHIR Composition
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!canSend}
              onClick={sendToNcpeh}
            >
              <Send className="h-4 w-4" /> Send to NCPeH
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={!canSend} onClick={createDocument}>
              <FilePlus2 className="h-4 w-4" /> Create discharge summary
            </Button>
            {!canSend && (
              <p className="self-center text-[11px] text-muted-foreground">
                Sending and document creation require referral management rights.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transfer documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold">
                  {DOC_TYPE_LABEL[doc.type]}
                  <span className="ml-1.5 font-normal text-muted-foreground">· {doc.patientName}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {doc.id} · {doc.facility} · {doc.sections} sections ·{' '}
                  {format(new Date(doc.createdAt), 'dd MMM yyyy HH:mm')}
                </p>
              </div>
              <span className={cn('w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', DOC_STATUS_STYLE[doc.status])}>
                {doc.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
