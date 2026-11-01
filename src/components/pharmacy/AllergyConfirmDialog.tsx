import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShieldAlert, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AllergyAlert } from '@/lib/allergyChecker';
import { useState } from 'react';

interface AllergyConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: AllergyAlert[];
  patientName: string;
  onConfirm: () => void;
}

export function AllergyConfirmDialog({ open, onOpenChange, alerts, patientName, onConfirm }: AllergyConfirmDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const hasCritical = alerts.some(a => a.severity === 'critical');

  const handleConfirm = () => {
    setAcknowledged(false);
    onConfirm();
  };

  const handleCancel = () => {
    setAcknowledged(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Drug-Allergy Safety Warning
          </AlertDialogTitle>
          <AlertDialogDescription>
            The following allergy conflicts were detected for <strong className="text-foreground">{patientName}</strong>. Review carefully before dispensing.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 my-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border text-sm",
                alert.severity === 'critical'
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-warning/10 border-warning/30"
              )}
            >
              {alert.severity === 'critical' ? (
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{alert.medication}</span>
                  <Badge className={cn("text-xs",
                    alert.severity === 'critical'
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-warning text-warning-foreground"
                  )}>
                    {alert.severity === 'critical' ? 'CONTRAINDICATED' : 'CROSS-REACTIVITY'}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
          <Checkbox
            id="ack-allergy"
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="ack-allergy" className="text-xs leading-relaxed cursor-pointer">
            I have reviewed the allergy conflicts above and confirm that the clinical benefit outweighs the risk. I accept responsibility for this dispensing decision.
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel Dispensing</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!acknowledged}
            className={cn("gap-1", hasCritical ? "bg-destructive hover:bg-destructive/90" : "bg-warning hover:bg-warning/90 text-warning-foreground")}
          >
            <ShieldAlert className="h-4 w-4" />
            Override & Dispense
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
