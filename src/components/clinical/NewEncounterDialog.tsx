import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ClinicalEncounter } from '@/data/clinicalMockData';
import { mockPatients } from '@/data/mockData';
import { EncounterType } from '@/types/dhos';

interface NewEncounterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (encounter: ClinicalEncounter) => void;
}

export function NewEncounterDialog({ open, onOpenChange, onCreated }: NewEncounterDialogProps) {
  const [patientUpid, setPatientUpid] = useState('');
  const [type, setType] = useState<EncounterType>('outpatient');
  const [department, setDepartment] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Vitals
  const [hr, setHr] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [temp, setTemp] = useState('');
  const [rr, setRr] = useState('');
  const [spo2, setSpo2] = useState('');

  const reset = () => {
    setPatientUpid(''); setType('outpatient'); setDepartment(''); setChiefComplaint('');
    setDiagnosis(''); setSubjective(''); setObjective(''); setAssessment(''); setPlan('');
    setHr(''); setBpSys(''); setBpDia(''); setTemp(''); setRr(''); setSpo2('');
  };

  const selectedPatient = mockPatients.find(p => p.upid === patientUpid);

  const handleSubmit = () => {
    if (!patientUpid || !department || !chiefComplaint) {
      toast.error('Please fill in patient, department, and chief complaint.');
      return;
    }

    const now = new Date().toISOString();
    const id = `ENC-${String(Date.now()).slice(-6)}`;
    const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Unknown';

    const encounter: ClinicalEncounter = {
      id,
      patientUpid,
      patientName,
      type,
      status: 'in-progress',
      startTime: now,
      chiefComplaint,
      diagnosis: diagnosis ? diagnosis.split(',').map(d => d.trim()).filter(Boolean) : [],
      attendingPhysician: 'Dr. Sarah Chen',
      department,
      vitalsAtEncounter: (hr || bpSys || temp) ? {
        timestamp: now,
        heartRate: hr ? Number(hr) : undefined,
        bloodPressureSystolic: bpSys ? Number(bpSys) : undefined,
        bloodPressureDiastolic: bpDia ? Number(bpDia) : undefined,
        temperature: temp ? Number(temp) : undefined,
        respiratoryRate: rr ? Number(rr) : undefined,
        oxygenSaturation: spo2 ? Number(spo2) : undefined,
      } : undefined,
      soap: (subjective || objective || assessment || plan) ? {
        encounterId: id,
        subjective,
        objective,
        assessment,
        plan,
      } : undefined,
    };

    onCreated(encounter);
    toast.success(`Encounter ${id} created for ${patientName}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            New Encounter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Patient & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Encounter Type</Label>
              <Select value={type} onValueChange={v => setType(v as EncounterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outpatient">Outpatient</SelectItem>
                  <SelectItem value="inpatient">Inpatient</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="telehealth">Telehealth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department *</Label>
              <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Internal Medicine" />
            </div>
            <div className="space-y-2">
              <Label>Diagnosis (comma-separated)</Label>
              <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. J06.9 — Upper RTI" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chief Complaint *</Label>
            <Textarea value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} placeholder="Presenting complaint..." rows={2} />
          </div>

          {/* Vitals */}
          <Separator />
          <p className="text-xs font-semibold uppercase text-muted-foreground">Vitals at Encounter</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">HR (bpm)</Label>
              <Input value={hr} onChange={e => setHr(e.target.value)} type="number" placeholder="72" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">BP Sys</Label>
              <Input value={bpSys} onChange={e => setBpSys(e.target.value)} type="number" placeholder="120" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">BP Dia</Label>
              <Input value={bpDia} onChange={e => setBpDia(e.target.value)} type="number" placeholder="80" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Temp (°C)</Label>
              <Input value={temp} onChange={e => setTemp(e.target.value)} type="number" step="0.1" placeholder="36.8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">RR (/min)</Label>
              <Input value={rr} onChange={e => setRr(e.target.value)} type="number" placeholder="16" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SpO₂ (%)</Label>
              <Input value={spo2} onChange={e => setSpo2(e.target.value)} type="number" placeholder="98" />
            </div>
          </div>

          {/* SOAP Note */}
          <Separator />
          <p className="text-xs font-semibold uppercase text-muted-foreground">SOAP Note</p>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">S</div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Subjective</Label>
                <Textarea value={subjective} onChange={e => setSubjective(e.target.value)} placeholder="Patient's history in their own words..." rows={2} />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">O</div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Objective</Label>
                <Textarea value={objective} onChange={e => setObjective(e.target.value)} placeholder="Examination findings, test results..." rows={2} />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">A</div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Assessment</Label>
                <Textarea value={assessment} onChange={e => setAssessment(e.target.value)} placeholder="Clinical assessment and differential diagnosis..." rows={2} />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">P</div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Plan</Label>
                <Textarea value={plan} onChange={e => setPlan(e.target.value)} placeholder="Treatment plan, follow-up, referrals..." rows={2} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Encounter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
