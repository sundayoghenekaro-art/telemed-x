import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Bed, Admission } from '@/data/inpatientMockData';
import { mockPatients } from '@/data/mockData';

interface AdmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBeds: Bed[];
  onAdmit: (admission: Omit<Admission, 'id'>) => void;
}

export function AdmissionDialog({ open, onOpenChange, availableBeds, onAdmit }: AdmissionDialogProps) {
  const [patientUpid, setPatientUpid] = useState('');
  const [wardId, setWardId] = useState('');
  const [bedId, setBedId] = useState('');
  const [physician, setPhysician] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'emergency'>('routine');
  const [diagnosis, setDiagnosis] = useState('');

  const wards = Array.from(new Map(availableBeds.map(b => [b.wardId, b.wardName])).entries());
  const wardsAvailBeds = wardId ? availableBeds.filter(b => b.wardId === wardId) : [];
  const selectedBed = availableBeds.find(b => b.id === bedId);
  const selectedPatient = mockPatients.find(p => p.upid === patientUpid);

  const physicians = ['Dr. Sarah Chen', 'Dr. Michael Adebayo', 'Dr. Fatima Yusuf', 'Dr. Blessing Okoro', 'Dr. Ngozi Eze'];

  const canSubmit = patientUpid && bedId && physician && reason.trim();

  const handleSubmit = () => {
    if (!canSubmit || !selectedPatient || !selectedBed) return;
    onAdmit({
      patientUpid,
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      wardId: selectedBed.wardId,
      wardName: selectedBed.wardName,
      bedId,
      bedNumber: selectedBed.bedNumber,
      admittingPhysician: physician,
      admissionDate: new Date().toISOString(),
      reason,
      status: 'active',
      diagnosis: diagnosis || undefined,
      priority,
    });
    toast.success(`${selectedPatient.firstName} ${selectedPatient.lastName} admitted to ${selectedBed.bedNumber}`);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setPatientUpid(''); setWardId(''); setBedId('');
    setPhysician(''); setReason(''); setPriority('routine'); setDiagnosis('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <UserPlus className="h-4 w-4" />
            New Admission
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Patient</Label>
              <Select value={patientUpid} onValueChange={setPatientUpid}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {mockPatients.map(p => (
                    <SelectItem key={p.upid} value={p.upid}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ward</Label>
              <Select value={wardId} onValueChange={(v) => { setWardId(v); setBedId(''); }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {wards.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bed</Label>
              <Select value={bedId} onValueChange={setBedId} disabled={!wardId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select bed" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {wardsAvailBeds.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.bedNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Attending Physician</Label>
            <Select value={physician} onValueChange={setPhysician}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select physician" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {physicians.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason for Admission</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} className="h-16 text-xs" placeholder="e.g. Acute exacerbation of COPD" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Diagnosis (optional)</Label>
            <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="h-9 text-xs" placeholder="e.g. J44.1 — COPD with acute exacerbation" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Admit Patient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
