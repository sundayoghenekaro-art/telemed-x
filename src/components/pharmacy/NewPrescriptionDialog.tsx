import { useState } from 'react';
import { Prescription, PrescriptionStatus } from '@/types/dhos';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pill, User, AlertTriangle, Zap, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { Patient, PrescriptionItem } from '@/types/dhos';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { mockInventory } from '@/data/pharmacyMockData';
import { ALLERGY_DRUG_MAP, CROSS_REACTIVITY, AllergyAlert } from '@/lib/allergyChecker';
import { AllergyConfirmDialog } from './AllergyConfirmDialog';
import { DrugInteractionPanel } from './DrugInteractionPanel';

interface NewPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  onCreatePrescription: (rx: Omit<Prescription, 'id' | 'prescribedAt'>) => void;
  onAllergyOverride?: (rxId: string, patientName: string, medications: string[], allergies: string[], severity: 'critical' | 'warning', action: 'prescribed') => void;
}

const routeOptions: { value: PrescriptionItem['route']; label: string }[] = [
  { value: 'oral', label: 'PO (Oral)' },
  { value: 'iv', label: 'IV (Intravenous)' },
  { value: 'im', label: 'IM (Intramuscular)' },
  { value: 'sc', label: 'SC (Subcutaneous)' },
  { value: 'topical', label: 'Topical' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'rectal', label: 'PR (Rectal)' },
  { value: 'ophthalmic', label: 'Ophthalmic' },
];

const frequencyOptions = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
  'Once weekly', 'As needed (PRN)', 'At bedtime', 'Before meals',
];

interface MedItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: PrescriptionItem['route'];
  duration: string;
  quantity: number;
  instructions: string;
}

const emptyItem: MedItem = {
  medicationId: '', medicationName: '', dosage: '', frequency: 'Once daily',
  route: 'oral', duration: '7 days', quantity: 0, instructions: '',
};

function checkMedAllergyConflict(medName: string, allergies: string[]): { severity: 'critical' | 'warning'; message: string } | null {
  const medLower = medName.toLowerCase();
  for (const allergy of allergies) {
    const allergyLower = allergy.toLowerCase();
    const directDrugs = ALLERGY_DRUG_MAP[allergyLower];
    if (directDrugs?.some(drug => medLower.includes(drug))) {
      return { severity: 'critical', message: `Contraindicated — patient has ${allergy} allergy` };
    }
    const crossReact = CROSS_REACTIVITY[allergyLower];
    if (crossReact?.drugs.some(drug => medLower.includes(drug))) {
      return { severity: 'warning', message: `May cross-react with ${allergy} allergy` };
    }
  }
  return null;
}

