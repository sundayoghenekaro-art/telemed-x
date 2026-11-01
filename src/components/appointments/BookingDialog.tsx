import { useState, useMemo } from 'react';
import { format, addDays, addWeeks, addMonths, parseISO, addMinutes, isBefore, isAfter, isEqual } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, User, Stethoscope, Building, Repeat, CalendarDays, AlertTriangle } from 'lucide-react';
import { Patient, Appointment } from '@/types/dhos';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedTime: Date | null;
  patients: Patient[];
  existingAppointments: Appointment[];
  onBook: (appointment: Omit<Appointment, 'id'>) => void;
}

interface ConflictInfo {
  date: Date;
  conflictingAppointment: Appointment;
}

type RecurrencePattern = 'none' | 'weekly' | 'biweekly' | 'monthly';

const recurrenceOptions = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const appointmentTypes = [
  { value: 'new', label: 'New Patient Visit', duration: 45 },
  { value: 'follow-up', label: 'Follow-up Visit', duration: 30 },
  { value: 'consultation', label: 'Consultation', duration: 30 },
  { value: 'procedure', label: 'Procedure', duration: 60 },
];

const departments = [
  'Internal Medicine',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'Neurology',
  'Dermatology',
  'Ophthalmology',
];

const physicians = [
  'Dr. Sarah Chen',
  'Dr. Michael Adebayo',
  'Dr. Fatima Yusuf',
  'Dr. Blessing Okoro',
  'Dr. Ngozi Eze',
];

