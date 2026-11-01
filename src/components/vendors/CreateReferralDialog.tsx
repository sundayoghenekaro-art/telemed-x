import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Send, TestTube, Pill, Scan } from 'lucide-react';
import { toast } from 'sonner';

interface CreateReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientUpid?: string;
  patientName?: string;
  doctorName?: string;
}

export function CreateReferralDialog({ open, onOpenChange, patientUpid, patientName, doctorName }: CreateReferralDialogProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>('');
  const [priority, setPriority] = useState('routine');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [itemText, setItemText] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [pName, setPName] = useState(patientName || '');
  const [pUpid, setPUpid] = useState(patientUpid || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || items.length === 0) { toast.error('Select type and add at least one item'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const refNum = `REF-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('referrals' as any).insert({
        referral_number: refNum,
        type,
        patient_upid: pUpid,
        patient_name: pName,
        referring_doctor: doctorName || 'Unknown Doctor',
        referring_doctor_user_id: user.id,
        priority,
        clinical_notes: clinicalNotes || null,
        items: items.map(i => ({ name: i })),
        status: 'pending',
      });
      if (error) throw error;
      toast.success(`Referral ${refNum} created! Patient can now choose a vendor.`);
      onOpenChange(false);
      setType(''); setItems([]); setClinicalNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create referral');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Referral</DialogTitle>
          <DialogDescription>The patient will choose their preferred vendor</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'lab', label: 'Lab Test', icon: TestTube },
              { value: 'pharmacy', label: 'Prescription', icon: Pill },
              { value: 'radiology', label: 'Imaging', icon: Scan },
            ].map(t => (
              <div key={t.value}
                className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${type === t.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                onClick={() => setType(t.value)}>
                <t.icon className={`h-5 w-5 mx-auto mb-1 ${type === t.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">{t.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Patient Name *</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Patient ID</Label>
              <Input value={pUpid} onChange={(e) => setPUpid(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="stat">STAT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Items / Tests / Medications *</Label>
            <div className="flex gap-2">
              <Input placeholder="e.g. CBC, Chest X-Ray, Amoxicillin..." value={itemText}
                onChange={(e) => setItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (itemText.trim()) { setItems(prev => [...prev, itemText.trim()]); setItemText(''); }
                  }
                }}
                className="flex-1" />
              <Button type="button" variant="outline" size="sm"
                onClick={() => { if (itemText.trim()) { setItems(prev => [...prev, itemText.trim()]); setItemText(''); } }}>
                Add
              </Button>
            </div>
            {items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {items.map((item, i) => (
                  <Badge key={i} className="gap-1 cursor-pointer" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}>
                    {item} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Clinical Notes</Label>
            <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Clinical indication, relevant history..." rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Create Referral
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