export function NewPrescriptionDialog({ open, onOpenChange, patients, onCreatePrescription, onAllergyOverride }: NewPrescriptionDialogProps) {
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [priority, setPriority] = useState<Prescription['priority']>('routine');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<MedItem[]>([{ ...emptyItem }]);
  const [showAllergyConfirm, setShowAllergyConfirm] = useState(false);

  const patient = patients.find(p => p.upid === selectedPatient);
  const patientAllergies = patient?.allergies || [];

  // Collect all active allergy conflicts for current items
  const activeAllergyAlerts: AllergyAlert[] = items
    .filter(i => i.medicationName && patientAllergies.length > 0)
    .map(i => {
      const conflict = checkMedAllergyConflict(i.medicationName, patientAllergies);
      if (!conflict) return null;
      const matchedAllergy = patientAllergies.find(a => {
        const aLower = a.toLowerCase();
        const medLower = i.medicationName.toLowerCase();
        return ALLERGY_DRUG_MAP[aLower]?.some(d => medLower.includes(d)) ||
               CROSS_REACTIVITY[aLower]?.drugs.some(d => medLower.includes(d));
      }) || '';
      return {
        prescriptionId: 'new',
        patientName: `${patient?.firstName} ${patient?.lastName}`,
        medication: i.medicationName,
        allergy: matchedAllergy,
        severity: conflict.severity,
        message: conflict.message,
      } as AllergyAlert;
    })
    .filter(Boolean) as AllergyAlert[];

  const updateItem = (index: number, field: keyof MedItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const selectMedication = (index: number, medId: string) => {
    const med = mockInventory.find(m => m.id === medId);
    if (med) {
      setItems(prev => prev.map((item, i) => i === index
        ? { ...item, medicationId: med.id, medicationName: med.name, dosage: med.name.match(/\d+\s*m?g/i)?.[0] || '' }
        : item
      ));
    }
  };

  const addItem = () => setItems(prev => [...prev, { ...emptyItem }]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const validateAndGetRx = (): Omit<Prescription, 'id' | 'prescribedAt'> | null => {
    if (!selectedPatient) {
      toast({ title: 'No patient selected', description: 'Please select a patient', variant: 'destructive' });
      return null;
    }
    const validItems = items.filter(i => i.medicationId && i.dosage && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: 'No medications added', description: 'Add at least one medication with dosage and quantity', variant: 'destructive' });
      return null;
    }
    const pt = patients.find(p => p.upid === selectedPatient);
    return {
      patientUpid: selectedPatient,
      patientName: `${pt?.firstName} ${pt?.lastName}`,
      prescribedBy: 'Dr. Sarah Chen',
      status: 'pending',
      priority,
      items: validItems.map(i => ({
        medicationId: i.medicationId,
        medicationName: i.medicationName,
        dosage: i.dosage,
        frequency: i.frequency,
        route: i.route,
        duration: i.duration,
        quantity: i.quantity,
        instructions: i.instructions || undefined,
      })),
      notes: notes || undefined,
    };
  };

  const submitPrescription = () => {
    const rx = validateAndGetRx();
    if (!rx) return;

    // Log allergy override if there are active alerts
    if (activeAllergyAlerts.length > 0) {
      const maxSeverity = activeAllergyAlerts.some(a => a.severity === 'critical') ? 'critical' : 'warning' as const;
      onAllergyOverride?.(
        'new-rx',
        rx.patientName,
        activeAllergyAlerts.map(a => a.medication),
        [...new Set(activeAllergyAlerts.map(a => a.allergy))],
        maxSeverity,
        'prescribed'
      );
    }

    onCreatePrescription(rx);
    toast({ title: 'Prescription Created', description: `${rx.items.length} medication(s) prescribed for ${rx.patientName}` });
    setSelectedPatient('');
    setPriority('routine');
    setNotes('');
    setItems([{ ...emptyItem }]);
    setShowAllergyConfirm(false);
    onOpenChange(false);
  };

  const handleSubmit = () => {
    const rx = validateAndGetRx();
    if (!rx) return;
    if (activeAllergyAlerts.length > 0) {
      setShowAllergyConfirm(true);
    } else {
      submitPrescription();
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            New Prescription
          </DialogTitle>
          <DialogDescription>Create an e-prescription for a patient</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            {/* Patient & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><User className="h-4 w-4" />Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.upid} value={p.upid}>
                        {p.firstName} {p.lastName}
                        {p.allergies.length > 0 && <span className="text-destructive ml-2 text-xs">⚠ Allergies</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPatient && (() => {
                  const pt = patients.find(p => p.upid === selectedPatient);
                  return pt && pt.allergies.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-destructive bg-destructive/5 p-2 rounded">
                      <AlertTriangle className="h-3 w-3" />
                      Allergies: {pt.allergies.join(', ')}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v: Prescription['priority']) => setPriority(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent"><span className="flex items-center gap-2"><AlertTriangle className="h-3 w-3 text-warning" />Urgent</span></SelectItem>
                    <SelectItem value="stat"><span className="flex items-center gap-2"><Zap className="h-3 w-3 text-destructive" />STAT</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Medication Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Medications</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" />Add Medication
                </Button>
              </div>
              {items.map((item, idx) => {
                const allergyConflict = item.medicationName && patientAllergies.length > 0
                  ? checkMedAllergyConflict(item.medicationName, patientAllergies)
                  : null;
                return (
                <div key={idx} className={cn("border rounded-lg p-3 space-y-3", allergyConflict?.severity === 'critical' ? 'border-destructive bg-destructive/5' : allergyConflict?.severity === 'warning' ? 'border-yellow-500 bg-yellow-500/5' : 'border-border')}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Item {idx + 1}</span>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {allergyConflict && (
                    <div className={cn("flex items-center gap-2 text-xs p-2 rounded font-medium",
                      allergyConflict.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                    )}>
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>{allergyConflict.severity === 'critical' ? '⛔' : '⚠️'} {allergyConflict.message}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Medication</Label>
                      <Select value={item.medicationId} onValueChange={v => selectMedication(idx, v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select medication" /></SelectTrigger>
                        <SelectContent>
                          {mockInventory.filter(m => m.stockQuantity > 0).map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              <div className="flex items-center gap-2">
                                {m.name}
                                <span className="text-xs text-muted-foreground">({m.stockQuantity} in stock)</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Dosage</Label>
                      <Input value={item.dosage} onChange={e => updateItem(idx, 'dosage', e.target.value)} placeholder="e.g. 500mg" className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Frequency</Label>
                      <Select value={item.frequency} onValueChange={v => updateItem(idx, 'frequency', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {frequencyOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Route</Label>
                      <Select value={item.route} onValueChange={v => updateItem(idx, 'route', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {routeOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Duration</Label>
                      <Input value={item.duration} onChange={e => updateItem(idx, 'duration', e.target.value)} placeholder="e.g. 7 days" className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="h-9" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Instructions</Label>
                      <Input value={item.instructions} onChange={e => updateItem(idx, 'instructions', e.target.value)} placeholder="Special instructions..." className="h-9" />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Drug Interaction Check */}
            {items.filter(i => i.medicationName).length >= 2 && (
              <DrugInteractionPanel
                medications={items.filter(i => i.medicationName).map(i => i.medicationName)}
                compact
              />
            )}

            <div className="space-y-2">
              <Label>Clinical Notes (optional)</Label>
              <Textarea placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} className="h-16 resize-none" />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedPatient || items.every(i => !i.medicationId)}>
            Create Prescription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AllergyConfirmDialog
      open={showAllergyConfirm}
      onOpenChange={setShowAllergyConfirm}
      alerts={activeAllergyAlerts}
      patientName={`${patient?.firstName} ${patient?.lastName}`}
      onConfirm={submitPrescription}
    />
    </>
  );
}
