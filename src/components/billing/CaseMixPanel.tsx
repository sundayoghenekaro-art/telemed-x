import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Banknote,
  Boxes,
  Download,
  FileCheck2,
  Layers,
  Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InpatientCase, mockInpatientCases } from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const STATUS_STYLE: Record<InpatientCase['status'], string> = {
  coded: 'bg-muted text-muted-foreground border-border',
  grouped: 'bg-info/10 text-info border-info/30',
  claimed: 'bg-success/10 text-success border-success/30',
};

const STATUS_LABEL: Record<InpatientCase['status'], string> = {
  coded: 'Coded',
  grouped: 'Grouped',
  claimed: 'Claimed',
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

export function CaseMixPanel({
  canManage = false,
  canSettleInsurance = false,
}: {
  canManage?: boolean;
  canSettleInsurance?: boolean;
}) {
  const [cases, setCases] = useState<InpatientCase[]>(mockInpatientCases);
  const [claimSubmittedAt, setClaimSubmittedAt] = useState<string | null>(null);

  const totals = useMemo(() => {
    const grouped = cases.filter((entry) => entry.status === 'grouped');
    const claimed = cases.filter((entry) => entry.status === 'claimed');
    const coded = cases.filter((entry) => entry.status === 'coded');
    const value = (entry: InpatientCase) => entry.weight * entry.baseRate;
    return {
      coded: coded.length,
      grouped: grouped.length,
      claimed: claimed.length,
      claimValue: claimed.reduce((sum, entry) => sum + value(entry), 0),
      pendingValue: grouped.reduce((sum, entry) => sum + value(entry), 0),
      caseMixIndex: cases.length === 0 ? 0 : cases.reduce((sum, entry) => sum + entry.weight, 0) / cases.length,
    };
  }, [cases]);

  const group = (entry: InpatientCase) => {
    setCases((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'grouped' } : item)),
    );
    toast.success('Case grouped', {
      description: `${entry.id} → ${entry.drg} · weight ${entry.weight.toFixed(3)} · ${naira.format(entry.weight * entry.baseRate)}`,
    });
  };

  const claim = (entry: InpatientCase) => {
    setCases((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'claimed' } : item)),
    );
    toast.success('Case added to the claim file', {
      description: `${entry.id} · ${entry.insurer} · ${naira.format(entry.weight * entry.baseRate)}`,
    });
  };

  const claimFile = {
    fileId: 'DRG-2026-11',
    period: '2026-10',
    baseRate: 3980,
    cases: cases
      .filter((entry) => entry.status === 'claimed')
      .map((entry) => ({
        caseId: entry.id,
        patient: entry.patientName,
        icd: entry.icdCode,
        ops: entry.opsCode,
        drg: entry.drg,
        weight: entry.weight,
        tariff: Math.round(entry.weight * entry.baseRate),
        insurer: entry.insurer,
      })),
  };

  const exportClaim = () => {
    downloadJson('drg-claim-2026-11.json', claimFile);
    toast.success('Claim file exported', {
      description: `${claimFile.cases.length} cases · ${naira.format(totals.claimValue)} · DRG-2026-11`,
    });
  };

  const submitClaim = () => {
    setClaimSubmittedAt(new Date().toISOString());
    toast.success('Claim file submitted to insurers', {
      description: `DRG-2026-11 · ${claimFile.cases.length} cases · ${naira.format(totals.claimValue)}`,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Layers className="h-5 w-5 text-primary" />
          DRG case-mix &amp; claims
        </h2>
        <p className="text-sm text-muted-foreground">
          ICD-10 and OPS coding, DRG grouping with case weights and the monthly insurer claim file
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{totals.coded}</p>
            <p className="text-xs text-muted-foreground">Coded, not grouped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-info">{totals.grouped}</p>
            <p className="text-xs text-muted-foreground">Grouped, unfiled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-success">{totals.claimed}</p>
            <p className="text-xs text-muted-foreground">In the claim file</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{naira.format(totals.claimValue)}</p>
            <p className="text-xs text-muted-foreground">Claim value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{totals.caseMixIndex.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Average case weight</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inpatient cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cases.map((entry) => {
            const tariff = entry.weight * entry.baseRate;
            return (
              <div key={entry.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {entry.patientName}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {entry.id}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      ICD-10 <span className="font-mono">{entry.icdCode}</span> {entry.primaryDiagnosis} · OPS{' '}
                      <span className="font-mono">{entry.opsCode}</span> {entry.procedure}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {entry.admitted} → {entry.discharged ?? 'open'} · {entry.insurer}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="font-mono text-[10px]">{entry.drg}</Badge>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', STATUS_STYLE[entry.status])}>
                      {STATUS_LABEL[entry.status]}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    {entry.drgLabel} · weight {entry.weight.toFixed(3)} × base rate {naira.format(entry.baseRate)} ={' '}
                    <span className="font-semibold text-foreground">{naira.format(tariff)}</span>
                  </p>
                  <div className="flex gap-1.5">
                    {entry.status === 'coded' && (
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={!canManage}
                        onClick={() => group(entry)}
                      >
                        <Boxes className="h-3 w-3" /> Group to DRG
                      </Button>
                    )}
                    {entry.status === 'grouped' && (
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={!canManage}
                        onClick={() => claim(entry)}
                      >
                        <Banknote className="h-3 w-3" /> Add to claim
                      </Button>
                    )}
                    {entry.status === 'claimed' && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-success">
                        <FileCheck2 className="h-3 w-3" /> ready for the claim file
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span>Monthly claim file · DRG-2026-11</span>
            {claimSubmittedAt && (
              <Badge variant="secondary" className="text-[10px]">
                submitted {new Date(claimSubmittedAt).toLocaleTimeString()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Cases included</p>
              <p className="text-lg font-bold">{claimFile.cases.length}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Claim value</p>
              <p className="text-lg font-bold">{naira.format(totals.claimValue)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Grouped, not filed</p>
              <p className="text-lg font-bold text-warning">{naira.format(totals.pendingValue)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={exportClaim}>
              <Download className="h-4 w-4" /> Download claim file
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!canSettleInsurance || claimFile.cases.length === 0}
              onClick={submitClaim}
            >
              <Send className="h-4 w-4" /> Submit to insurers
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Claim file contains diagnosis and procedure codes, DRG weight and tariff per case. Insurers receive it through the settlement workflow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
