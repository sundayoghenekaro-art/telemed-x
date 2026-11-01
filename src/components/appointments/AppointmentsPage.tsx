import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Appointment, Patient } from '@/types/dhos';
import { AppointmentCalendar } from './AppointmentCalendar';
import { TimeSlotPicker } from './TimeSlotPicker';
import { AppointmentsList } from './AppointmentsList';
import { BookingDialog } from './BookingDialog';
import { QueueBoard } from './QueueBoard';
import { WaitingListPanel } from './WaitingListPanel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CalendarDays, Plus, Clock, Users, ChevronLeft, ChevronRight, X, ListOrdered } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { scopeByDepartment } from '@/lib/access';

interface AppointmentsPageProps {
  appointments: Appointment[];
  patients: Patient[];
  departmentScope?: string | null;
  canCreate?: boolean;
  canManageQueue?: boolean;
  onAddAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  onUpdateStatus: (appointmentId: string, status: Appointment['status']) => void;
  onUpdateSeries: (seriesId: string, updates: Partial<Pick<Appointment, 'physician' | 'department' | 'type' | 'duration'>>) => void;
  onCancelSeries: (seriesId: string) => void;
}

export function AppointmentsPage({
  appointments,
  patients,
  departmentScope = null,
  canCreate = false,
  canManageQueue = false,
  onAddAppointment,
  onUpdateStatus,
  onUpdateSeries,
  onCancelSeries,
}: AppointmentsPageProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'queue' | 'waiting'>('day');
  const [physicianFilter, setPhysicianFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Clinicians only ever see their own department's appointments
  const scopedAppointments = useMemo(
    () => scopeByDepartment(appointments, departmentScope),
    [appointments, departmentScope],
  );

  // Extract unique physicians and departments
  const physicians = useMemo(() => {
    const unique = [...new Set(scopedAppointments.map(apt => apt.physician))];
    return unique.sort();
  }, [scopedAppointments]);

  const departments = useMemo(() => {
    const unique = [...new Set(scopedAppointments.map(apt => apt.department))];
    return unique.sort();
  }, [scopedAppointments]);

  // Apply filters
  const filteredAppointments = useMemo(() => {
    return scopedAppointments.filter(apt => {
      const matchesPhysician = physicianFilter === 'all' || apt.physician === physicianFilter;
      const matchesDepartment = departmentFilter === 'all' || apt.department === departmentFilter;
      return matchesPhysician && matchesDepartment;
    });
  }, [scopedAppointments, physicianFilter, departmentFilter]);

  const hasActiveFilters = physicianFilter !== 'all' || departmentFilter !== 'all';

  const clearFilters = () => {
    setPhysicianFilter('all');
    setDepartmentFilter('all');
  };

  // Stats
  const todayAppointments = filteredAppointments.filter(apt => 
    isSameDay(new Date(apt.scheduledTime), new Date())
  );
  const scheduledCount = todayAppointments.filter(a => a.status === 'scheduled').length;
  const completedCount = todayAppointments.filter(a => a.status === 'completed').length;
  const inProgressCount = todayAppointments.filter(a => a.status === 'in-progress').length;

  // Week view dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleBookAppointment = (appointment: Omit<Appointment, 'id'>) => {
    onAddAppointment(appointment);
    setSelectedSlot(null);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Omnichannel scheduling and availability management
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsBookingOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
                <p className="text-xs text-muted-foreground">Today's Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledCount}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CalendarDays className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week' | 'queue' | 'waiting')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="day" className="gap-2">
              <Calendar className="h-4 w-4" />
              Day View
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Week View
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="waiting" className="gap-2">
              <Clock className="h-4 w-4" />
              Waiting List
            </TabsTrigger>
          </TabsList>

          {(viewMode === 'day' || viewMode === 'week') && (
          <div className="flex items-center gap-2">
            {departmentScope ? (
              <span className="inline-flex h-9 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                Department: <strong className="ml-1 text-foreground">{departmentScope}</strong>
              </span>
            ) : (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={physicianFilter} onValueChange={setPhysicianFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Physicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Physicians</SelectItem>
                {physicians.map(physician => (
                  <SelectItem key={physician} value={physician}>
                    {physician}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 gap-1">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
          )}

          {viewMode === 'week' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[180px] text-center">
                {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="day" className="mt-6">
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Calendar Sidebar */}
            <div className="lg:col-span-4">
              <AppointmentCalendar
                appointments={filteredAppointments}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>

            {/* Time Slots */}
            <div className="lg:col-span-4">
              <TimeSlotPicker
                selectedDate={selectedDate}
                appointments={filteredAppointments}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot) => {
                  setSelectedSlot(slot);
                  setIsBookingOpen(true);
                }}
              />
            </div>

            {/* Appointments List */}
            <div className="lg:col-span-4">
              <AppointmentsList
                appointments={filteredAppointments}
                allAppointments={appointments}
                selectedDate={selectedDate}
                onStatusChange={onUpdateStatus}
                onUpdateSeries={onUpdateSeries}
                onCancelSeries={onCancelSeries}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="week" className="mt-6">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Week header */}
            <div className="grid grid-cols-7 border-b border-border">
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-3 text-center border-r border-border last:border-r-0",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </p>
                  <p className={cn(
                    "text-lg font-semibold",
                    isSameDay(day, new Date()) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </p>
                </div>
              ))}
            </div>

            {/* Week appointments grid */}
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDays.map((day) => {
                const dayAppointments = filteredAppointments
                  .filter(apt => isSameDay(new Date(apt.scheduledTime), day))
                  .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border-r border-border last:border-r-0 p-2 space-y-1",
                      isSameDay(day, selectedDate) && "bg-muted/30",
                      "cursor-pointer hover:bg-muted/20 transition-colors"
                    )}
                    onClick={() => {
                      setSelectedDate(day);
                      setViewMode('day');
                    }}
                  >
                    {dayAppointments.slice(0, 4).map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          "text-xs p-1.5 rounded truncate",
                          apt.status === 'completed' ? "bg-success/10 text-success" :
                          apt.status === 'in-progress' ? "bg-warning/10 text-warning" :
                          apt.status === 'cancelled' ? "bg-muted text-muted-foreground line-through" :
                          "bg-primary/10 text-primary"
                        )}
                      >
                        <span className="font-medium">
                          {format(new Date(apt.scheduledTime), 'h:mm a')}
                        </span>
                        <span className="ml-1 opacity-80">{apt.patientName.split(' ')[0]}</span>
                      </div>
                    ))}
                    {dayAppointments.length > 4 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{dayAppointments.length - 4} more
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="queue" className="mt-6">
          <QueueBoard departmentScope={departmentScope} canManage={canManageQueue} />
        </TabsContent>
        <TabsContent value="waiting" className="mt-6">
          <WaitingListPanel canManage={canManageQueue} />
        </TabsContent>
      </Tabs>

      {/* Booking Dialog */}
      <BookingDialog
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        selectedDate={selectedDate}
        selectedTime={selectedSlot}
        patients={patients}
        existingAppointments={appointments}
        onBook={handleBookAppointment}
      />
    </div>
  );
}
