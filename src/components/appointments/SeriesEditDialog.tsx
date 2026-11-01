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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Appointment } from '@/types/dhos';
import { format, parseISO } from 'date-fns';
import { Calendar, Stethoscope, Building, Clock, Repeat, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SeriesEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesAppointments: Appointment[];
  onUpdateSeries: (seriesId: string, updates: Partial<Pick<Appointment, 'physician' | 'department' | 'type' | 'duration'>>) => void;
  onCancelSeries: (seriesId: string) => void;
}

const appointmentTypes = [
  { value: 'new', label: 'New Patient Visit', duration: 45 },
  { value: 'follow-up', label: 'Follow-up Visit', duration: 30 },
  { value: 'consultation', label: 'Consultation', duration: 30 },
  { value: 'procedure', label: 'Procedure', duration: 60 },
];

const departments = [
  'Internal Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics',
  'Obstetrics & Gynecology', 'Neurology', 'Dermatology', 'Ophthalmology',
];

const physicians = [
  'Dr. Sarah Chen', 'Dr. Michael Adebayo', 'Dr. Fatima Yusuf',
  'Dr. Blessing Okoro', 'Dr. Ngozi Eze',
];

export function SeriesEditDialog({
  open,
  onOpenChange,
  seriesAppointments,
  onUpdateSeries,
  onCancelSeries,
}: SeriesEditDialogProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [editData, setEditData] = useState({
    physician: '',
    department: '',
    type: '' as string,
  });

  const sorted = [...seriesAppointments].sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  );

  const first = sorted[0];

  // Sync edit data when series changes
  const firstId = first?.id;
  if (first && editData.physician === '' && editData.department === '') {
    setEditData({
      physician: first.physician,
      department: first.department,
      type: first.type,
    });
  }

  if (!first) return null;

  const seriesId = first.seriesId!;
  const upcoming = sorted.filter(a => a.status === 'scheduled' || a.status === 'checked-in');
  const past = sorted.filter(a => a.status === 'completed' || a.status === 'in-progress');
  const cancelled = sorted.filter(a => a.status === 'cancelled' || a.status === 'no-show');

  const hasChanges =
    editData.physician !== first.physician ||
    editData.department !== first.department ||
    editData.type !== first.type;

  const handleSave = () => {
    const typeInfo = appointmentTypes.find(t => t.value === editData.type);
    onUpdateSeries(seriesId, {
      physician: editData.physician,
      department: editData.department,
      type: editData.type as Appointment['type'],
      duration: typeInfo?.duration,
    });
    onOpenChange(false);
  };

  const handleCancelSeries = () => {
    onCancelSeries(seriesId);
    setShowCancelConfirm(false);
    onOpenChange(false);
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-primary/10 text-primary';
      case 'completed': return 'bg-success/10 text-success';
      case 'in-progress': return 'bg-warning/10 text-warning';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      case 'no-show': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Manage Recurring Series
            </DialogTitle>
            <DialogDescription>
              {sorted.length} appointments for {first.patientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Series Overview */}
            <div className="flex gap-3 text-sm">
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {upcoming.length} upcoming
              </Badge>
              <Badge variant="outline" className="gap-1 bg-success/5">
                {past.length} completed
              </Badge>
              {cancelled.length > 0 && (
                <Badge variant="outline" className="gap-1 bg-muted">
                  {cancelled.length} cancelled
                </Badge>
              )}
            </div>

            {/* Appointment List */}
            <ScrollArea className="h-[140px] border border-border rounded-lg">
              <div className="divide-y divide-border">
                {sorted.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{format(parseISO(apt.scheduledTime), 'EEE, MMM d, yyyy')} at {format(parseISO(apt.scheduledTime), 'h:mm a')}</span>
                    </div>
                    <Badge variant="outline" className={cn("text-xs capitalize", getStatusColor(apt.status))}>
                      {apt.status.replace('-', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Edit Fields — apply to upcoming only */}
            {upcoming.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium">
                  Edit all {upcoming.length} upcoming appointments:
                </p>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5" />
                    Appointment Type
                  </Label>
                  <Select value={editData.type} onValueChange={(v) => setEditData(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {appointmentTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label} ({t.duration} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Building className="h-3.5 w-3.5" />
                    Department
                  </Label>
                  <Select value={editData.department} onValueChange={(v) => setEditData(prev => ({ ...prev, department: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Stethoscope className="h-3.5 w-3.5" />
                    Physician
                  </Label>
                  <Select value={editData.physician} onValueChange={(v) => setEditData(prev => ({ ...prev, physician: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {physicians.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {upcoming.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowCancelConfirm(true)}
                className="gap-2 sm:mr-auto"
              >
                <XCircle className="h-4 w-4" />
                Cancel All Upcoming
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {hasChanges && upcoming.length > 0 && (
              <Button onClick={handleSave}>
                Update {upcoming.length} Appointments
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Recurring Series?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel {upcoming.length} upcoming appointment{upcoming.length !== 1 ? 's' : ''} for{' '}
              <span className="font-medium text-foreground">{first.patientName}</span>.
              Completed appointments will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointments</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSeries} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel All Upcoming
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
