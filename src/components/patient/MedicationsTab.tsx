import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Plus, Pill, AlertTriangle, Loader2, Edit, XCircle } from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  start_date: string | null;
  end_date: string | null;
  prescribing_doctor: string | null;
  pharmacy: string | null;
  refills_remaining: number;
  notes: string | null;
  status: string;
  created_at: string;
}

export function MedicationsTab({ patientUserId }: { patientUserId: string }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [tab, setTab] = useState('active');

  // Form
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [route, setRoute] = useState('oral');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [doctor, setDoctor] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [refills, setRefills] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchMeds(); }, [patientUserId]);

  const fetchMeds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false });
    if (data) setMedications(data as Medication[]);
    setLoading(false);
  };

  const resetForm = () => {
    setName(''); setDosage(''); setFrequency(''); setRoute('oral'); setStartDate('');
    setEndDate(''); setDoctor(''); setPharmacy(''); setRefills(0); setNotes(''); setEditingMed(null);
  };

  const openEdit = (med: Medication) => {
    setEditingMed(med);
    setName(med.name); setDosage(med.dosage || ''); setFrequency(med.frequency || '');
    setRoute(med.route || 'oral'); setStartDate(med.start_date || ''); setEndDate(med.end_date || '');
    setDoctor(med.prescribing_doctor || ''); setPharmacy(med.pharmacy || '');
    setRefills(med.refills_remaining); setNotes(med.notes || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Medication name is required'); return; }
    setSaving(true);

    const payload = {
      patient_user_id: patientUserId,
      name, dosage: dosage || null, frequency: frequency || null, route,
      start_date: startDate || null, end_date: endDate || null,
      prescribing_doctor: doctor || null, pharmacy: pharmacy || null,
      refills_remaining: refills, notes: notes || null,
    };

    if (editingMed) {
      await supabase.from('patient_medications').update(payload).eq('id', editingMed.id);
      toast.success('Medication updated');
    } else {
      await supabase.from('patient_medications').insert(payload);
      toast.success('Medication added');
    }

    setDialogOpen(false); resetForm(); fetchMeds(); setSaving(false);
  };

  const discontinue = async (id: string) => {
    await supabase.from('patient_medications').update({ status: 'discontinued', end_date: new Date().toISOString().split('T')[0] }).eq('id', id);
    toast.success('Medication discontinued');
    fetchMeds();
  };

  const activeMeds = medications.filter(m => m.status === 'active');
  const pastMeds = medications.filter(m => m.status !== 'active');
  const displayed = tab === 'active' ? activeMeds : pastMeds;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active">Active ({activeMeds.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastMeds.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Medication</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingMed ? 'Edit Medication' : 'Add Medication'}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Metformin" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Dosage</Label><Input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="500mg" /></div>
                <div><Label>Frequency</Label><Input value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="Twice daily" /></div>
              </div>
              <div><Label>Route</Label>
                <Select value={route} onValueChange={setRoute}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oral">Oral</SelectItem>
                    <SelectItem value="topical">Topical</SelectItem>
                    <SelectItem value="injection">Injection</SelectItem>
                    <SelectItem value="inhaled">Inhaled</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Start Date</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div><Label>End Date</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
              </div>
              <div><Label>Prescribing Doctor</Label><Input value={doctor} onChange={e => setDoctor(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Pharmacy</Label><Input value={pharmacy} onChange={e => setPharmacy(e.target.value)} /></div>
                <div><Label>Refills Remaining</Label><Input type="number" min={0} value={refills} onChange={e => setRefills(parseInt(e.target.value) || 0)} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingMed ? 'Update' : 'Add'} Medication
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Pill className="h-12 w-12 mx-auto opacity-50" />
          <p className="font-medium">No {tab} medications</p>
          <p className="text-sm">{tab === 'active' ? 'Add your current medications to keep track' : 'Discontinued medications will appear here'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(med => (
            <Card key={med.id} className="hover:border-primary/30 transition-all">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill className="h-4 w-4 text-primary shrink-0" />
                      <p className="font-semibold">{med.name}</p>
                      {med.dosage && <Badge variant="secondary" className="text-xs">{med.dosage}</Badge>}
                      {med.refills_remaining !== null && med.refills_remaining <= 1 && med.status === 'active' && (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {med.refills_remaining === 0 ? 'No refills' : '1 refill left'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {med.frequency && `${med.frequency} • `}{med.route}
                      {med.prescribing_doctor && ` • Dr. ${med.prescribing_doctor}`}
                    </p>
                    {med.start_date && (
                      <p className="text-xs text-muted-foreground">
                        Started {format(parseISO(med.start_date), 'MMM d, yyyy')}
                        {med.end_date && ` — Ended ${format(parseISO(med.end_date), 'MMM d, yyyy')}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(med)} title="Edit"><Edit className="h-4 w-4" /></Button>
                    {med.status === 'active' && (
                      <Button variant="ghost" size="icon" onClick={() => discontinue(med.id)} title="Discontinue" className="text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
