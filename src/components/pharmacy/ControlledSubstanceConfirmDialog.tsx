import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldAlert, Lock } from 'lucide-react';

interface ControlledSubstanceConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  medications: string[];
  onConfirm: () => void;
}

export function ControlledSubstanceConfirmDialog({
  open,
  onOpenChange,
  patientName,
  medications,
  onConfirm,
}: ControlledSubstanceConfirmDialogProps) {
  const [witnessName, setWitnessName] = useState('');
  const [checklist, setChecklist] = useState({
    verifiedIdentity: false,
    verifiedOrder: false,
    countConfirmed: false,
  });

  const allChecked = checklist.verifiedIdentity && checklist.verifiedOrder && checklist.countConfirmed;
  const canConfirm = allChecked && witnessName.trim().length >= 3;

  const handleConfirm = () => {
    onConfirm();
    setWitnessName('');
    setChecklist({ verifiedIdentity: false, verifiedOrder: false, countConfirmed: false });
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setWitnessName('');
      setChecklist({ verifiedIdentity: false, verifiedOrder: false, countConfirmed: false });
    }
    onOpenChange(v);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Controlled Substance Verification
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Double verification is required before dispensing controlled substances.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Patient</p>
            <p className="text-sm font-medium">{patientName}</p>
            <p className="text-xs font-semibold uppercase text-muted-foreground mt-2">Controlled Medication(s)</p>
            <div className="flex flex-wrap gap-1">
              {medications.map(m => (
                <Badge key={m} variant="destructive" className="text-xs">{m}</Badge>
              ))}
            </div>
          </div>

          {/* Verification checklist */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Verification Checklist</p>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checklist.verifiedIdentity}
                onCheckedChange={(v) => setChecklist(prev => ({ ...prev, verifiedIdentity: !!v }))}
              />
              <span className="text-sm">Patient identity verified against prescription</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checklist.verifiedOrder}
                onCheckedChange={(v) => setChecklist(prev => ({ ...prev, verifiedOrder: !!v }))}
              />
              <span className="text-sm">Prescriber authorization and dosage confirmed</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checklist.countConfirmed}
                onCheckedChange={(v) => setChecklist(prev => ({ ...prev, countConfirmed: !!v }))}
              />
              <span className="text-sm">Controlled substance count verified and logged</span>
            </label>
          </div>

          {/* Witness / second verifier */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <Lock className="h-3 w-3" />
              Witness / Second Verifier
            </Label>
            <Input
              placeholder="Enter witness name (e.g. Pharm. Jane Doe)"
              value={witnessName}
              onChange={e => setWitnessName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">A second pharmacist must witness and verify the dispensing.</p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirm Dispensing
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
