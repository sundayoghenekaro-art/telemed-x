import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Bed, Transfer } from '@/data/inpatientMockData';

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occupiedBeds: Bed[];
  availableBeds: Bed[];
  onTransfer: (transfer: Omit<Transfer, 'id'>) => void;
}

export function TransferDialog({ open, onOpenChange, occupiedBeds, availableBeds, onTransfer }: TransferDialogProps) {
  const [fromBedId, setFromBedId] = useState('');
  const [toWardId, setToWardId] = useState('');
  const [toBedId, setToBedId] = useState('');
  const [reason, setReason] = useState('');

  const fromBed = occupiedBeds.find(b => b.id === fromBedId);
  const toWards = Array.from(new Map(availableBeds.map(b => [b.wardId, b.wardName])).entries());
  const toBeds = toWardId ? availableBeds.filter(b => b.wardId === toWardId) : [];
  const toBed = availableBeds.find(b => b.id === toBedId);

  const canSubmit = fromBedId && toBedId && reason.trim();

  const handleSubmit = () => {
    if (!canSubmit || !fromBed || !toBed) return;
    onTransfer({
      patientUpid: fromBed.patientUpid || '',
      patientName: fromBed.patientName || '',
      fromWard: fromBed.wardName,
      fromBed: fromBed.bedNumber,
      toWard: toBed.wardName,
      toBed: toBed.bedNumber,
      reason,
      requestedBy: fromBed.physician || 'Dr. Sarah Chen',
      requestedAt: new Date().toISOString(),
      status: 'pending',
    });
    toast.success(`Transfer requested: ${fromBed.patientName} → ${toBed.bedNumber}`);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setFromBedId(''); setToWardId(''); setToBedId(''); setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Patient
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Patient (current bed)</Label>
            <Select value={fromBedId} onValueChange={setFromBedId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {occupiedBeds.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.patientName} — {b.bedNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">To Ward</Label>
              <Select value={toWardId} onValueChange={(v) => { setToWardId(v); setToBedId(''); }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {toWards.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Bed</Label>
              <Select value={toBedId} onValueChange={setToBedId} disabled={!toWardId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select bed" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {toBeds.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.bedNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason for Transfer</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} className="h-16 text-xs" placeholder="e.g. Step-down from ICU — patient stabilized" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
            Request Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
