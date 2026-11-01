import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Clock, User, Stethoscope, AlertTriangle, CheckCircle2, Activity, Plus, Pencil, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClinicalEncounter, SOAPNote } from '@/data/clinicalMockData';
import { NewEncounterDialog } from './NewEncounterDialog';
import { toast } from 'sonner';

interface EncountersListProps {
  encounters: ClinicalEncounter[];
}

const statusConfig = {
  'in-progress': { label: 'In Progress', color: 'bg-info text-info-foreground', icon: Activity },
  'completed': { label: 'Completed', color: 'bg-success text-success-foreground', icon: CheckCircle2 },
  'cancelled': { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: AlertTriangle },
};

const typeConfig = {
  outpatient: { label: 'OPD', color: 'bg-primary/10 text-primary border-primary/20' },
  inpatient: { label: 'IPD', color: 'bg-info/10 text-info border-info/20' },
  emergency: { label: 'ER', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  telehealth: { label: 'Tele', color: 'bg-accent text-accent-foreground border-accent/20' },
};

export function EncountersList({ encounters }: EncountersListProps) {
  const [selected, setSelected] = useState<ClinicalEncounter | null>(null);
  const [localEncounters, setLocalEncounters] = useState<ClinicalEncounter[]>(encounters);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [editChiefComplaint, setEditChiefComplaint] = useState('');
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editSubjective, setEditSubjective] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editAssessment, setEditAssessment] = useState('');
  const [editPlan, setEditPlan] = useState('');

  const handleCreated = (enc: ClinicalEncounter) => {
    setLocalEncounters(prev => [enc, ...prev]);
  };

  const handleSelect = (enc: ClinicalEncounter) => {
    // Find the latest version from localEncounters
    const latest = localEncounters.find(e => e.id === enc.id) || enc;
    setSelected(latest);
    setEditing(false);
  };

  const startEditing = () => {
    if (!selected) return;
    setEditChiefComplaint(selected.chiefComplaint || '');
    setEditDiagnosis((selected.diagnosis || []).join(', '));
    setEditSubjective(selected.soap?.subjective || '');
    setEditObjective(selected.soap?.objective || '');
    setEditAssessment(selected.soap?.assessment || '');
    setEditPlan(selected.soap?.plan || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const saveEdits = () => {
    if (!selected) return;

    const updatedEncounter: ClinicalEncounter = {
      ...selected,
      chiefComplaint: editChiefComplaint || undefined,
      diagnosis: editDiagnosis ? editDiagnosis.split(',').map(d => d.trim()).filter(Boolean) : undefined,
      soap: {
        encounterId: selected.id,
        subjective: editSubjective,
        objective: editObjective,
        assessment: editAssessment,
        plan: editPlan,
      },
    };

    setLocalEncounters(prev =>
      prev.map(e => (e.id === selected.id ? updatedEncounter : e))
    );
    setSelected(updatedEncounter);
    setEditing(false);
    toast.success(`Encounter ${selected.id} updated`);
  };

  const sorted = [...localEncounters].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  const active = sorted.filter(e => e.status === 'in-progress');

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Encounter
          </Button>
        </div>

        {/* Active Encounters */}
        {active.length > 0 && (
          <Card className="border-info/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-info animate-pulse" />
                Active Encounters — {active.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {active.map(enc => (
                  <EncounterCard key={enc.id} encounter={enc} onSelect={handleSelect} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Encounters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Encounters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {sorted.map(enc => (
                  <EncounterCard key={enc.id} encounter={enc} onSelect={handleSelect} compact />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <NewEncounterDialog open={showNew} onOpenChange={setShowNew} onCreated={handleCreated} />

      {/* Encounter Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setEditing(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Encounter — {selected.patientName}
                  </DialogTitle>
                  {!editing ? (
                    <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={cancelEditing} className="gap-1.5">
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveEdits} className="gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Header Info */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={typeConfig[selected.type].color}>{typeConfig[selected.type].label}</Badge>
                  <Badge className={statusConfig[selected.status].color}>{statusConfig[selected.status].label}</Badge>
                  <Badge variant="outline" className="font-mono text-xs">{selected.id}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{selected.attendingPhysician}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(selected.startTime), 'MMM d, h:mm a')}</span>
                  </div>
                </div>

                {/* Chief Complaint */}
                {editing ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Chief Complaint</Label>
                    <Input value={editChiefComplaint} onChange={e => setEditChiefComplaint(e.target.value)} />
                  </div>
                ) : (
                  selected.chiefComplaint && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Chief Complaint</p>
                      <p className="text-sm">{selected.chiefComplaint}</p>
                    </div>
                  )
                )}

                {/* Diagnosis */}
                {editing ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Diagnosis (comma-separated)</Label>
                    <Input value={editDiagnosis} onChange={e => setEditDiagnosis(e.target.value)} placeholder="ICD code — Description, ..." />
                  </div>
                ) : (
                  selected.diagnosis && selected.diagnosis.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Diagnosis</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.diagnosis.map(d => (
                          <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  )
                )}

                {/* Vitals at Encounter (read-only always) */}
                {selected.vitalsAtEncounter && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Vitals at Encounter</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {selected.vitalsAtEncounter.heartRate && <VitalBadge label="HR" value={`${selected.vitalsAtEncounter.heartRate}`} unit="bpm" />}
                        {selected.vitalsAtEncounter.bloodPressureSystolic && <VitalBadge label="BP" value={`${selected.vitalsAtEncounter.bloodPressureSystolic}/${selected.vitalsAtEncounter.bloodPressureDiastolic}`} unit="mmHg" />}
                        {selected.vitalsAtEncounter.temperature && <VitalBadge label="Temp" value={`${selected.vitalsAtEncounter.temperature}`} unit="°C" />}
                        {selected.vitalsAtEncounter.oxygenSaturation && <VitalBadge label="SpO₂" value={`${selected.vitalsAtEncounter.oxygenSaturation}`} unit="%" />}
                        {selected.vitalsAtEncounter.respiratoryRate && <VitalBadge label="RR" value={`${selected.vitalsAtEncounter.respiratoryRate}`} unit="/min" />}
                        {selected.vitalsAtEncounter.painLevel !== undefined && <VitalBadge label="Pain" value={`${selected.vitalsAtEncounter.painLevel}`} unit="/10" />}
                      </div>
                    </div>
                  </>
                )}

                {/* SOAP Note */}
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">SOAP Note</p>
                  {editing ? (
                    <>
                      <EditableSOAPField label="S" title="Subjective" value={editSubjective} onChange={setEditSubjective} />
                      <EditableSOAPField label="O" title="Objective" value={editObjective} onChange={setEditObjective} />
                      <EditableSOAPField label="A" title="Assessment" value={editAssessment} onChange={setEditAssessment} />
                      <EditableSOAPField label="P" title="Plan" value={editPlan} onChange={setEditPlan} />
                    </>
                  ) : selected.soap ? (
                    <>
                      <SOAPSection label="S" title="Subjective" content={selected.soap.subjective} />
                      <SOAPSection label="O" title="Objective" content={selected.soap.objective} />
                      <SOAPSection label="A" title="Assessment" content={selected.soap.assessment} />
                      <SOAPSection label="P" title="Plan" content={selected.soap.plan} />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No SOAP note recorded. Click Edit to add one.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EncounterCard({ encounter, onSelect, compact }: { encounter: ClinicalEncounter; onSelect: (e: ClinicalEncounter) => void; compact?: boolean }) {
  const cfg = statusConfig[encounter.status];
  const tCfg = typeConfig[encounter.type];
  return (
    <button
      onClick={() => onSelect(encounter)}
      className={cn(
        "w-full text-left border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors",
        encounter.status === 'in-progress' && "border-info/30 bg-info/5",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", tCfg.color)}>{tCfg.label}</Badge>
          <Badge className={cn("text-xs", cfg.color)}>{cfg.label}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{format(new Date(encounter.startTime), 'h:mm a')}</span>
      </div>
      <div>
        <p className="font-medium text-sm">{encounter.patientName}</p>
        {encounter.chiefComplaint && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{encounter.chiefComplaint}</p>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{encounter.attendingPhysician}</span>
        <span>{encounter.department}</span>
      </div>
    </button>
  );
}

function SOAPSection({ label, title, content }: { label: string; title: string; content: string }) {
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">{label}</div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
        <p className="text-sm whitespace-pre-line">{content}</p>
      </div>
    </div>
  );
}

function EditableSOAPField({ label, title, value, onChange }: { label: string; title: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">{label}</div>
      <div className="flex-1 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">{title}</p>
        <Textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="text-sm" placeholder={`Enter ${title.toLowerCase()}...`} />
      </div>
    </div>
  );
}

function VitalBadge({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
    </div>
  );
}
