import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCopy,
  CreditCard,
  Download,
  FileText,
  Link2,
  ReceiptText,
  ShieldCheck,
  ShieldX,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EligibilityStatus,
  PaymentLink,
  mockPayerPolicies,
  mockPaymentLinks,
  mockTariffItems,
} from '@/data/capabilityMockData';
import type { Invoice, Payment } from '@/data/billingMockData';
import { cn } from '@/lib/utils';

interface InsuranceSettlementPanelProps {
  invoices: Invoice[];
  canCheckInsurance?: boolean;
  canSettleInsurance?: boolean;
  canRecordPayment?: boolean;
  onRecordPayment?: (payment: Payment, invoiceId: string) => void;
}

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const ELIGIBILITY_STYLE: Record<EligibilityStatus, string> = {
  verified: 'bg-success/10 text-success border-success/30',
  pending: 'bg-warning/10 text-warning border-warning/30',
  ineligible: 'bg-destructive/10 text-destructive border-destructive/30',
};

const CATEGORY_LABEL: Record<string, string> = {
  consultation: 'Consultation',
  procedure: 'Procedure',
  lab: 'Laboratory',
  radiology: 'Radiology',
  pharmacy: 'Pharmacy',
  room: 'Room & board',
};

const ALL_CATEGORIES = 'all';

