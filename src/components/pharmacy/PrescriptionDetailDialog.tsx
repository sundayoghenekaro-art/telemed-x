import { useState } from 'react';
import { DrugInfoDialog } from './DrugInfoDialog';
import { format, parseISO } from 'date-fns';
import { Prescription, PrescriptionStatus, PrescriptionItem } from '@/types/dhos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  Pill,
  Zap,
  XCircle,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AllergyAlert } from '@/lib/allergyChecker';
import { AllergyConfirmDialog } from './AllergyConfirmDialog';
import { ControlledSubstanceConfirmDialog } from './ControlledSubstanceConfirmDialog';
import { mockInventory } from '@/data/pharmacyMockData';
import { DrugInteractionPanel } from './DrugInteractionPanel';

const controlledMedIds = new Set(mockInventory.filter(m => m.controlled).map(m => m.id));

interface PrescriptionDetailDialogProps {
  prescription: Prescription | null;
  onClose: () => void;
  canVerify?: boolean;
  canDispense?: boolean;
  onUpdateStatus: (id: string, status: PrescriptionStatus) => void;
  allergyAlerts: AllergyAlert[];
  onAllergyOverride?: (rxId: string, patientName: string, medications: string[], allergies: string[], severity: 'critical' | 'warning', action: 'dispensed') => void;
}

const routeLabels: Record<PrescriptionItem['route'], string> = {
  oral: 'PO (Oral)', iv: 'IV (Intravenous)', im: 'IM (Intramuscular)', sc: 'SC (Subcutaneous)',
  topical: 'Topical', inhalation: 'INH (Inhalation)', rectal: 'PR (Rectal)', ophthalmic: 'Ophthalmic',
};

const interactionColors = {
  minor: 'bg-muted text-muted-foreground',
  moderate: 'bg-warning/10 text-warning border-warning/20',
  major: 'bg-destructive/10 text-destructive border-destructive/20',
  contraindicated: 'bg-destructive text-destructive-foreground',
};

