import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Banknote, CreditCard, Building, Smartphone, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Payment } from '@/data/billingMockData';

interface PaymentTrackingProps {
  payments: Payment[];
}

const methodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  bank_transfer: <Building className="h-4 w-4" />,
  insurance: <ShieldCheck className="h-4 w-4" />,
  mobile_money: <Smartphone className="h-4 w-4" />,
};

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  insurance: 'Insurance',
  mobile_money: 'Mobile Money',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function PaymentTracking({ payments }: PaymentTrackingProps) {
  const [search, setSearch] = useState('');

  const filtered = payments.filter(p =>
    p.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    p.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (p.reference_number?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

  // Method breakdown
  const byMethod = payments.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Received</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalReceived)}</p>
          </CardContent>
        </Card>
        {Object.entries(byMethod).map(([method, amount]) => (
          <Card key={method}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                {methodIcons[method]}
                <p className="text-sm text-muted-foreground">{methodLabels[method]}</p>
              </div>
              <p className="text-xl font-bold">{formatCurrency(amount)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Received By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{format(new Date(p.payment_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="font-medium">{p.patient_name}</TableCell>
                  <TableCell className="font-mono text-sm">{p.invoice_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1.5">
                      {methodIcons[p.method]}
                      {methodLabels[p.method]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{p.reference_number || '—'}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.received_by || '—'}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
