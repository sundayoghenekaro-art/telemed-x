import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  BadgeCheck,
  Banknote,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  ShieldCheck,
  XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Entitlement,
  PriorAuthorisation,
  mockBenefitRules,
  mockEntitlements,
  mockPriorAuthorisations,
} from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const ENTITLEMENT_STYLE: Record<Entitlement['status'], string> = {
  active: 'bg-success/10 text-success border-success/30',
  pending: 'bg-warning/10 text-warning border-warning/30',
  suspended: 'bg-destructive/10 text-destructive border-destructive/30',
};

const COVERAGE_STYLE: Record<string, string> = {
  covered: 'bg-success/10 text-success border-success/30',
  restricted: 'bg-warning/10 text-warning border-warning/30',
  'not-covered': 'bg-destructive/10 text-destructive border-destructive/30',
};

const AUTH_STYLE: Record<PriorAuthorisation['status'], string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  declined: 'bg-destructive/10 text-destructive border-destructive/30',
};

const EXEMPTION_LABEL: Record<Entitlement['exemption'], string> = {
  none: 'No exemption',
  chronic: 'Chronic disease programme',
  'low-income': 'Low-income exemption',
  maternity: 'Maternity exemption',
};

export function EntitlementPanel({
  canCheckInsurance = false,
  canSettleInsurance = false,
}: {
  canCheckInsurance?: boolean;
  canSettleInsurance?: boolean;
}) {
  const [entitlements] = useState<Entitlement[]>(mockEntitlements);
  const [authorisations, setAuthorisations] = useState<PriorAuthorisation[]>(mockPriorAuthorisations);
  const [requestPatient, setRequestPatient] = useState(entitlements[0].patientName);
  const [requestService, setRequestService] = useState(
    mockBenefitRules.find((rule) => rule.coverage === 'restricted')?.label ?? mockBenefitRules[0].label,
  );

  const restrictedServices = useMemo(
    () => mockBenefitRules.filter((rule) => rule.coverage !== 'covered'),
    [],
  );

  const pending = authorisations.filter((entry) => entry.status === 'pending').length;
  const approved = authorisations.filter((entry) => entry.status === 'approved').length;

  const requestAuthorisation = () => {
    const entry: PriorAuthorisation = {
      id: `PA-2026-${String(92 + authorisations.length).padStart(4, '0')}`,
      patientName: requestPatient,
      service: requestService,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      clinician: 'Trika Care Team',
    };
    setAuthorisations((prev) => [entry, ...prev]);
    toast.success('Prior authorisation requested', {
      description: `${requestPatient} · ${requestService}. The insurer has 5 working days to decide.`,
    });
  };

  const decide = (entry: PriorAuthorisation, status: 'approved' | 'declined') => {
    const reference = `TRK-${Math.floor(1000 + Math.random() * 9000)}-${status === 'approved' ? 'AP' : 'DN'}`;
    setAuthorisations((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status, reference } : item)),
    );
    toast.success(`Authorisation ${status}`, {
      description: `${entry.patientName} · ${entry.service} · reference ${reference}`,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Entitlement &amp; prior authorisation
        </h2>
        <p className="text-sm text-muted-foreground">
          Statutory scheme eligibility, benefit catalogue, exemptions, EHIC/S1 and insurer decisions
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{entitlements.filter((entry) => entry.status === 'active').length}</p>
            <p className="text-xs text-muted-foreground">Active entitlements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-warning">{pending}</p>
            <p className="text-xs text-muted-foreground">Authorisations pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-success">{approved}</p>
            <p className="text-xs text-muted-foreground">Approved this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{entitlements.filter((entry) => entry.ehicValidUntil).length}</p>
            <p className="text-xs text-muted-foreground">EHIC cards on file</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entitlements">
        <TabsList>
          <TabsTrigger value="entitlements" className="gap-2">
            <CreditCard className="h-4 w-4" /> Entitlements
          </TabsTrigger>
          <TabsTrigger value="benefits" className="gap-2">
            <BadgeCheck className="h-4 w-4" /> Benefit catalogue
          </TabsTrigger>
          <TabsTrigger value="authorisations" className="gap-2">
            <FileCheck2 className="h-4 w-4" /> Authorisations
            {pending > 0 && (
              <span className="ml-1 rounded-full bg-warning px-1.5 py-0.5 text-xs text-warning-foreground">{pending}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entitlements" className="mt-4 grid gap-2 md:grid-cols-2">
          {entitlements.map((entry) => {
            const remaining = Math.max(0, entry.deductibleTotal - entry.deductibleUsed);
            return (
              <Card key={entry.id}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{entry.patientName}</p>
                      <p className="text-[11px] text-muted-foreground">{entry.scheme} · {entry.country}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{entry.memberId}</p>
                    </div>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', ENTITLEMENT_STYLE[entry.status])}>
                      {entry.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <Badge variant="outline">{EXEMPTION_LABEL[entry.exemption]}</Badge>
                    <Badge variant="outline">co-pay {entry.coPayPercent}%</Badge>
                    {entry.ehicValidUntil && <Badge variant="outline">EHIC to {entry.ehicValidUntil}</Badge>}
                    {entry.s1Issued && <Badge variant="outline">S1 issued</Badge>}
                  </div>

                  {entry.deductibleTotal > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Deductible used</span>
                        <span>{naira.format(entry.deductibleUsed)} / {naira.format(entry.deductibleTotal)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (entry.deductibleUsed / entry.deductibleTotal) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {remaining === 0 ? 'Deductible exhausted for this year' : `${naira.format(remaining)} remaining`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="benefits" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Benefit catalogue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Service</th>
                      <th className="py-2 pr-3 font-medium">Category</th>
                      <th className="py-2 pr-3 font-medium">Coverage</th>
                      <th className="py-2 pr-3 text-right font-medium">Co-pay</th>
                      <th className="py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockBenefitRules.map((rule) => (
                      <tr key={rule.code} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3">
                          <p className="font-medium">{rule.label}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{rule.code}</p>
                        </td>
                        <td className="py-2 pr-3 text-xs">{rule.category}</td>
                        <td className="py-2 pr-3">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', COVERAGE_STYLE[rule.coverage])}>
                            {rule.coverage}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right text-xs">{rule.coPay}%</td>
                        <td className="py-2 text-[11px] text-muted-foreground">{rule.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authorisations" className="mt-4 space-y-3">
          <Card>
            <CardContent className="space-y-2 pt-4">
              <p className="text-sm font-semibold">Request authorisation</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={requestPatient} onValueChange={setRequestPatient}>
                  <SelectTrigger className="h-8 text-xs sm:w-[190px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {entitlements.map((entry) => (
                      <SelectItem key={entry.id} value={entry.patientName}>{entry.patientName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={requestService} onValueChange={setRequestService}>
                  <SelectTrigger className="h-8 text-xs sm:w-[290px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {restrictedServices.map((rule) => (
                      <SelectItem key={rule.code} value={rule.label}>{rule.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={!canCheckInsurance}
                  onClick={requestAuthorisation}
                >
                  <Banknote className="h-3.5 w-3.5" /> Request
                </Button>
              </div>
              {!canCheckInsurance && (
                <p className="text-[11px] text-muted-foreground">
                  Requesting coverage checks requires insurance verification rights.
                </p>
              )}
            </CardContent>
          </Card>

          {authorisations.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {entry.service}
                    <span className="ml-1.5 font-normal text-muted-foreground">· {entry.patientName}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.id} · {entry.clinician} · requested {format(new Date(entry.requestedAt), 'dd MMM yyyy')}
                    {entry.reference && <> · ref {entry.reference}</>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', AUTH_STYLE[entry.status])}>
                    {entry.status}
                  </span>
                  {entry.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={!canSettleInsurance}
                        onClick={() => decide(entry, 'approved')}
                      >
                        <ClipboardCheck className="h-3 w-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                        disabled={!canSettleInsurance}
                        onClick={() => decide(entry, 'declined')}
                      >
                        <XCircle className="h-3 w-3" /> Decline
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Banknote className="h-3 w-3" /> Decisions mirror the insurer response; nothing is transmitted in this demo.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
