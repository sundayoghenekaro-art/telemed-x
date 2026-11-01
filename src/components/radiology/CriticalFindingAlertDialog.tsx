import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Phone, Clock, Send } from 'lucide-react';
import { RadiologyReport } from '@/types/dhos';
import { format } from 'date-fns';

export interface CriticalFindingNotification {
  id: string;
  reportId: string;
  studyId: string;
  patientName: string;
  modality: string;
  bodyPart: string;
  finding: string;
  radiologist: string;
  referringPhysician: string;
  communicationMethod: 'phone' | 'page' | 'secure-message' | 'in-person';
  communicatedAt: string;
  communicatedTo: string;
  readBackConfirmed: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  notes?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: RadiologyReport | null;
  onSubmit: (notification: Omit<CriticalFindingNotification, 'id' | 'acknowledgedAt' | 'acknowledgedBy'>) => void;
}

const referringPhysicians = [
  'Dr. Adebayo Ogundimu',
  'Dr. Fatima Yusuf',
  'Dr. Chinedu Eze',
  'Dr. Ngozi Okoro',
  'Dr. Ibrahim Musa',
];

export function CriticalFindingAlertDialog({ open, onOpenChange, report, onSubmit }: Props) {
  const [communicatedTo, setCommunicatedTo] = useState('');
  const [referringPhysician, setReferringPhysician] = useState('');
  const [method, setMethod] = useState<CriticalFindingNotification['communicationMethod']>('phone');
  const [readBack, setReadBack] = useState(false);
  const [notes, setNotes] = useState('');

  if (!report) return null;

  const handleSubmit = () => {
    if (!communicatedTo.trim() || !referringPhysician) return;

    onSubmit({
      reportId: report.id,
      studyId: report.studyId,
      patientName: report.patientName,
      modality: report.modality,
      bodyPart: report.bodyPart,
      finding: report.impression,
      radiologist: report.radiologist,
      referringPhysician,
      communicationMethod: method,
      communicatedAt: new Date().toISOString(),
      communicatedTo: communicatedTo.trim(),
      readBackConfirmed: readBack,
      notes: notes.trim() || undefined,
    });

    // Reset
    setCommunicatedTo('');
    setReferringPhysician('');
    setMethod('phone');
    setReadBack(false);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-destructive">Critical Finding Alert</DialogTitle>
              <DialogDescription>
                Document communication to the referring physician
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Finding Summary */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{report.patientName}</span>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                CRITICAL
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {report.modality} — {report.bodyPart}
            </p>
            <p className="text-sm font-medium mt-1">{report.impression}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              {format(new Date(), 'MMM d, yyyy HH:mm')}
            </div>
          </div>

          {/* Referring Physician */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Referring Physician *</Label>
            <Select value={referringPhysician} onValueChange={setReferringPhysician}>
              <SelectTrigger><SelectValue placeholder="Select physician" /></SelectTrigger>
              <SelectContent>
                {referringPhysicians.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Communication Method */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Communication Method *</Label>
            <Select value={method} onValueChange={v => setMethod(v as typeof method)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">📞 Phone Call</SelectItem>
                <SelectItem value="page">📟 Page</SelectItem>
                <SelectItem value="secure-message">💬 Secure Message</SelectItem>
                <SelectItem value="in-person">🏥 In Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Communicated To */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Person Contacted *</Label>
            <Input
              value={communicatedTo}
              onChange={e => setCommunicatedTo(e.target.value)}
              placeholder="Name of person who received the notification"
            />
          </div>

          {/* Read-back Confirmation */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={readBack}
              onChange={e => setReadBack(e.target.checked)}
              className="rounded"
            />
            <span className="font-medium">Read-back confirmed</span>
            <span className="text-muted-foreground text-xs">(Physician verbally confirmed finding)</span>
          </label>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional communication details..."
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="gap-1.5 bg-destructive hover:bg-destructive/90"
            onClick={handleSubmit}
            disabled={!communicatedTo.trim() || !referringPhysician}
          >
            <Send className="h-4 w-4" /> Log Communication
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
