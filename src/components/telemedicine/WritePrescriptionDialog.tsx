import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pill } from 'lucide-react';
import { toast } from 'sonner';

interface WritePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  doctorUserId: string;
  doctorName: string;
  patientName: string;
  patientAccountId: string | null;
  onPrescriptionWritten: () => void;
}

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed (PRN)', 'Weekly', 'Monthly'];
const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '30 days', '60 days', '90 days', 'Ongoing'];

export function WritePrescriptionDialog({
  open, onOpenChange, sessionId, doctorUserId, doctorName, patientName, patientAccountId, onPrescriptionWritten
}: WritePrescriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    medicationName: '', dosage: '', frequency: '', duration: '', instructions: '', refills: '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('telemedicine_prescriptions').insert({
        session_id: sessionId,
        doctor_user_id: doctorUserId,
        doctor_name: doctorName,
        patient_name: patientName,
        patient_account_id: patientAccountId,
        medication_name: form.medicationName,
        dosage: form.dosage,
        frequency: form.frequency,
        duration: form.duration,
        instructions: form.instructions || null,
        refills: parseInt(form.refills),
        status: 'active',
      });
      if (error) throw error;

      // Post a prescription message in chat
      await supabase.from('session_messages').insert({
        session_id: sessionId,
        sender_id: doctorUserId,
        sender_name: doctorName,
        sender_role: 'doctor',
        content: `💊 Prescription issued: ${form.medicationName} ${form.dosage} — ${form.frequency} for ${form.duration}${form.instructions ? `. Instructions: ${form.instructions}` : ''}`,
        message_type: 'prescription',
      });

      toast.success('Prescription written and sent to patient');
      onPrescriptionWritten();
      onOpenChange(false);
      setForm({ medicationName: '', dosage: '', frequency: '', duration: '', instructions: '', refills: '0' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to write prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" /> Write Prescription
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Patient</Label>
              <Input value={patientName} disabled className="bg-muted" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Medication Name *</Label>
              <Input placeholder="e.g. Amoxicillin" value={form.medicationName}
                onChange={(e) => setForm({ ...form, medicationName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Dosage *</Label>
              <Input placeholder="e.g. 500mg" value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Refills</Label>
              <Input type="number" min="0" max="12" value={form.refills}
                onChange={(e) => setForm({ ...form, refills: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration *</Label>
              <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Special Instructions</Label>
              <Textarea placeholder="e.g. Take with food, avoid alcohol..." rows={2}
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !form.medicationName || !form.dosage || !form.frequency || !form.duration}>
              {loading ? 'Writing...' : 'Write Prescription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
