import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Ban,
  CheckCircle2,
  FileText,
  Pill,
  Repeat2,
  Send,
  Store,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eprescription, mockEprescriptions } from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<Eprescription['status'], string> = {
  issued: 'bg-muted text-muted-foreground border-border',
  submitted: 'bg-info/10 text-info border-info/30',
  dispensed: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
};

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export function EPrescriptionPanel({
  canPrescribe = false,
  canDispense = false,
}: {
  canPrescribe?: boolean;
  canDispense?: boolean;
}) {
  const [prescriptions, setPrescriptions] = useState<Eprescription[]>(mockEprescriptions);

  const stats = useMemo(() => {
    const issued = prescriptions.filter((rx) => rx.status === 'issued').length;
    const submitted = prescriptions.filter((rx) => rx.status === 'submitted').length;
    const dispensed = prescriptions.filter((rx) => rx.status === 'dispensed').length;
    const savings = prescriptions
      .filter((rx) => rx.status === 'dispensed' && rx.substitutionAllowed)
      .reduce((sum, rx) => sum + Math.max(0, rx.brandPrice - rx.referencePrice), 0);
    return { issued, submitted, dispensed, savings };
  }, [prescriptions]);

  const submit = (rx: Eprescription) => {
    setPrescriptions((prev) =>
      prev.map((entry) => (entry.id === rx.id ? { ...entry, status: 'submitted' } : entry)),
    );
    toast.success('ePrescription sent to the national service', {
      description: `${rx.id} · ${rx.nationalId} · retrievable by any pharmacy in the country.`,
    });
  };

  const cancel = (rx: Eprescription) => {
    setPrescriptions((prev) =>
      prev.map((entry) => (entry.id === rx.id ? { ...entry, status: 'cancelled' } : entry)),
    );
    toast.success('ePrescription cancelled', {
      description: `${rx.id} · the national service has been notified.`,
    });
  };

  const dispense = (rx: Eprescription) => {
    const substituted = rx.substitutionAllowed && rx.referencePrice < rx.brandPrice;
    const price = substituted ? rx.referencePrice : rx.brandPrice;
    setPrescriptions((prev) =>
      prev.map((entry) =>
        entry.id === rx.id
          ? {
              ...entry,
              status: 'dispensed',
              dispense: {
                pharmacy: 'Trika Pharmacy',
                dispensedAt: new Date().toISOString(),
                product: substituted ? `${rx.medication} (reference-priced substitute)` : rx.medication,
                price,
              },
            }
          : entry,
      ),
    );
    toast.success('Dispensed and reported to eDispense', {
      description: substituted
        ? `${rx.medication} substituted within the reference price group · ${euro.format(price)}`
        : `${rx.medication} · ${euro.format(price)}`,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-primary" />
          ePrescription &amp; eDispense
        </h2>
        <p className="text-sm text-muted-foreground">
          National prescription identifiers, reference pricing and substitution, and dispense reporting
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{stats.issued}</p>
            <p className="text-xs text-muted-foreground">Issued, not yet transmitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-info">{stats.submitted}</p>
            <p className="text-xs text-muted-foreground">Waiting at the pharmacy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-success">{stats.dispensed}</p>
            <p className="text-xs text-muted-foreground">Dispensed this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{euro.format(stats.savings)}</p>
            <p className="text-xs text-muted-foreground">Reference-price savings</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {prescriptions.map((rx) => (
          <Card key={rx.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {rx.medication}
                    <span className="ml-1.5 font-normal text-muted-foreground">· {rx.patientName}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {rx.id} · national ID <span className="font-mono">{rx.nationalId}</span> · ATC{' '}
                    <span className="font-mono">{rx.atcCode}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {rx.dose} · quantity {rx.quantity} · {rx.prescribedBy} ·{' '}
                    {format(new Date(rx.issuedAt), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {rx.substitutionAllowed ? (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Repeat2 className="h-3 w-3" /> substitution allowed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">no substitution</Badge>
                  )}
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLE[rx.status])}>
                    {rx.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span>Brand {euro.format(rx.brandPrice)}</span>
                <span>Reference {euro.format(rx.referencePrice)}</span>
                {rx.brandPrice > rx.referencePrice && (
                  <span className="text-warning">
                    {euro.format(rx.brandPrice - rx.referencePrice)} above reference
                  </span>
                )}
              </div>

              {rx.dispense && (
                <div className="rounded-md border border-success/30 bg-success/5 p-2 text-[11px]">
                  <p className="inline-flex items-center gap-1 font-medium text-success">
                    <Store className="h-3 w-3" /> {rx.dispense.pharmacy}
                  </p>
                  <p className="text-muted-foreground">
                    {rx.dispense.product} · {euro.format(rx.dispense.price)} ·{' '}
                    {format(new Date(rx.dispense.dispensedAt), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
                {rx.status === 'issued' && (
                  <Button
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={!canPrescribe}
                    onClick={() => submit(rx)}
                  >
                    <Send className="h-3 w-3" /> Transmit to national service
                  </Button>
                )}
                {rx.status === 'submitted' && (
                  <Button
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={!canDispense}
                    onClick={() => dispense(rx)}
                  >
                    <Pill className="h-3 w-3" /> Dispense &amp; report
                  </Button>
                )}
                {(rx.status === 'issued' || rx.status === 'submitted') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                    disabled={!canPrescribe}
                    onClick={() => cancel(rx)}
                  >
                    <Ban className="h-3 w-3" /> Cancel
                  </Button>
                )}
                {rx.status === 'dispensed' && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-success">
                    <CheckCircle2 className="h-3 w-3" /> Dispense record shared with the prescriber
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Demo service only. National identifiers follow the German e-Rezept format; no data leaves this page.
      </p>
    </div>
  );
}
