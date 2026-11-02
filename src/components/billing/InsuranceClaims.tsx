import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, ShieldCheck, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { InsuranceClaim } from '@/data/billingMockData';

interface InsuranceClaimsProps {
  claims: InsuranceClaim[];
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  submitted: { label: 'Submitted', variant: 'outline', icon: <Clock className="h-3.5 w-3.5" /> },
  under_review: { label: 'Under Review', variant: 'secondary', icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: 'Approved', variant: 'default', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  partially_approved: { label: 'Partial', variant: 'outline', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  denied: { label: 'Denied', variant: 'destructive', icon: <XCircle className="h-3.5 w-3.5" /> },
  appealed: { label: 'Appealed', variant: 'secondary', icon: <Clock className="h-3.5 w-3.5" /> },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function InsuranceClaims({ claims }: InsuranceClaimsProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);

  const filtered = claims.filter(c => {
    const matchesSearch = c.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      c.claim_number.toLowerCase().includes(search.toLowerCase()) ||
      c.insurance_provider.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalClaimed = claims.reduce((s, c) => s + c.amount_claimed, 0);
  const totalApproved = claims.reduce((s, c) => s + (c.amount_approved || 0), 0);
  const pendingCount = claims.filter(c => ['submitted', 'under_review', 'appealed'].includes(c.status)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Claimed</p><p className="text-2xl font-bold">{formatCurrency(totalClaimed)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Approved</p><p className="text-2xl font-bold text-primary">{formatCurrency(totalApproved)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pending Claims</p><p className="text-2xl font-bold text-warning">{pendingCount}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="partially_approved">Partial</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Claimed</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const cfg = statusConfig[c.status] || statusConfig.submitted;
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClaim(c)}>
                    <TableCell className="font-mono text-sm">{c.claim_number}</TableCell>
                    <TableCell className="font-medium">{c.patient_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.insurance_provider}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(c.submitted_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.amount_claimed)}</TableCell>
                    <TableCell className="text-right font-medium">{c.amount_approved != null ? formatCurrency(c.amount_approved) : '—'}</TableCell>
                    <TableCell><Badge variant={cfg.variant} className="gap-1">{cfg.icon}{cfg.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No claims found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-md">
          {selectedClaim && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{selectedClaim.claim_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{selectedClaim.patient_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>{selectedClaim.insurance_provider}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Policy #</span><span className="font-mono">{selectedClaim.policy_number}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Diagnosis</span><span className="font-mono">{selectedClaim.diagnosis_codes.join(', ')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Procedures</span><span className="font-mono">{selectedClaim.procedure_codes.join(', ')}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Claimed</span><span className="font-bold">{formatCurrency(selectedClaim.amount_claimed)}</span></div>
                {selectedClaim.amount_approved != null && <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span className="font-bold text-primary">{formatCurrency(selectedClaim.amount_approved)}</span></div>}
                {selectedClaim.denial_reason && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="font-medium text-destructive">Denial Reason</p>
                    <p className="text-muted-foreground mt-1">{selectedClaim.denial_reason}</p>
                  </div>
                )}
                {selectedClaim.notes && <p className="text-muted-foreground italic">{selectedClaim.notes}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