export function InsuranceSettlementPanel({
  invoices,
  canCheckInsurance = false,
  canSettleInsurance = false,
  canRecordPayment = false,
  onRecordPayment,
}: InsuranceSettlementPanelProps) {
  const [policies, setPolicies] = useState(mockPayerPolicies);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>(mockPaymentLinks);
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [settlePolicyId, setSettlePolicyId] = useState<string | null>(null);
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<Payment['method']>('card');
  const [payReference, setPayReference] = useState('');
  const [estimateInvoiceId, setEstimateInvoiceId] = useState(
    invoices.find((invoice) => invoice.balance_due > 0)?.id ?? invoices[0]?.id ?? '',
  );

  const openInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.balance_due > 0 && invoice.status !== 'cancelled'),
    [invoices],
  );

  const filteredInvoices = useMemo(
    () => (invoiceFilter === 'all' ? openInvoices : openInvoices.filter((invoice) => invoice.department === invoiceFilter)),
    [openInvoices, invoiceFilter],
  );

  const invoiceDepartments = useMemo(
    () => [...new Set(openInvoices.map((invoice) => invoice.department))].sort(),
    [openInvoices],
  );

  const estimateInvoice = invoices.find((invoice) => invoice.id === estimateInvoiceId);
  const estimatePolicy = policies.find((policy) => policy.patientName === estimateInvoice?.patient_name);
  const estimateCoverage = estimatePolicy?.eligibility === 'verified' ? estimatePolicy.coveragePercent : 0;
  const estimateCovered = estimateInvoice ? Math.round(estimateInvoice.total * (estimateCoverage / 100)) : 0;
  const estimateSelfPay = estimateInvoice ? estimateInvoice.total - estimateCovered : 0;

  const tariffCategories = useMemo(
    () => [...new Set(mockTariffItems.map((item) => item.category))],
    [],
  );
  const tariffRows = mockTariffItems.filter(
    (item) => categoryFilter === ALL_CATEGORIES || item.category === categoryFilter,
  );

  const settlePolicy = policies.find((policy) => policy.id === settlePolicyId);
  const settleInvoice = settlePolicy
    ? invoices.find((invoice) => invoice.patient_name === settlePolicy.patientName && invoice.balance_due > 0)
    : undefined;
  const settleCovered = settlePolicy && settleInvoice
    ? Math.round(settleInvoice.total * (settlePolicy.coveragePercent / 100))
    : 0;

  const payInvoice = invoices.find((invoice) => invoice.id === payInvoiceId);

  const verifyEligibility = (policyId: string) => {
    setPolicies((prev) =>
      prev.map((policy) =>
        policy.id === policyId
          ? { ...policy, eligibility: 'verified', checkedAt: new Date().toISOString() }
          : policy,
      ),
    );
    toast.success('Eligibility verified with payer', {
      description: 'Coverage confirmed. The claim can be submitted once the invoice is issued.',
    });
  };

  const confirmSettlement = () => {
    if (!settlePolicy || !settleInvoice) return;
    setPolicies((prev) =>
      prev.map((policy) =>
        policy.id === settlePolicy.id
          ? { ...policy, claimStatus: 'submitted', settledAmount: settleCovered }
          : policy,
      ),
    );
    if (onRecordPayment) {
      onRecordPayment(
        {
          id: `pay-${Date.now()}`,
          invoice_id: settleInvoice.id,
          invoice_number: settleInvoice.invoice_number,
          patient_name: settleInvoice.patient_name,
          payment_date: new Date().toISOString(),
          amount: settleCovered,
          method: 'insurance',
          reference_number: `${settlePolicy.payer.replace(/\s+/g, '-').toUpperCase()}-${settlePolicy.policyNumber}`,
          received_by: 'Insurance desk',
          notes: `Claim submitted to ${settlePolicy.payer}`,
        },
        settleInvoice.id,
      );
    }
    setSettlePolicyId(null);
    toast.success('Claim submitted to payer', {
      description: `${naira.format(settleCovered)} insurer share posted · ${naira.format(settleInvoice.total - settleCovered)} remains self-pay.`,
    });
  };

  const createPaymentLink = (invoice: Invoice) => {
    const link: PaymentLink = {
      id: `PL-${Date.now()}`,
      invoiceNumber: invoice.invoice_number,
      patientName: invoice.patient_name,
      amount: invoice.balance_due,
      channel: 'card',
      reference: `PAY-LNK-${Math.floor(10000 + Math.random() * 89999)}`,
      status: 'created',
      createdAt: new Date().toISOString(),
    };
    setPaymentLinks((prev) => [link, ...prev]);
    toast.success('Payment link created', { description: `${link.reference} · ${naira.format(link.amount)}` });
  };

  const copyLink = async (link: PaymentLink) => {
    const url = `https://pay.trika.health/${link.reference}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Payment link copied', { description: url });
    } catch {
      toast.info('Copy manually', { description: url });
    }
  };

  const downloadEInvoice = (invoice: Invoice) => {
    const lines = [
      'TRIKA HEALTH — ELECTRONIC INVOICE',
      '=================================',
      `Invoice: ${invoice.invoice_number}`,
      `Issued: ${format(new Date(invoice.issue_date), 'dd MMM yyyy')}`,
      `Due: ${format(new Date(invoice.due_date), 'dd MMM yyyy')}`,
      `Patient: ${invoice.patient_name} (${invoice.patient_id})`,
      `Department: ${invoice.department}`,
      '',
      'Items',
      '-----',
      ...invoice.items.map(
        (item) => `${item.description} × ${item.quantity}  ${naira.format(item.total)}`,
      ),
      '',
      `Subtotal: ${naira.format(invoice.subtotal)}`,
      `Tax: ${naira.format(invoice.tax)}`,
      `Discount: ${naira.format(invoice.discount)}`,
      `Total: ${naira.format(invoice.total)}`,
      `Paid: ${naira.format(invoice.amount_paid)}`,
      `Balance due: ${naira.format(invoice.balance_due)}`,
      '',
      'This document is system-generated and valid without a stamp.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${invoice.invoice_number}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('E-invoice downloaded', { description: `${invoice.invoice_number}.txt` });
  };

  const openPayDialog = (invoice: Invoice) => {
    setPayInvoiceId(invoice.id);
    setPayAmount(String(invoice.balance_due));
    setPayMethod('card');
    setPayReference('');
  };

  const submitPayment = () => {
    if (!payInvoice || !onRecordPayment) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    onRecordPayment(
      {
        id: `pay-${Date.now()}`,
        invoice_id: payInvoice.id,
        invoice_number: payInvoice.invoice_number,
        patient_name: payInvoice.patient_name,
        payment_date: new Date().toISOString(),
        amount,
        method: payMethod,
        reference_number: payReference.trim() || undefined,
        received_by: 'Billing desk',
      },
      payInvoice.id,
    );
    setPayInvoiceId(null);
    toast.success('Payment captured', { description: `${naira.format(amount)} · ${payMethod.replace('_', ' ')}` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ReceiptText className="h-5 w-5 text-primary" />
          Insurance settlement &amp; payments
        </h2>
        <p className="text-sm text-muted-foreground">
          Eligibility, covered / self-pay split, claim submission, payment capture and e-invoices
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Payer policies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {policies.map((policy) => {
              const matchInvoice = invoices.find(
                (invoice) => invoice.patient_name === policy.patientName && invoice.balance_due > 0,
              );
              return (
                <div key={policy.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{policy.patientName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {policy.payer} · {policy.policyNumber} · {policy.coveragePercent}% cover
                      </p>
                    </div>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', ELIGIBILITY_STYLE[policy.eligibility])}>
                      {policy.eligibility}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Exclusions: {policy.exclusions.join(', ')}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {policy.claimStatus !== 'none' && (
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        Claim {policy.claimStatus}
                        {policy.settledAmount ? ` · ${naira.format(policy.settledAmount)}` : ''}
                      </Badge>
                    )}
                    {canCheckInsurance && policy.eligibility === 'pending' && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => verifyEligibility(policy.id)}>
                        <BadgeCheck className="mr-1 h-3 w-3" /> Verify eligibility
                      </Button>
                    )}
                    {canSettleInsurance && policy.eligibility === 'verified' && policy.claimStatus === 'none' && (
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={!matchInvoice}
                        onClick={() => setSettlePolicyId(policy.id)}
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        {matchInvoice ? 'Submit claim' : 'No open invoice'}
                      </Button>
                    )}
                    {policy.eligibility === 'ineligible' && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                        <ShieldX className="h-3 w-3" /> Full self-pay required
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-primary" /> Estimate before treatment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={estimateInvoiceId} onValueChange={setEstimateInvoiceId}>
              <SelectTrigger><SelectValue placeholder="Choose an invoice" /></SelectTrigger>
              <SelectContent>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} · {invoice.patient_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {estimateInvoice ? (
              <div className="rounded-lg border border-border">
                <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                  {estimatePolicy
                    ? `${estimatePolicy.payer} · ${estimatePolicy.eligibility === 'verified' ? `${estimatePolicy.coveragePercent}% cover confirmed` : 'cover not confirmed — estimate assumes self-pay'}`
                    : 'No policy on file — estimate assumes self-pay'}
                </div>
                <dl className="divide-y divide-border text-sm">
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Invoice total</dt>
                    <dd className="font-medium">{naira.format(estimateInvoice.total)}</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Insurer share</dt>
                    <dd className="font-medium text-success">{naira.format(estimateCovered)}</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Patient self-pay</dt>
                    <dd className="font-semibold">{naira.format(estimateSelfPay)}</dd>
                  </div>
                </dl>
                {estimatePolicy && estimatePolicy.exclusions.length > 0 && (
                  <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                    Not covered: {estimatePolicy.exclusions.join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No invoices available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" /> Open balances
          </CardTitle>
          <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {invoiceDepartments.map((department) => (
                <SelectItem key={department} value={department}>{department}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredInvoices.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No open balances.</p>
          )}
          {filteredInvoices.map((invoice) => {
            const existingLink = paymentLinks.find(
              (link) => link.invoiceNumber === invoice.invoice_number && link.status === 'created',
            );
            return (
              <div key={invoice.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {invoice.invoice_number} · {invoice.patient_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {invoice.department} · due {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                      {', '}
                      <span className="font-medium text-foreground">{naira.format(invoice.balance_due)} outstanding</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {canRecordPayment && onRecordPayment && (
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => openPayDialog(invoice)}>
                        <Wallet className="mr-1 h-3 w-3" /> Take payment
                      </Button>
                    )}
                    {canRecordPayment && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => (existingLink ? copyLink(existingLink) : createPaymentLink(invoice))}
                      >
                        <Link2 className="mr-1 h-3 w-3" />
                        {existingLink ? existingLink.reference : 'Payment link'}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => downloadEInvoice(invoice)}>
                      <Download className="mr-1 h-3 w-3" /> E-invoice
                    </Button>
                  </div>
                </div>
                {existingLink && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Link2 className="h-3 w-3" /> {existingLink.reference} · {existingLink.channel.replace('_', ' ')} ·
                    <button className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline" onClick={() => copyLink(existingLink)}>
                      <ClipboardCopy className="h-3 w-3" /> copy
                    </button>
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" /> Published price list
          </CardTitle>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {tariffCategories.map((category) => (
                <SelectItem key={category} value={category}>{CATEGORY_LABEL[category]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Service</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Insurance</th>
                  <th className="py-2 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {tariffRows.map((item) => (
                  <tr key={item.code} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{item.code}</td>
                    <td className="py-2 pr-3">{item.description}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{CATEGORY_LABEL[item.category]}</td>
                    <td className="py-2 pr-3">
                      {item.covered ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> covered</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive"><ShieldX className="h-3 w-3" /> self-pay</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-medium">{naira.format(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(settlePolicy)} onOpenChange={(open) => !open && setSettlePolicyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit insurance claim</DialogTitle>
            <DialogDescription>
              {settlePolicy?.patientName} · {settlePolicy?.payer} · {settlePolicy?.coveragePercent}% cover
            </DialogDescription>
          </DialogHeader>
          {settleInvoice && settlePolicy && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border">
                <dl className="divide-y divide-border text-sm">
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Invoice</dt>
                    <dd className="font-medium">{settleInvoice.invoice_number}</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Invoice total</dt>
                    <dd className="font-medium">{naira.format(settleInvoice.total)}</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Insurer share</dt>
                    <dd className="font-medium text-success">{naira.format(settleCovered)}</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-muted-foreground">Patient self-pay</dt>
                    <dd className="font-semibold">{naira.format(settleInvoice.total - settleCovered)}</dd>
                  </div>
                </dl>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Excluded under this policy: {settlePolicy.exclusions.join(', ')}. Submission posts the insurer share
                as a pending payment and sends the claim to {settlePolicy.payer}.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettlePolicyId(null)}>Cancel</Button>
            <Button onClick={confirmSettlement} disabled={!settleInvoice}>Submit claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payInvoice)} onOpenChange={(open) => !open && setPayInvoiceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take payment</DialogTitle>
            <DialogDescription>
              {payInvoice?.invoice_number} · {payInvoice?.patient_name} ·{' '}
              {payInvoice ? `${naira.format(payInvoice.balance_due)} outstanding` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="pay-amount">Amount</label>
              <Input
                id="pay-amount"
                type="number"
                inputMode="decimal"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pay-method">Method</label>
                <Select value={payMethod} onValueChange={(value) => setPayMethod(value as Payment['method'])}>
                  <SelectTrigger id="pay-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card (POS)</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile money</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pay-reference">Reference</label>
                <Input
                  id="pay-reference"
                  value={payReference}
                  onChange={(event) => setPayReference(event.target.value)}
                  placeholder="Gateway / slip reference"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayInvoiceId(null)}>Cancel</Button>
            <Button onClick={submitPayment}>Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
