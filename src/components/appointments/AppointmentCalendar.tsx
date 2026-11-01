import { useState } from 'react';
import { format, isSameDay, startOfDay, addDays, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/dhos';
import { Badge } from '@/components/ui/badge';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function AppointmentCalendar({ 
  appointments, 
  selectedDate, 
  onSelectDate 
}: AppointmentCalendarProps) {
  // Count appointments per day for indicators
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(parseISO(apt.scheduledTime), date)
    );
  };

  const getDayContent = (date: Date) => {
    const dayAppointments = getAppointmentsForDate(date);
    const count = dayAppointments.length;
    const hasCritical = dayAppointments.some(apt => apt.status === 'scheduled');
    
    return count > 0 ? (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{date.getDate()}</span>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
          {count <= 3 ? (
            Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 h-1 rounded-full",
                  i === 0 && hasCritical ? "bg-primary" : "bg-muted-foreground/50"
                )}
              />
            ))
          ) : (
            <Badge variant="secondary" className="h-3 text-[8px] px-1 py-0">
              {count}
            </Badge>
          )}
        </div>
      </div>
    ) : null;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onSelectDate(date)}
        className="pointer-events-auto w-full p-0"
        classNames={{
          head_cell: "text-muted-foreground rounded-md min-w-9 flex-1 text-center font-normal text-[0.8rem]",
          cell: "h-9 flex-1 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: "h-9 w-full p-0 font-normal aria-selected:opacity-100 inline-flex items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          table: "w-full border-collapse",
        }}
        modifiers={{
          hasAppointments: (date) => getAppointmentsForDate(date).length > 0
        }}
        modifiersClassNames={{
          hasAppointments: "font-semibold"
        }}
        components={{
          DayContent: ({ date }) => getDayContent(date) || <span>{date.getDate()}</span>
        }}
      />
      
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Has appointments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
            <span>Booked slots</span>
          </div>
        </div>
      </div>
    </div>
  );
}
