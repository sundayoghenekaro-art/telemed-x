import { useState } from 'react';
import { Banknote } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Invoice, Payment } from '@/data/billingMockData';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onSave: (payment: Payment, invoiceId: string) => void;
}

const methods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'insurance', label: 'Insurance' },
] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
}

export function RecordPaymentDialog({ open, onOpenChange, invoice, onSave }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState(invoice.balance_due);
  const [method, setMethod] = useState<string>('cash');
  const [reference, setReference] = useState('');
  const [receivedBy, setReceivedBy] = useState('Front Desk Demo');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (amount <= 0) { toast.error('Amount must be greater than zero'); return; }
    if (amount > invoice.balance_due) { toast.error(`Amount cannot exceed balance of ${formatCurrency(invoice.balance_due)}`); return; }
    if (!method) { toast.error('Select a payment method'); return; }

    const payment: Payment = {
      id: crypto.randomUUID(),
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      patient_name: invoice.patient_name,
      payment_date: new Date().toISOString(),
      amount,
      method: method as Payment['method'],
      reference_number: reference.trim() || undefined,
      received_by: receivedBy.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onSave(payment, invoice.id);
    onOpenChange(false);
    toast.success(`Payment of ${formatCurrency(amount)} recorded for ${invoice.invoice_number}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" /> Record Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono">{invoice.invoice_number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{invoice.patient_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{formatCurrency(invoice.total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-primary">{formatCurrency(invoice.amount_paid)}</span></div>
            <div className="flex justify-between font-medium"><span>Balance Due</span><span className="text-destructive">{formatCurrency(invoice.balance_due)}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (₦) *</Label>
              <Input id="pay-amount" type="number" min={1} max={invoice.balance_due} value={amount} onChange={e => setAmount(Math.max(0, parseFloat(e.target.value) || 0))} />
            </div>
            <div className="space-y-2">
              <Label>Method *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {methods.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay-ref">Reference #</Label>
              <Input id="pay-ref" placeholder="e.g. TXN-12345" value={reference} onChange={e => setReference(e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-by">Received By</Label>
              <Input id="pay-by" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} maxLength={100} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-notes">Notes</Label>
            <Textarea id="pay-notes" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