export function BookingDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedTime,
  patients,
  existingAppointments,
  onBook
}: BookingDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    patientUpid: '',
    type: 'follow-up' as 'new' | 'follow-up' | 'consultation' | 'procedure',
    department: 'Internal Medicine',
    physician: 'Dr. Sarah Chen',
    notes: ''
  });
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);

  // Generate recurring dates based on pattern
  const generateRecurringDates = (startDate: Date, pattern: RecurrencePattern, count: number): Date[] => {
    const dates: Date[] = [startDate];
    
    for (let i = 1; i < count; i++) {
      let nextDate: Date;
      switch (pattern) {
        case 'weekly':
          nextDate = addWeeks(startDate, i);
          break;
        case 'biweekly':
          nextDate = addWeeks(startDate, i * 2);
          break;
        case 'monthly':
          nextDate = addMonths(startDate, i);
          break;
        default:
          nextDate = startDate;
      }
      
      // Check if within end date if specified
      if (recurrenceEndDate && nextDate > recurrenceEndDate) {
        break;
      }
      
      dates.push(nextDate);
    }
    
    return dates;
  };

  // Conflict detection
  const checkConflict = (time: Date, physician: string, duration: number): ConflictInfo | null => {
    const newStart = time;
    const newEnd = addMinutes(time, duration);

    const conflict = existingAppointments.find(apt => {
      if (apt.physician !== physician) return false;
      if (apt.status === 'cancelled' || apt.status === 'no-show') return false;
      const aptStart = parseISO(apt.scheduledTime);
      const aptEnd = addMinutes(aptStart, apt.duration);
      // Overlap: newStart < aptEnd && newEnd > aptStart
      return isBefore(newStart, aptEnd) && isAfter(newEnd, aptStart);
    });

    return conflict ? { date: time, conflictingAppointment: conflict } : null;
  };

  const selectedPatient = patients.find(p => p.upid === formData.patientUpid);
  const appointmentType = appointmentTypes.find(t => t.value === formData.type);
  const currentDuration = appointmentType?.duration || 30;

  const conflicts = useMemo(() => {
    if (!selectedTime) return [];
    
    if (isRecurring && recurrencePattern !== 'none') {
      const dates = generateRecurringDates(selectedTime, recurrencePattern, recurrenceCount);
      return dates
        .map(d => checkConflict(d, formData.physician, currentDuration))
        .filter((c): c is ConflictInfo => c !== null);
    }
    
    const c = checkConflict(selectedTime, formData.physician, currentDuration);
    return c ? [c] : [];
  }, [selectedTime, formData.physician, currentDuration, isRecurring, recurrencePattern, recurrenceCount, existingAppointments, recurrenceEndDate]);

  const hasConflicts = conflicts.length > 0;

  const handleSubmit = () => {
    if (!selectedTime) {
      toast({
        title: "No time selected",
        description: "Please select a time slot for the appointment",
        variant: "destructive"
      });
      return;
    }

    const patientName = isNewPatient 
      ? newPatientName 
      : selectedPatient 
        ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
        : '';

    if (!patientName) {
      toast({
        title: "No patient selected",
        description: "Please select or enter a patient for the appointment",
        variant: "destructive"
      });
      return;
    }

    const appointment: Omit<Appointment, 'id'> = {
      patientUpid: isNewPatient ? `UPID-NEW-${Date.now()}` : formData.patientUpid,
      patientName,
      physician: formData.physician,
      department: formData.department,
      scheduledTime: selectedTime.toISOString(),
      duration: appointmentType?.duration || 30,
      type: formData.type,
      status: 'scheduled',
      notes: formData.notes || undefined
    };

    if (isRecurring && recurrencePattern !== 'none') {
      const recurringDates = generateRecurringDates(selectedTime, recurrencePattern, recurrenceCount);
      const seriesId = `SERIES-${Date.now()}`;
      
      recurringDates.forEach((date, index) => {
        const recurringAppointment: Omit<Appointment, 'id'> = {
          ...appointment,
          scheduledTime: date.toISOString(),
          seriesId,
          notes: appointment.notes 
            ? `${appointment.notes} (Recurring ${index + 1}/${recurringDates.length})`
            : `Recurring appointment ${index + 1}/${recurringDates.length}`
        };
        onBook(recurringAppointment);
      });
      
      toast({
        title: "Recurring Appointments Booked",
        description: `${recurringDates.length} ${recurrencePattern} appointments scheduled for ${patientName}`,
      });
    } else {
      onBook(appointment);
      
      toast({
        title: "Appointment Booked",
        description: `${patientName} scheduled for ${format(selectedTime, 'PPp')}`,
      });
    }
    
    // Reset form
    setFormData({
      patientUpid: '',
      type: 'follow-up',
      department: 'Internal Medicine',
      physician: 'Dr. Sarah Chen',
      notes: ''
    });
    setNewPatientName('');
    setIsNewPatient(false);
    setIsRecurring(false);
    setRecurrencePattern('weekly');
    setRecurrenceCount(4);
    setRecurrenceEndDate(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Book Appointment
          </DialogTitle>
          <DialogDescription>
            {selectedTime 
              ? `Scheduling for ${format(selectedTime, 'EEEE, MMMM d, yyyy')} at ${format(selectedTime, 'h:mm a')}`
              : 'Please select a time slot first'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient
            </Label>
            <div className="flex gap-2">
              <Select
                value={isNewPatient ? 'new' : formData.patientUpid}
                onValueChange={(value) => {
                  if (value === 'new') {
                    setIsNewPatient(true);
                    setFormData(prev => ({ ...prev, patientUpid: '' }));
                  } else {
                    setIsNewPatient(false);
                    setFormData(prev => ({ ...prev, patientUpid: value }));
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ New Patient</SelectItem>
                  {patients.map(patient => (
                    <SelectItem key={patient.upid} value={patient.upid}>
                      {patient.firstName} {patient.lastName}
                      <span className="text-muted-foreground ml-2 text-xs font-mono">
                        {patient.upid.slice(-8)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isNewPatient && (
              <Input
                placeholder="Enter new patient name"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Appointment Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'new' | 'follow-up' | 'consultation' | 'procedure') => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({type.duration} min)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Department
            </Label>
            <Select
              value={formData.department}
              onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Physician */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Physician
            </Label>
            <Select
              value={formData.physician}
              onValueChange={(value) => setFormData(prev => ({ ...prev, physician: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {physicians.map(doc => (
                  <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any relevant notes for this appointment..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="h-20 resize-none"
            />
          </div>

          {/* Recurring Appointment */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Recurring Appointment
              </Label>
              <Switch
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
            
            {isRecurring && (
              <div className="space-y-3 pl-6 animate-fade-in">
                {/* Recurrence Pattern */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Repeat</Label>
                  <Select
                    value={recurrencePattern}
                    onValueChange={(value: RecurrencePattern) => setRecurrencePattern(value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recurrenceOptions.filter(opt => opt.value !== 'none').map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Occurrences */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Occurrences</Label>
                    <Select
                      value={recurrenceCount.toString()}
                      onValueChange={(value) => setRecurrenceCount(parseInt(value))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 8, 10, 12].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} times
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">End By (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-9 w-full justify-start text-left font-normal",
                            !recurrenceEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {recurrenceEndDate ? format(recurrenceEndDate, 'MMM d') : 'No end'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={recurrenceEndDate}
                          onSelect={setRecurrenceEndDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Preview */}
                {selectedTime && (
                  <div className="bg-muted/50 rounded-lg p-3 text-xs">
                    <p className="font-medium text-muted-foreground mb-1">Preview:</p>
                    <p className="text-foreground">
                      {recurrenceCount} appointments, {recurrencePattern}
                      {recurrenceEndDate && ` until ${format(recurrenceEndDate, 'MMM d, yyyy')}`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {generateRecurringDates(selectedTime, recurrencePattern, Math.min(recurrenceCount, 6)).map((date, i) => (
                        <span key={i} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                          {format(date, 'MMM d')}
                        </span>
                      ))}
                      {recurrenceCount > 6 && (
                        <span className="text-muted-foreground">+{recurrenceCount - 6} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {hasConflicts && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Scheduling Conflict Detected</p>
              <ul className="mt-1 space-y-1 text-destructive/80">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    {format(c.date, 'MMM d')} at {format(c.date, 'h:mm a')} — {c.conflictingAppointment.physician} already has "{c.conflictingAppointment.patientName}" ({c.conflictingAppointment.type})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedTime || hasConflicts}>
            {isRecurring ? `Book ${recurrenceCount} Appointments` : 'Book Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
