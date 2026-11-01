import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Sun, Sunset, Moon, Clock, ChevronLeft, ChevronRight, Undo2, FileDown, AlertTriangle, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { availableNurses } from '@/data/inpatientMockData';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { exportShiftPdf } from '@/lib/exportShiftSchedule';

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'off';

export interface ShiftEntry {
  nurse: string;
  wardId: string;
  date: string; // ISO date
  shift: ShiftType;
}

const SHIFT_META: Record<ShiftType, { label: string; icon: typeof Sun; time: string; color: string; bg: string }> = {
  morning:   { label: 'Morning',   icon: Sun,    time: '06:00–14:00', color: 'text-warning',     bg: 'bg-warning/15 border-warning/30' },
  afternoon: { label: 'Afternoon', icon: Sunset, time: '14:00–22:00', color: 'text-primary',     bg: 'bg-primary/10 border-primary/30' },
  night:     { label: 'Night',     icon: Moon,   time: '22:00–06:00', color: 'text-info',        bg: 'bg-info/10 border-info/30' },
  off:       { label: 'Off',       icon: Clock,  time: '—',           color: 'text-muted-foreground', bg: 'bg-muted/50 border-border' },
};

const WARDS = [
  { id: 'W1', name: 'General Ward A' },
  { id: 'W2', name: 'General Ward B' },
  { id: 'W3', name: 'ICU' },
  { id: 'W4', name: 'CCU' },
  { id: 'W5', name: 'Maternity' },
  { id: 'W6', name: 'Pediatrics' },
  { id: 'W7', name: 'Surgical' },
  { id: 'W8', name: 'Emergency' },
];

function generateMockSchedule(): ShiftEntry[] {
  const entries: ShiftEntry[] = [];
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const shifts: ShiftType[] = ['morning', 'afternoon', 'night'];

  for (const nurse of availableNurses) {
    // Assign each nurse to 1-2 wards
    const wardIdx = availableNurses.indexOf(nurse) % WARDS.length;
    const wardId = WARDS[wardIdx].id;

    for (let d = 0; d < 7; d++) {
      const date = format(addDays(weekStart, d), 'yyyy-MM-dd');
      // Rotate shifts, give 1-2 days off
      const isOff = (d + availableNurses.indexOf(nurse)) % 7 < 1;
      const shift = isOff ? 'off' : shifts[(d + availableNurses.indexOf(nurse)) % 3];
      entries.push({ nurse, wardId, date, shift });
    }
  }
  return entries;
}

interface ShiftSchedulePanelProps {
  onScheduleChange?: (entries: ShiftEntry[]) => void;
}

