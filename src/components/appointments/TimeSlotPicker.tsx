import { format, parseISO, isSameDay, addMinutes, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/dhos';
import { Clock, User, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimeSlot {
  time: Date;
  available: boolean;
  appointment?: Appointment;
}

interface TimeSlotPickerProps {
  selectedDate: Date;
  appointments: Appointment[];
  selectedSlot: Date | null;
  onSelectSlot: (slot: Date) => void;
  workingHours?: { start: number; end: number };
  slotDuration?: number; // minutes
}

export function TimeSlotPicker({
  selectedDate,
  appointments,
  selectedSlot,
  onSelectSlot,
  workingHours = { start: 8, end: 18 },
  slotDuration = 30
}: TimeSlotPickerProps) {
  // Generate time slots for the selected date
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startTime = setMinutes(setHours(selectedDate, workingHours.start), 0);
    const endTime = setMinutes(setHours(selectedDate, workingHours.end), 0);
    
    let currentTime = startTime;
    
    while (currentTime < endTime) {
      const slotAppointment = appointments.find(apt => {
        const aptTime = parseISO(apt.scheduledTime);
        return isSameDay(aptTime, selectedDate) && 
               format(aptTime, 'HH:mm') === format(currentTime, 'HH:mm');
      });
      
      slots.push({
        time: new Date(currentTime),
        available: !slotAppointment || slotAppointment.status === 'cancelled',
        appointment: slotAppointment
      });
      
      currentTime = addMinutes(currentTime, slotDuration);
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const morningSlots = timeSlots.filter(s => s.time.getHours() < 12);
  const afternoonSlots = timeSlots.filter(s => s.time.getHours() >= 12);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case 'cancelled':
      case 'no-show':
        return <XCircle className="h-3 w-3 text-destructive" />;
      case 'in-progress':
        return <AlertCircle className="h-3 w-3 text-warning" />;
      default:
        return null;
    }
  };

  const getStatusColor = (slot: TimeSlot) => {
    if (!slot.appointment) return '';
    switch (slot.appointment.status) {
      case 'completed':
        return 'bg-success/10 border-success/20 text-success';
      case 'cancelled':
      case 'no-show':
        return 'bg-destructive/10 border-destructive/20 text-destructive line-through';
      case 'in-progress':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'checked-in':
        return 'bg-info/10 border-info/20 text-info';
      default:
        return 'bg-primary/10 border-primary/20 text-primary';
    }
  };

  const SlotSection = ({ title, slots }: { title: string; slots: TimeSlot[] }) => (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot) => (
          <Button
            key={slot.time.toISOString()}
            variant={selectedSlot && format(selectedSlot, 'HH:mm') === format(slot.time, 'HH:mm') ? "default" : "outline"}
            size="sm"
            disabled={!slot.available && slot.appointment?.status !== 'cancelled'}
            onClick={() => slot.available && onSelectSlot(slot.time)}
            className={cn(
              "h-auto py-2 px-3 flex flex-col items-start gap-0.5 text-left",
              !slot.available && getStatusColor(slot),
              selectedSlot && format(selectedSlot, 'HH:mm') === format(slot.time, 'HH:mm') && "ring-2 ring-ring"
            )}
          >
            <div className="flex items-center gap-1.5 w-full">
              <Clock className="h-3 w-3" />
              <span className="font-medium">{format(slot.time, 'h:mm a')}</span>
              {slot.appointment && getStatusIcon(slot.appointment.status)}
            </div>
            {slot.appointment && (
              <div className="flex items-center gap-1 text-xs opacity-80">
                <User className="h-2.5 w-2.5" />
                <span className="truncate max-w-[100px]">
                  {slot.appointment.patientName}
                </span>
              </div>
            )}
          </Button>
        ))}
      </div>
    </div>
  );

  const availableCount = timeSlots.filter(s => s.available).length;
  const bookedCount = timeSlots.filter(s => !s.available).length;

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-lg">
          {format(selectedDate, 'EEEE, MMMM d')}
        </h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            {availableCount} available
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            {bookedCount} booked
          </span>
        </div>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="p-4 space-y-6">
          <SlotSection title="Morning" slots={morningSlots} />
          <SlotSection title="Afternoon" slots={afternoonSlots} />
        </div>
      </ScrollArea>
    </div>
  );
}
