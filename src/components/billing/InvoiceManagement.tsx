import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Plus, Eye, Send, Search, Filter, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { NewInvoiceDialog } from './NewInvoiceDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import type { Invoice, Payment } from '@/data/billingMockData';

interface InvoiceManagementProps {
  invoices: Invoice[];
  canManage?: boolean;
  canCreateInvoice?: boolean;
  onAddInvoice: (invoice: Invoice) => void;
  onRecordPayment: (payment: Payment, invoiceId: string) => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'outline' },
  paid: { label: 'Paid', variant: 'default' },
  partial: { label: 'Partial', variant: 'outline' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

const categoryLabels: Record<string, string> = {
  consultation: 'Consultation',
  procedure: 'Procedure',
  lab: 'Laboratory',
  radiology: 'Radiology',
  pharmacy: 'Pharmacy',
  room: 'Room & Board',
  service: 'Service',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function InvoiceManagement({ invoices, canManage = false, canCreateInvoice = false, onAddInvoice, onRecordPayment }: InvoiceManagementProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const filtered = invoices.filter(inv => {
    const matchesSearch = inv.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance_due, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Collected</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by patient or invoice #..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        {canCreateInvoice && (
          <Button onClick={() => setShowNewDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        )}
      </div>



      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => {
                const cfg = statusConfig[inv.status] || statusConfig.draft;
                return (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedInvoice(inv)}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell className="font-medium">{inv.patient_name}</TableCell>
                    <TableCell className="text-muted-foreground">{inv.department}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(inv.issue_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(inv.total)}</TableCell>
                    <TableCell className="text-right font-medium">{inv.balance_due > 0 ? formatCurrency(inv.balance_due) : '—'}</TableCell>
                    <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                    <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedInvoice.invoice_number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{selectedInvoice.patient_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.department}</p>
                  </div>
                  <Badge variant={statusConfig[selectedInvoice.status]?.variant}>{statusConfig[selectedInvoice.status]?.label}</Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Line Items</p>
                  {selectedInvoice.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.description}
                        <span className="text-muted-foreground ml-2">({categoryLabels[item.category] || item.category})</span>
                        {item.quantity > 1 && <span className="text-muted-foreground"> × {item.quantity}</span>}
                      </span>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(selectedInvoice.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(selectedInvoice.tax)}</span></div>
                  {selectedInvoice.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(selectedInvoice.discount)}</span></div>}
                  <Separator />
                  <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(selectedInvoice.total)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-primary">{formatCurrency(selectedInvoice.amount_paid)}</span></div>
                  <div className="flex justify-between font-medium"><span>Balance Due</span><span className="text-destructive">{formatCurrency(selectedInvoice.balance_due)}</span></div>
                </div>
                {canManage && selectedInvoice.balance_due > 0 && (
                  <Button className="w-full gap-2" onClick={() => { setPayingInvoice(selectedInvoice); setSelectedInvoice(null); }}>
                    <Banknote className="h-4 w-4" /> Record Payment
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <NewInvoiceDialog open={showNewDialog} onOpenChange={setShowNewDialog} onSave={onAddInvoice} />

      {payingInvoice && (
        <RecordPaymentDialog
          open={!!payingInvoice}
          onOpenChange={(v) => { if (!v) setPayingInvoice(null); }}
          invoice={payingInvoice}
          onSave={(payment, invoiceId) => { onRecordPayment(payment, invoiceId); setPayingInvoice(null); }}
        />
      )}
    </div>
  );
}