export function ShiftSchedulePanel({ onScheduleChange }: ShiftSchedulePanelProps) {
  const [schedule, setSchedule] = useState<ShiftEntry[]>(generateMockSchedule);
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragSource, setDragSource] = useState<{ nurse: string; dateStr: string } | null>(null);
  const [undoStack, setUndoStack] = useState<ShiftEntry[][]>([]);
  const [exportRange, setExportRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [exportOpen, setExportOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const pushUndo = useCallback((snapshot: ShiftEntry[]) => {
    setUndoStack(prev => [...prev.slice(-19), snapshot]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setSchedule(last);
      onScheduleChange?.(last);
      toast('Shift change undone');
      return prev.slice(0, -1);
    });
  }, [onScheduleChange]);

  // Ctrl+Z / Cmd+Z keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  const today = new Date();
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredNurses = useMemo(() => {
    if (selectedWard === 'all') return availableNurses;
    const nursesInWard = new Set(
      schedule.filter(e => e.wardId === selectedWard).map(e => e.nurse)
    );
    return availableNurses.filter(n => nursesInWard.has(n));
  }, [selectedWard, schedule]);

  const getShift = (nurse: string, date: Date): ShiftEntry | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedule.find(e => e.nurse === nurse && e.date === dateStr);
  };

  const cycleShift = (nurse: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const order: ShiftType[] = ['morning', 'afternoon', 'night', 'off'];
    setSchedule(prev => {
      const idx = prev.findIndex(e => e.nurse === nurse && e.date === dateStr);
      if (idx === -1) return prev;
      pushUndo(prev);
      const current = prev[idx].shift;
      const next = order[(order.indexOf(current) + 1) % order.length];
      const updated = [...prev];
      updated[idx] = { ...updated[idx], shift: next };
      onScheduleChange?.(updated);
      return updated;
    });
  };

  const swapShifts = useCallback((sourceNurse: string, targetNurse: string, dateStr: string) => {
    setSchedule(prev => {
      const srcIdx = prev.findIndex(e => e.nurse === sourceNurse && e.date === dateStr);
      const tgtIdx = prev.findIndex(e => e.nurse === targetNurse && e.date === dateStr);
      if (srcIdx === -1 || tgtIdx === -1) return prev;
      pushUndo(prev);
      const updated = [...prev];
      const srcShift = updated[srcIdx].shift;
      updated[srcIdx] = { ...updated[srcIdx], shift: updated[tgtIdx].shift };
      updated[tgtIdx] = { ...updated[tgtIdx], shift: srcShift };
      onScheduleChange?.(updated);
      const dayLabel = format(new Date(dateStr + 'T00:00:00'), 'EEE MMM d');
      toast.success(`Swapped ${sourceNurse} and ${targetNurse} shifts on ${dayLabel}`);
      return updated;
    });
  }, [onScheduleChange, pushUndo]);

  // Conflict detection: night shift followed by morning shift next day
  const conflicts = useMemo(() => {
    const set = new Set<string>(); // "nurse|date" keys that have a conflict
    for (const nurse of availableNurses) {
      for (const day of weekDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const prevDateStr = format(subDays(day, 1), 'yyyy-MM-dd');
        const todayEntry = schedule.find(e => e.nurse === nurse && e.date === dateStr);
        const prevEntry = schedule.find(e => e.nurse === nurse && e.date === prevDateStr);
        if (prevEntry?.shift === 'night' && todayEntry?.shift === 'morning') {
          // Mark both the night cell (prev day) and morning cell (this day)
          set.add(`${nurse}|${prevDateStr}`);
          set.add(`${nurse}|${dateStr}`);
        }
      }
    }
    return set;
  }, [schedule, weekDays]);

  const conflictCount = useMemo(() => {
    // Count unique nurse-day pairs where morning follows night
    let count = 0;
    for (const nurse of availableNurses) {
      for (const day of weekDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const prevDateStr = format(subDays(day, 1), 'yyyy-MM-dd');
        const todayEntry = schedule.find(e => e.nurse === nurse && e.date === dateStr);
        const prevEntry = schedule.find(e => e.nurse === nurse && e.date === prevDateStr);
        if (prevEntry?.shift === 'night' && todayEntry?.shift === 'morning') count++;
      }
    }
    return count;
  }, [schedule, weekDays]);

  // Shift coverage summary per day
  const dayCoverage = useMemo(() => {
    return weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = schedule.filter(e => e.date === dateStr && (selectedWard === 'all' || e.wardId === selectedWard));
      return {
        morning: dayEntries.filter(e => e.shift === 'morning').length,
        afternoon: dayEntries.filter(e => e.shift === 'afternoon').length,
        night: dayEntries.filter(e => e.shift === 'night').length,
        off: dayEntries.filter(e => e.shift === 'off').length,
      };
    });
  }, [schedule, weekDays, selectedWard]);

  return (
    <Card ref={cardRef}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Shift Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Popover open={exportOpen} onOpenChange={setExportOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  title="Export printable schedule"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="end">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Select date range to export</p>
                  <Calendar
                    mode="range"
                    selected={exportRange.from && exportRange.to ? { from: exportRange.from, to: exportRange.to } : undefined}
                    onSelect={(range) => setExportRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {exportRange.from && exportRange.to
                        ? `${format(exportRange.from, 'MMM d')} – ${format(exportRange.to, 'MMM d, yyyy')}`
                        : 'No range selected'}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setExportRange({ from: weekDays[0], to: weekDays[6] });
                        }}
                      >
                        This week
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={!exportRange.from || !exportRange.to}
                        onClick={() => {
                          if (exportRange.from && exportRange.to) {
                            const wardLabel = selectedWard === 'all' ? 'All Wards' : WARDS.find(w => w.id === selectedWard)?.name || selectedWard;
                            exportShiftPdf(schedule, filteredNurses, wardLabel, exportRange.from, exportRange.to);
                            setExportOpen(false);
                          }
                        }}
                      >
                        <FileDown className="h-3.5 w-3.5 mr-1" />
                        Export PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={undoStack.length === 0}
              onClick={undo}
              title="Undo last change (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </Button>
            <Select value={selectedWard} onValueChange={setSelectedWard}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Wards</SelectItem>
                {WARDS.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setWeekOffset(0)}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-3 mt-2">
          {(['morning', 'afternoon', 'night', 'off'] as ShiftType[]).map(s => {
            const meta = SHIFT_META[s];
            const Icon = meta.icon;
            return (
              <div key={s} className="flex items-center gap-1 text-[10px]">
                <Icon className={cn("h-3 w-3", meta.color)} />
                <span className="text-muted-foreground">{meta.label} ({meta.time})</span>
              </div>
            );
          })}
        </div>
        {/* Conflict warning banner */}
        {conflictCount > 0 && (
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-[11px]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{conflictCount} back-to-back conflict{conflictCount > 1 ? 's' : ''}</span>
            <span className="text-destructive/70">— Night shift immediately followed by morning shift (insufficient rest)</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b bg-muted/30 sticky top-0 z-10">
              <div className="p-2 text-xs font-medium text-muted-foreground">Nurse</div>
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-2 text-center border-l",
                    isSameDay(day, today) && "bg-primary/5"
                  )}
                >
                  <div className="text-[10px] text-muted-foreground">{format(day, 'EEE')}</div>
                  <div className={cn("text-xs font-medium", isSameDay(day, today) && "text-primary")}>
                    {format(day, 'MMM d')}
                  </div>
                </div>
              ))}
            </div>

            {/* Coverage summary */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b bg-muted/20">
              <div className="p-2 text-[10px] text-muted-foreground font-medium">Coverage</div>
              {dayCoverage.map((cov, i) => (
                <div key={i} className="p-1.5 border-l flex flex-wrap gap-1 justify-center">
                  <Badge variant="outline" className="text-[8px] py-0 h-4 border-warning/30 text-warning">
                    ☀ {cov.morning}
                  </Badge>
                  <Badge variant="outline" className="text-[8px] py-0 h-4 border-primary/30 text-primary">
                    🌅 {cov.afternoon}
                  </Badge>
                  <Badge variant="outline" className="text-[8px] py-0 h-4 border-info/30 text-info">
                    🌙 {cov.night}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Nurse rows */}
            {filteredNurses.map(nurse => (
              <div key={nurse} className="grid grid-cols-[180px_repeat(7,1fr)] border-b hover:bg-muted/20 transition-colors">
                <div className="p-2 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                    {nurse.replace('Nurse ', '').slice(0, 2)}
                  </div>
                  <span className="text-xs font-medium truncate">{nurse}</span>
                </div>
                {weekDays.map((day, i) => {
                  const entry = getShift(nurse, day);
                  const shift = entry?.shift || 'off';
                  const meta = SHIFT_META[shift];
                  const Icon = meta.icon;

                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isDragSource = dragSource?.nurse === nurse && dragSource?.dateStr === dateStr;
                    const isValidTarget = dragSource && dragSource.dateStr === dateStr && dragSource.nurse !== nurse;
                    const hasConflict = conflicts.has(`${nurse}|${dateStr}`);

                    return (
                      <button
                        key={i}
                        draggable
                        onClick={() => cycleShift(nurse, day)}
                        onDragStart={(e) => {
                          setDragSource({ nurse, dateStr });
                          e.dataTransfer.setData('text/plain', JSON.stringify({ nurse, dateStr }));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDragSource(null)}
                        onDragOver={(e) => {
                          if (isValidTarget) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          try {
                            const src = JSON.parse(e.dataTransfer.getData('text/plain'));
                            if (src.dateStr === dateStr && src.nurse !== nurse) {
                              swapShifts(src.nurse, nurse, dateStr);
                            }
                          } catch {}
                          setDragSource(null);
                        }}
                        className={cn(
                          "p-1.5 border-l flex items-center justify-center transition-colors cursor-pointer hover:opacity-80",
                          isSameDay(day, today) && "bg-primary/5",
                          isDragSource && "opacity-50 ring-2 ring-primary",
                          isValidTarget && "ring-2 ring-dashed ring-primary/50 bg-primary/5",
                          hasConflict && "bg-destructive/5"
                        )}
                        title={hasConflict ? `⚠ Back-to-back conflict: insufficient rest` : `Click to change: ${meta.label} (${meta.time})`}
                      >
                        <div className="relative">
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium",
                            hasConflict ? "border-destructive/50 bg-destructive/10" : "",
                            !hasConflict && meta.bg,
                            meta.color
                          )}>
                            <Icon className="h-3 w-3" />
                            {shift === 'off' ? 'Off' : meta.label.slice(0, 3)}
                          </div>
                          {hasConflict && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-destructive flex items-center justify-center">
                                    <AlertTriangle className="h-2 w-2 text-destructive-foreground" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Back-to-back: Night → Morning (insufficient rest)
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </button>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
