import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadiologyOrder, RadiologyModality, RadiologyPriority } from '@/types/dhos';
import { modalityLabels, radiologyBodyParts } from '@/data/radiologyMockData';
import { mockPatients } from '@/data/mockData';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (order: Omit<RadiologyOrder, 'id' | 'orderedAt' | 'accessionNumber'>) => void;
}

export function NewRadiologyOrderDialog({ open, onOpenChange, onSubmit }: Props) {
  const [patientUpid, setPatientUpid] = useState('');
  const [modality, setModality] = useState<RadiologyModality>('CR');
  const [bodyPart, setBodyPart] = useState('');
  const [priority, setPriority] = useState<RadiologyPriority>('routine');
  const [indication, setIndication] = useState('');

  const patient = mockPatients.find(p => p.upid === patientUpid);
  const bodyParts = radiologyBodyParts[modality] || [];

  const handleSubmit = () => {
    if (!patientUpid || !bodyPart || !indication.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    onSubmit({
      patientUpid,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
      orderedBy: 'Dr. Sarah Chen',
      modality,
      bodyPart,
      clinicalIndication: indication,
      priority,
      status: 'scheduled',
    });
    toast.success('Radiology order created');
    onOpenChange(false);
    // Reset
    setPatientUpid('');
    setModality('CR');
    setBodyPart('');
    setPriority('routine');
    setIndication('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Radiology Order</DialogTitle>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Modality *</Label>
              <Select value={modality} onValueChange={v => { setModality(v as RadiologyModality); setBodyPart(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(modalityLabels) as RadiologyModality[]).map(m => (
                    <SelectItem key={m} value={m}>{m} — {modalityLabels[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority *</Label>
              <Select value={priority} onValueChange={v => setPriority(v as RadiologyPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="asap">ASAP</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Body Part *</Label>
            <Select value={bodyPart} onValueChange={setBodyPart}>
              <SelectTrigger><SelectValue placeholder="Select body part" /></SelectTrigger>
              <SelectContent>
                {bodyParts.map(bp => (
                  <SelectItem key={bp} value={bp}>{bp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Clinical Indication *</Label>
            <Textarea value={indication} onChange={e => setIndication(e.target.value)} placeholder="Reason for exam..." className="min-h-[80px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