export function PrescriptionDetailDialog({ prescription: rx, onClose, canVerify = false, canDispense = false, onUpdateStatus, allergyAlerts, onAllergyOverride }: PrescriptionDetailDialogProps) {
  const { toast } = useToast();
  const [showAllergyConfirm, setShowAllergyConfirm] = useState(false);
  const [showControlledConfirm, setShowControlledConfirm] = useState(false);
  const [fdaDrug, setFdaDrug] = useState<{ name: string; generic: string } | null>(null);

  if (!rx) return null;

  const rxAllergyAlerts = allergyAlerts.filter(a => a.prescriptionId === rx.id);
  const hasControlled = rx.items.some(i => controlledMedIds.has(i.medicationId));
  const controlledMeds = rx.items.filter(i => controlledMedIds.has(i.medicationId)).map(i => i.medicationName);

  const handleAction = (status: PrescriptionStatus, message: string) => {
    onUpdateStatus(rx.id, status);
    toast({ title: message, description: `${rx.id} for ${rx.patientName}` });
    onClose();
  };

  const handleDispense = () => {
    if (rxAllergyAlerts.length > 0) {
      setShowAllergyConfirm(true);
    } else if (hasControlled) {
      setShowControlledConfirm(true);
    } else {
      handleAction('dispensed', 'Medication Dispensed');
    }
  };

  return (
    <>
    <Dialog open={!!rx} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Prescription {rx.id}
          </DialogTitle>
          <DialogDescription>
            {rx.patientName} · Prescribed by {rx.prescribedBy}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Header Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Patient</p>
                <p className="font-medium flex items-center gap-1"><User className="h-3 w-3" />{rx.patientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Priority</p>
                <Badge className={cn('mt-0.5 text-xs', rx.priority === 'stat' ? 'bg-destructive text-destructive-foreground' : rx.priority === 'urgent' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground')}>
                  {rx.priority === 'stat' && <Zap className="h-3 w-3 mr-1" />}
                  {rx.priority.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Prescribed</p>
                <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(parseISO(rx.prescribedAt), 'MMM d, h:mm a')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant="outline" className="mt-0.5 capitalize">{rx.status}</Badge>
              </div>
            </div>

            {rx.verifiedBy && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 bg-info/5 p-2 rounded">
                <CheckCircle2 className="h-3 w-3 text-info" />
                Verified by {rx.verifiedBy} · {rx.verifiedAt && format(parseISO(rx.verifiedAt), 'MMM d, h:mm a')}
              </div>
            )}
            {rx.dispensedBy && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 bg-success/5 p-2 rounded">
                <Package className="h-3 w-3 text-success" />
                Dispensed by {rx.dispensedBy} · {rx.dispensedAt && format(parseISO(rx.dispensedAt), 'MMM d, h:mm a')}
              </div>
            )}

            {/* Medication Items */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medications ({rx.items.length})
              </h4>
              {rx.items.map((item, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.medicationName}</p>
                      <p className="text-sm text-muted-foreground">{item.dosage} · {item.frequency} · {routeLabels[item.route]}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 h-7 text-primary"
                        onClick={() => setFdaDrug({ name: item.medicationName, generic: item.medicationName.replace(/\s*\d+\s*mg.*$/i, '') })}
                      >
                        <FileText className="h-3 w-3" />FDA
                      </Button>
                      <Badge variant="outline" className="text-xs">{item.duration}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground">Quantity: </span>
                      <span className="font-medium">{item.quantity}</span>
                      {item.dispensedQuantity !== undefined && (
                        <span className="text-success ml-1">({item.dispensedQuantity} dispensed)</span>
                      )}
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground">Route: </span>
                      <span className="font-medium">{routeLabels[item.route]}</span>
                    </div>
                  </div>
                  {item.instructions && (
                    <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                      📋 {item.instructions}
                    </p>
                  )}
                  {/* Drug interactions */}
                  {item.interactions && item.interactions.length > 0 && (
                    <div className="space-y-1">
                      {item.interactions.map((inter, i) => (
                        <div key={i} className={cn('flex items-start gap-2 text-xs p-2 rounded border', interactionColors[inter.severity])}>
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium capitalize">{inter.severity} interaction with {inter.drug}: </span>
                            <span>{inter.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Drug Interaction Check — full panel for pharmacist verification */}
            {rx.items.length >= 2 ? (
              <DrugInteractionPanel
                medications={rx.items.map(i => i.medicationName)}
              />
            ) : rx.items.length === 1 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                Single medication — no drug-drug interaction check required.
              </div>
            )}

            {rx.notes && (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-xs text-warning mb-1">Notes</p>
                <p>{rx.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canVerify && rx.status === 'pending' && (
            <>
              <Button variant="destructive" onClick={() => handleAction('cancelled', 'Prescription Cancelled')} className="gap-1">
                <XCircle className="h-4 w-4" />Cancel
              </Button>
              <Button variant="outline" onClick={() => handleAction('on-hold', 'Prescription On Hold')} className="gap-1">
                <Pause className="h-4 w-4" />Hold
              </Button>
              <Button onClick={() => handleAction('verified', 'Prescription Verified')} className="gap-1">
                <CheckCircle2 className="h-4 w-4" />Verify
              </Button>
            </>
          )}
          {canDispense && rx.status === 'verified' && (
            <Button onClick={handleDispense} className="gap-1">
              <Package className="h-4 w-4" />Dispense
            </Button>
          )}
          {canDispense && rx.status === 'on-hold' && (
            <Button onClick={() => handleAction('pending', 'Prescription Resumed')} className="gap-1">
              <Clock className="h-4 w-4" />Resume
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {showAllergyConfirm && (
      <AllergyConfirmDialog
        open={showAllergyConfirm}
        onOpenChange={setShowAllergyConfirm}
        alerts={rxAllergyAlerts}
        patientName={rx.patientName}
        onConfirm={() => {
          const maxSeverity = rxAllergyAlerts.some(a => a.severity === 'critical') ? 'critical' : 'warning' as const;
          onAllergyOverride?.(
            rx.id,
            rx.patientName,
            rxAllergyAlerts.map(a => a.medication),
            [...new Set(rxAllergyAlerts.map(a => a.allergy))],
            maxSeverity,
            'dispensed'
          );
          setShowAllergyConfirm(false);
          if (hasControlled) {
            setShowControlledConfirm(true);
          } else {
            handleAction('dispensed', 'Medication Dispensed (Override)');
          }
        }}
      />
    )}

    {showControlledConfirm && (
      <ControlledSubstanceConfirmDialog
        open={showControlledConfirm}
        onOpenChange={setShowControlledConfirm}
        patientName={rx.patientName}
        medications={controlledMeds}
        onConfirm={() => {
          setShowControlledConfirm(false);
          handleAction('dispensed', 'Controlled Substance Dispensed');
        }}
      />
    )}

    {fdaDrug && (
      <DrugInfoDialog
        open={!!fdaDrug}
        onOpenChange={(open) => !open && setFdaDrug(null)}
        drugName={fdaDrug.name}
        genericName={fdaDrug.generic}
      />
    )}
    </>
  );
}
