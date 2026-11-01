import { useState } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { Appointment } from '@/types/dhos';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  User, 
  Calendar, 
  MoreVertical, 
  CheckCircle2, 
  XCircle,
  UserCheck,
  Play,
  Ban,
  Repeat,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SeriesEditDialog } from './SeriesEditDialog';

interface AppointmentsListProps {
  appointments: Appointment[];
  allAppointments: Appointment[];
  selectedDate: Date;
  onStatusChange: (appointmentId: string, status: Appointment['status']) => void;
  onUpdateSeries: (seriesId: string, updates: Partial<Pick<Appointment, 'physician' | 'department' | 'type' | 'duration'>>) => void;
  onCancelSeries: (seriesId: string) => void;
}

export function AppointmentsList({ 
  appointments,
  allAppointments,
  selectedDate,
  onStatusChange,
  onUpdateSeries,
  onCancelSeries,
}: AppointmentsListProps) {
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  const seriesAppointments = selectedSeriesId
    ? allAppointments.filter(a => a.seriesId === selectedSeriesId)
    : [];
  const dayAppointments = appointments
    .filter(apt => isSameDay(parseISO(apt.scheduledTime), selectedDate))
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  const getStatusBadge = (status: Appointment['status']) => {
    const styles = {
      scheduled: 'bg-muted text-muted-foreground',
      'checked-in': 'bg-info/10 text-info border-info/20',
      'in-progress': 'bg-warning/10 text-warning border-warning/20',
      completed: 'bg-success/10 text-success border-success/20',
      'no-show': 'bg-destructive/10 text-destructive border-destructive/20',
      cancelled: 'bg-muted text-muted-foreground line-through'
    };

    return (
      <Badge variant="outline" className={cn("capitalize", styles[status])}>
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  const getTypeColor = (type: Appointment['type']) => {
    switch (type) {
      case 'new':
        return 'bg-primary';
      case 'procedure':
        return 'bg-warning';
      case 'consultation':
        return 'bg-info';
      default:
        return 'bg-muted-foreground';
    }
  };

  if (dayAppointments.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <h3 className="font-medium text-muted-foreground">No Appointments</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          No appointments scheduled for {format(selectedDate, 'MMMM d, yyyy')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Appointments</h3>
          <p className="text-sm text-muted-foreground">
            {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''} for {format(selectedDate, 'MMM d')}
          </p>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="divide-y divide-border">
          {dayAppointments.map((apt) => (
            <div
              key={apt.id}
              className={cn(
                "p-4 hover:bg-muted/30 transition-colors",
                apt.status === 'cancelled' && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  {/* Time indicator */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      getTypeColor(apt.type)
                    )} />
                    <div className="w-0.5 h-full bg-border mt-1" />
                  </div>

                  {/* Appointment details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{apt.patientName}</span>
                      {getStatusBadge(apt.status)}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(parseISO(apt.scheduledTime), 'h:mm a')}
                      </span>
                      <span>•</span>
                      <span>{apt.duration} min</span>
                      <span>•</span>
                      <span className="capitalize">{apt.type}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{apt.physician}</span>
                      <span>•</span>
                      <span>{apt.department}</span>
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-muted-foreground/70 italic mt-2">
                        "{apt.notes}"
                      </p>
                    )}
                    {apt.seriesId && (
                      <Badge variant="outline" className="mt-1 text-xs gap-1 bg-primary/5">
                        <Repeat className="h-3 w-3" />
                        Series
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {apt.status === 'scheduled' && (
                      <DropdownMenuItem onClick={() => onStatusChange(apt.id, 'checked-in')}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Check In
                      </DropdownMenuItem>
                    )}
                    {apt.status === 'checked-in' && (
                      <DropdownMenuItem onClick={() => onStatusChange(apt.id, 'in-progress')}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Visit
                      </DropdownMenuItem>
                    )}
                    {apt.status === 'in-progress' && (
                      <DropdownMenuItem onClick={() => onStatusChange(apt.id, 'completed')}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Complete
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {apt.seriesId && (
                      <>
                        <DropdownMenuItem onClick={() => {
                          setSelectedSeriesId(apt.seriesId!);
                          setSeriesDialogOpen(true);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Series
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onCancelSeries(apt.seriesId!)}
                          className="text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Entire Series
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => onStatusChange(apt.id, 'no-show')}
                          className="text-destructive"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Mark No-Show
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onStatusChange(apt.id, 'cancelled')}
                          className="text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <SeriesEditDialog
        open={seriesDialogOpen}
        onOpenChange={(open) => {
          setSeriesDialogOpen(open);
          if (!open) setSelectedSeriesId(null);
        }}
        seriesAppointments={seriesAppointments}
        onUpdateSeries={onUpdateSeries}
        onCancelSeries={onCancelSeries}
      />
    </div>
  );
}
