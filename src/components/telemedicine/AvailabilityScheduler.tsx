import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CalendarIcon, Trash2, Plus, Clock, Save, Ban, CheckCircle2, Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface AvailabilityRow {
  id: string;
  doctor_user_id: string;
  doctor_name: string;
  doctor_type: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AvailabilitySchedulerProps {
  doctorUserId: string;
  doctorName: string;
  doctorType: string;
}

const DAYS = [
  { label: 'Sunday', short: 'Sun', index: 0 },
  { label: 'Monday', short: 'Mon', index: 1 },
  { label: 'Tuesday', short: 'Tue', index: 2 },
  { label: 'Wednesday', short: 'Wed', index: 3 },
  { label: 'Thursday', short: 'Thu', index: 4 },
  { label: 'Friday', short: 'Fri', index: 5 },
  { label: 'Saturday', short: 'Sat', index: 6 },
];

export function AvailabilityScheduler({ doctorUserId, doctorName, doctorType }: AvailabilitySchedulerProps) {
  const [weeklyRows, setWeeklyRows] = useState<AvailabilityRow[]>([]);
  const [blockedDates, setBlockedDates] = useState<AvailabilityRow[]>([]);
  const [oneOffDates, setOneOffDates] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Weekly editing state per day
  const [dayEditing, setDayEditing] = useState<Record<number, { start: string; end: string; open: boolean }>>({});
  const [daySaving, setDaySaving] = useState<number | null>(null);

  // Block date state
  const [blockDate, setBlockDate] = useState<Date | undefined>();
  const [blockLabel, setBlockLabel] = useState('');
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockPopoverOpen, setBlockPopoverOpen] = useState(false);

  // One-off state
  const [oneOffDate, setOneOffDate] = useState<Date | undefined>();
  const [oneOffStart, setOneOffStart] = useState('09:00');
  const [oneOffEnd, setOneOffEnd] = useState('17:00');
  const [oneOffSaving, setOneOffSaving] = useState(false);
  const [oneOffPopoverOpen, setOneOffPopoverOpen] = useState(false);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_user_id', doctorUserId)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load availability');
      setLoading(false);
      return;
    }

    const rows = (data || []) as AvailabilityRow[];
    // Bug fix: weekly rows must have specific_date=null to avoid duplicating one-off slots
    setWeeklyRows(rows.filter(r => r.day_of_week !== null && r.specific_date === null && r.is_available));
    setBlockedDates(rows.filter(r => r.specific_date !== null && !r.is_available));
    setOneOffDates(rows.filter(r => r.specific_date !== null && r.is_available));
    setLoading(false);
  }, [doctorUserId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ─── Weekly Hours ────────────────────────────────────────────────────────────

  const getWeeklyRow = (dayIndex: number) =>
    weeklyRows.find(r => r.day_of_week === dayIndex);

  const openDayEditor = (dayIndex: number) => {
    const existing = getWeeklyRow(dayIndex);
    setDayEditing(prev => ({
      ...prev,
      [dayIndex]: {
        start: existing?.start_time.slice(0, 5) ?? '09:00',
        end: existing?.end_time.slice(0, 5) ?? '17:00',
        open: true,
      },
    }));
  };

  const closeDayEditor = (dayIndex: number) => {
    setDayEditing(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], open: false } }));
  };

  const saveDay = async (dayIndex: number) => {
    const ed = dayEditing[dayIndex];
    if (!ed) return;
    if (ed.start >= ed.end) {
      toast.error('Start time must be before end time');
      return;
    }
    setDaySaving(dayIndex);
    const existing = getWeeklyRow(dayIndex);

    if (existing) {
      const { error } = await supabase
        .from('doctor_availability')
        .update({ start_time: ed.start, end_time: ed.end })
        .eq('id', existing.id);
      if (error) { toast.error('Failed to update hours'); setDaySaving(null); return; }
    } else {
      const { error } = await supabase.from('doctor_availability').insert({
        doctor_user_id: doctorUserId,
        doctor_name: doctorName,
        doctor_type: doctorType,
        day_of_week: dayIndex,
        start_time: ed.start,
        end_time: ed.end,
        is_available: true,
      });
      if (error) { toast.error('Failed to save hours'); setDaySaving(null); return; }
    }

    toast.success(`${DAYS[dayIndex].label} hours saved`);
    closeDayEditor(dayIndex);
    setDaySaving(null);
    fetchAvailability();
  };

  const deleteDay = async (dayIndex: number) => {
    const existing = getWeeklyRow(dayIndex);
    if (!existing) return;
    const { error } = await supabase.from('doctor_availability').delete().eq('id', existing.id);
    if (error) { toast.error('Failed to remove hours'); return; }
    toast.success(`${DAYS[dayIndex].label} hours removed`);
    fetchAvailability();
  };

  // ─── Block a Date ────────────────────────────────────────────────────────────

  const handleBlockDate = async () => {
    if (!blockDate) { toast.error('Please select a date'); return; }
    setBlockSaving(true);
    const dateStr = format(blockDate, 'yyyy-MM-dd');
    const { error } = await supabase.from('doctor_availability').insert({
      doctor_user_id: doctorUserId,
      doctor_name: doctorName,
      doctor_type: doctorType,
      specific_date: dateStr,
      start_time: '00:00',
      end_time: '23:59',
      is_available: false,
    });
    if (error) { toast.error('Failed to block date'); setBlockSaving(false); return; }
    toast.success(`${format(blockDate, 'MMM d, yyyy')} blocked`);
    setBlockDate(undefined);
    setBlockLabel('');
    setBlockPopoverOpen(false);
    setBlockSaving(false);
    fetchAvailability();
  };

  const removeRow = async (id: string, label: string) => {
    const { error } = await supabase.from('doctor_availability').delete().eq('id', id);
    if (error) { toast.error('Failed to remove entry'); return; }
    toast.success(`${label} removed`);
    fetchAvailability();
  };

  // ─── One-Off Availability ────────────────────────────────────────────────────

  const handleOneOff = async () => {
    if (!oneOffDate) { toast.error('Please select a date'); return; }
    if (oneOffStart >= oneOffEnd) { toast.error('Start time must be before end time'); return; }
    setOneOffSaving(true);
    const dateStr = format(oneOffDate, 'yyyy-MM-dd');
    const { error } = await supabase.from('doctor_availability').insert({
      doctor_user_id: doctorUserId,
      doctor_name: doctorName,
      doctor_type: doctorType,
      specific_date: dateStr,
      start_time: oneOffStart,
      end_time: oneOffEnd,
      is_available: true,
    });
    if (error) { toast.error('Failed to add one-off slot'); setOneOffSaving(false); return; }
    toast.success(`One-off slot added for ${format(oneOffDate, 'MMM d, yyyy')}`);
    setOneOffDate(undefined);
    setOneOffStart('09:00');
    setOneOffEnd('17:00');
    setOneOffPopoverOpen(false);
    setOneOffSaving(false);
    fetchAvailability();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading availability…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ─── Weekly Hours ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Weekly Hours
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Set your recurring weekly availability. Patients will see open slots based on these hours.
          </p>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {DAYS.map((day) => {
            const row = getWeeklyRow(day.index);
            const ed = dayEditing[day.index];
            const isEditing = ed?.open;
            const saving = daySaving === day.index;

            return (
              <div key={day.index} className="rounded-md border border-border bg-muted/30">
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 text-xs font-semibold text-muted-foreground">{day.short}</span>
                    {row && !isEditing ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/5">
                          {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
                        </Badge>
                      </div>
                    ) : !isEditing ? (
                      <span className="text-xs text-muted-foreground">No hours set</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isEditing && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => openDayEditor(day.index)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {row ? 'Edit' : 'Add hours'}
                        </Button>
                        {row && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteDay(day.index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="px-4 pb-3 border-t border-border pt-3 bg-background/50 rounded-b-md">
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="space-y-1">
                        <Label className="text-xs">Start time</Label>
                        <input
                          type="time"
                          value={ed.start}
                          onChange={(e) =>
                            setDayEditing(prev => ({
                              ...prev,
                              [day.index]: { ...prev[day.index], start: e.target.value },
                            }))
                          }
                          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End time</Label>
                        <input
                          type="time"
                          value={ed.end}
                          onChange={(e) =>
                            setDayEditing(prev => ({
                              ...prev,
                              [day.index]: { ...prev[day.index], end: e.target.value },
                            }))
                          }
                          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveDay(day.index)}
                          disabled={saving}
                          className="h-9"
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5 mr-1" />
                          )}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => closeDayEditor(day.index)}
                          className="h-9"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── Block a Date ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="h-4 w-4 text-destructive" />
            Block a Date
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Block specific dates when you're unavailable (holiday, conference, etc.).
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Date to block</Label>
              <Popover open={blockPopoverOpen} onOpenChange={setBlockPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !blockDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {blockDate ? format(blockDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={blockDate}
                    onSelect={(d) => { setBlockDate(d); setBlockPopoverOpen(false); }}
                    className={cn('p-3 pointer-events-auto')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1 flex-1 min-w-[160px]">
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                placeholder="Holiday, conference…"
                value={blockLabel}
                onChange={(e) => setBlockLabel(e.target.value)}
              />
            </div>
            <Button
              onClick={handleBlockDate}
              disabled={blockSaving || !blockDate}
              variant="destructive"
              className="shrink-0"
            >
              {blockSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4 mr-1" />}
              Block Date
            </Button>
          </div>

          {blockedDates.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Blocked Dates</p>
                {blockedDates.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-destructive/5 border border-destructive/20"
                  >
                    <div className="flex items-center gap-2">
                      <Ban className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-sm font-medium">
                        {format(parseISO(row.specific_date!), 'EEEE, MMM d, yyyy')}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-destructive hover:text-destructive text-xs"
                      onClick={() => removeRow(row.id, format(parseISO(row.specific_date!), 'MMM d'))}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── One-Off Availability ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            One-Off Availability
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Add availability for a specific date that's outside your regular weekly schedule.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Popover open={oneOffPopoverOpen} onOpenChange={setOneOffPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !oneOffDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {oneOffDate ? format(oneOffDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={oneOffDate}
                    onSelect={(d) => { setOneOffDate(d); setOneOffPopoverOpen(false); }}
                    className={cn('p-3 pointer-events-auto')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start time</Label>
              <input
                type="time"
                value={oneOffStart}
                onChange={(e) => setOneOffStart(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End time</Label>
              <input
                type="time"
                value={oneOffEnd}
                onChange={(e) => setOneOffEnd(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button
              onClick={handleOneOff}
              disabled={oneOffSaving || !oneOffDate}
              className="shrink-0"
            >
              {oneOffSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Slot
            </Button>
          </div>

          {oneOffDates.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">One-Off Slots</p>
                {oneOffDates.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-primary/5 border border-primary/20"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">
                        {format(parseISO(row.specific_date!), 'EEEE, MMM d, yyyy')}
                      </span>
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                        {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-destructive hover:text-destructive text-xs"
                      onClick={() =>
                        removeRow(row.id, format(parseISO(row.specific_date!), 'MMM d'))
                      }
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
