import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ClinicalOrder, ClinicalOrderType } from '@/data/clinicalMockData';
import { mockPatients } from '@/data/mockData';

interface NewClinicalOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (order: ClinicalOrder) => void;
}

export function NewClinicalOrderDialog({ open, onOpenChange, onCreated }: NewClinicalOrderDialogProps) {
  const [patientUpid, setPatientUpid] = useState('');
  const [type, setType] = useState<ClinicalOrderType>('lab');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const selectedPatient = mockPatients.find(p => p.upid === patientUpid);

  const reset = () => {
    setPatientUpid(''); setType('lab'); setPriority('routine'); setDescription(''); setNotes('');
  };

  const handleSubmit = () => {
    if (!patientUpid || !description.trim()) {
      toast.error('Please select a patient and enter a description.');
      return;
    }

    const id = `CO-${String(Date.now()).slice(-6)}`;
    const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Unknown';

    const order: ClinicalOrder = {
      id,
      patientUpid,
      patientName,
      type,
      description: description.trim(),
      priority,
      status: 'pending',
      orderedBy: 'Dr. Sarah Chen',
      orderedAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    onCreated(order);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} order created for ${patientName}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            New Clinical Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Patient *</Label>
            <Select value={patientUpid} onValueChange={setPatientUpid}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>
                {mockPatients.map(p => (
                  <SelectItem key={p.upid} value={p.upid}>{p.firstName} {p.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select value={type} onValueChange={v => setType(v as ClinicalOrderType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lab">Laboratory</SelectItem>
                  <SelectItem value="imaging">Imaging</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as 'routine' | 'urgent' | 'stat')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. CBC, BMP, Hepatic panel" />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional instructions..." rows={2} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
