import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User, Stethoscope, Building2, ChevronLeft, ChevronRight,
  Calendar, Clock, CheckCircle2, Loader2, Search, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AvailableDoctor {
  userId: string;
  name: string;
  type: 'hospital' | 'external';
  specialty: string;
  bio: string | null;
  institution: string | null;
  yearsExperience: number | null;
}

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

interface TimeSlot {
  time: string; // "HH:MM"
  label: string; // "9:00 AM"
  available: boolean;
  availabilityId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

interface PatientBookingTabProps {
  patientUserId: string;
  patientName: string;
  patientAccountId: string;
  onBookingComplete: () => void;
}

type Screen = 'browse' | 'slots' | 'confirm' | 'success';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (cur < endMin) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    cur += 30;
  }
  return slots;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function sendSessionNotification(type: string, payload: Record<string, unknown>) {
  supabase.auth.getSession().then(({ data: { session: authSession } }) => {
    const token = authSession?.access_token;
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${SUPABASE_URL}/functions/v1/send-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ type, ...payload }),
    }).catch(() => {});
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PatientBookingTab({
  patientUserId,
  patientName,
  patientAccountId,
  onBookingComplete,
}: PatientBookingTabProps) {
  const [screen, setScreen] = useState<Screen>('browse');
  const [doctors, setDoctors] = useState<AvailableDoctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedDoctor, setSelectedDoctor] = useState<AvailableDoctor | null>(null);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [booking, setBooking] = useState(false);
  const [sessionCode, setSessionCode] = useState('');

  // Next 14 days for date picker
  const dateOptions = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  // ── Fetch doctors ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const [availRes, extRes, profRes] = await Promise.all([
        supabase.from('doctor_availability').select('*').eq('is_available', true),
        supabase.from('external_doctors').select('*').eq('status', 'approved'),
        supabase.from('profiles').select('*'),
      ]);

      const availRows: AvailabilityRow[] = availRes.data || [];

      // Unique doctor_user_ids from availability
      const doctorMap = new Map<string, { type: string; name: string }>();
      availRows.forEach(a => {
        if (!doctorMap.has(a.doctor_user_id)) {
          doctorMap.set(a.doctor_user_id, { type: a.doctor_type, name: a.doctor_name });
        }
      });

      const result: AvailableDoctor[] = [];

      doctorMap.forEach((info, userId) => {
        if (info.type === 'external') {
          const ext = (extRes.data || []).find((e: any) => e.user_id === userId);
          if (ext) {
            result.push({
              userId,
              name: ext.full_name,
              type: 'external',
              specialty: ext.specialty,
              bio: ext.bio,
              institution: ext.institution,
              yearsExperience: ext.years_experience,
            });
          }
        } else {
          const prof = (profRes.data || []).find((p: any) => p.user_id === userId);
          if (prof) {
            result.push({
              userId,
              name: prof.full_name,
              type: 'hospital',
              specialty: prof.department || 'General Practice',
              bio: null,
              institution: 'UHES Hospital',
              yearsExperience: null,
            });
          }
        }
      });

      setDoctors(result);
    } catch {
      toast.error('Failed to load available doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  // ── Fetch slots when doctor/date changes ────────────────────────────────────
  useEffect(() => {
    if (selectedDoctor && screen === 'slots') {
      fetchSlots(selectedDoctor, selectedDate);
    }
  }, [selectedDoctor, selectedDate, screen]);

  const fetchSlots = async (doctor: AvailableDoctor, date: Date) => {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const dayOfWeek = date.getDay();
      const dateStr = format(date, 'yyyy-MM-dd');

      // Bug fix 2: Fetch ALL availability rows (including blocked is_available=false)
      // so we can suppress weekly hours on blocked dates
      const [availRes, sessionsRes] = await Promise.all([
        supabase.from('doctor_availability')
          .select('*')
          .eq('doctor_user_id', doctor.userId),
        supabase.from('telemedicine_sessions')
          .select('scheduled_at, duration_minutes')
          .eq('doctor_user_id', doctor.userId)
          .neq('status', 'cancelled')
          .gte('scheduled_at', `${dateStr}T00:00:00`)
          .lte('scheduled_at', `${dateStr}T23:59:59`),
      ]);

      const allRows: AvailabilityRow[] = availRes.data || [];

      // Bug fix 2: if a specific_date block exists for this date, show no slots
      const isDateBlocked = allRows.some(
        r => r.specific_date === dateStr && !r.is_available
      );
      if (isDateBlocked) {
        setSlots([]);
        setLoadingSlots(false);
        return;
      }

      // Matching available rows for this date: specific_date overrides take priority,
      // then fall back to day_of_week recurring rows
      const specificRows = allRows.filter(r => r.specific_date === dateStr && r.is_available);
      const weeklyRows = allRows.filter(r => r.specific_date === null && r.day_of_week === dayOfWeek && r.is_available);
      const availRows = specificRows.length > 0 ? specificRows : weeklyRows;

      // Bug fix 3: Build a set of booked minute-ranges (not just start times)
      // so slots overlapping with an existing session are also marked unavailable
      const bookedRanges: Array<{ start: number; end: number }> = [];
      (sessionsRes.data || []).forEach((s: any) => {
        const scheduled = parseISO(s.scheduled_at);
        const startMin = scheduled.getHours() * 60 + scheduled.getMinutes();
        const endMin = startMin + (s.duration_minutes || 30);
        bookedRanges.push({ start: startMin, end: endMin });
      });

      const isSlotBooked = (slotTime: string) => {
        const [h, m] = slotTime.split(':').map(Number);
        const slotStart = h * 60 + m;
        const slotEnd = slotStart + 30; // 30-min slot
        return bookedRanges.some(r => slotStart < r.end && slotEnd > r.start);
      };

      const allSlots: TimeSlot[] = [];
      availRows.forEach(avail => {
        // Bug fix 4: slot duration is always 30 min (the fixed slot length), not the window size
        const SLOT_DURATION = 30;

        generateSlots(avail.start_time, avail.end_time).forEach(slotTime => {
          allSlots.push({
            time: slotTime,
            label: formatTime(slotTime),
            available: !isSlotBooked(slotTime),
            availabilityId: avail.id,
            startTime: avail.start_time,
            endTime: avail.end_time,
            durationMinutes: SLOT_DURATION,
          });
        });
      });

      // Sort and deduplicate
      const seen = new Set<string>();
      const unique = allSlots.filter(s => {
        if (seen.has(s.time)) return false;
        seen.add(s.time);
        return true;
      }).sort((a, b) => a.time.localeCompare(b.time));

      setSlots(unique);
    } catch {
      toast.error('Failed to load time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  // ── Book session ────────────────────────────────────────────────────────────
  const confirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot) return;
    setBooking(true);
    try {
      const code = 'TM-' + Date.now().toString(36).toUpperCase();
      const scheduledAt = new Date(selectedDate);
      const [h, m] = selectedSlot.time.split(':').map(Number);
      scheduledAt.setHours(h, m, 0, 0);

      const { error } = await supabase.from('telemedicine_sessions').insert({
        session_code: code,
        doctor_user_id: selectedDoctor.userId,
        doctor_name: selectedDoctor.name,
        doctor_type: selectedDoctor.type,
        doctor_specialty: selectedDoctor.specialty,
        patient_name: patientName,
        patient_user_id: patientUserId,
        patient_account_id: patientAccountId,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: selectedSlot.durationMinutes,
        chief_complaint: chiefComplaint || null,
        status: 'scheduled',
      });

      if (error) throw error;

      setSessionCode(code);

      // Fire-and-forget notification
      sendSessionNotification('session_reminder', {
        patientAccountId,
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: selectedSlot.durationMinutes,
        sessionCode: code,
      });

      setScreen('success');
    } catch (err: any) {
      toast.error(err.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  // ── Specialties for filter ──────────────────────────────────────────────────
  const PREDEFINED_SPECIALTIES = [
    'Cardiology', 'Dermatology', 'Emergency Medicine', 'Endocrinology',
    'Family Medicine', 'Gastroenterology', 'General Practice', 'Geriatrics',
    'Hematology', 'Infectious Disease', 'Internal Medicine', 'Nephrology',
    'Neurology', 'Obstetrics & Gynecology', 'Oncology', 'Ophthalmology',
    'Orthopedics', 'Otolaryngology (ENT)', 'Pathology', 'Pediatrics',
    'Physical Medicine', 'Psychiatry', 'Pulmonology', 'Radiology',
    'Rheumatology', 'Surgery', 'Urology',
  ];
  const doctorSpecialties = Array.from(new Set(doctors.map(d => d.specialty)));
  const mergedSpecialties = Array.from(new Set([...PREDEFINED_SPECIALTIES, ...doctorSpecialties])).sort();
  const specialties = ['all', ...mergedSpecialties];

  const filteredDoctors = doctors.filter(d => {
    const matchesSpecialty = specialtyFilter === 'all' || d.specialty === specialtyFilter;
    const matchesSearch = !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpecialty && matchesSearch;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: Browse
  // ════════════════════════════════════════════════════════════════════════════
  if (screen === 'browse') {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search doctors or specialty…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Specialties" />
            </SelectTrigger>
            <SelectContent>
              {specialties.map(s => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All Specialties' : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Doctor cards */}
        {loadingDoctors ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <User className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="font-medium">No doctors available</p>
            <p className="text-sm">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDoctors.map(doctor => (
              <DoctorCard
                key={doctor.userId}
                doctor={doctor}
                onSelect={() => {
                  setSelectedDoctor(doctor);
                  setSelectedDate(new Date());
                  setScreen('slots');
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: Slot Picker
  // ════════════════════════════════════════════════════════════════════════════
  if (screen === 'slots' && selectedDoctor) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setScreen('browse')}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <p className="font-semibold">{selectedDoctor.name}</p>
            <p className="text-sm text-muted-foreground">{selectedDoctor.specialty}</p>
          </div>
        </div>

        {/* Date picker */}
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">Select a date</p>
          <ScrollArea className="w-full" type="scroll">
            <div className="flex gap-2 pb-2">
              {dateOptions.map(date => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl border min-w-[64px] transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:border-primary/50 text-foreground'
                    }`}
                  >
                    <span className="text-xs font-medium">{format(date, 'EEE')}</span>
                    <span className="text-lg font-bold">{format(date, 'd')}</span>
                    <span className="text-xs">{format(date, 'MMM')}</span>
                    {isToday && (
                      <span className={`text-xs mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-primary'}`}>
                        Today
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Slots */}
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground">
            Available times — {format(selectedDate, 'EEEE, MMMM d')}
          </p>
          {loadingSlots ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium">No availability on this day</p>
              <p className="text-xs">Try selecting a different date</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map(slot => (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setScreen('confirm');
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    !slot.available
                      ? 'border-border text-muted-foreground/50 bg-muted cursor-not-allowed line-through'
                      : 'border-border bg-card hover:border-primary hover:bg-primary/5 text-foreground'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: Confirm
  // ════════════════════════════════════════════════════════════════════════════
  if (screen === 'confirm' && selectedDoctor && selectedSlot) {
    return (
      <div className="max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setScreen('slots')}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <p className="font-semibold">Confirm Booking</p>
        </div>

        {/* Summary card */}
        <Card>
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{selectedDoctor.name}</p>
                <p className="text-sm text-muted-foreground">{selectedDoctor.specialty}</p>
              </div>
            </div>

            <div className="border-t border-border pt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(selectedDate, 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{selectedSlot.label} · {selectedSlot.durationMinutes} min</span>
              </div>
              {selectedDoctor.institution && (
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <Building2 className="h-4 w-4" />
                  <span>{selectedDoctor.institution}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chief complaint */}
        <div className="space-y-2">
          <Label htmlFor="complaint">Reason for visit <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="complaint"
            placeholder="Briefly describe your symptoms or reason for the consultation…"
            value={chiefComplaint}
            onChange={e => setChiefComplaint(e.target.value)}
            rows={3}
          />
        </div>

        <Button className="w-full" onClick={confirmBooking} disabled={booking}>
          {booking
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Booking…</>
            : 'Confirm Booking'}
        </Button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: Success
  // ════════════════════════════════════════════════════════════════════════════
  if (screen === 'success' && selectedDoctor && selectedSlot) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-8">
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold">Booking Confirmed!</h3>
          <p className="text-muted-foreground text-sm">
            Your appointment with {selectedDoctor.name} is scheduled for{' '}
            {format(selectedDate, 'MMMM d')} at {selectedSlot.label}.
          </p>
        </div>

        <div className="bg-muted rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Session Code</p>
          <p className="text-2xl font-mono font-bold tracking-wider text-primary">{sessionCode}</p>
          <p className="text-xs text-muted-foreground">Use this code to join your consultation</p>
        </div>

        <p className="text-xs text-muted-foreground">
          A confirmation email has been sent to your registered email address.
        </p>

        <Button className="w-full" onClick={onBookingComplete}>
          <Calendar className="h-4 w-4 mr-2" /> Go to My Consultations
        </Button>
      </div>
    );
  }

  return null;
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────

function DoctorCard({ doctor, onSelect }: { doctor: AvailableDoctor; onSelect: () => void }) {
  return (
    <Card className="hover:border-primary/40 transition-all">
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold truncate">{doctor.name}</p>
              <Badge variant="outline" className="text-xs shrink-0">
                {doctor.type === 'hospital' ? 'In-House' : 'External'}
              </Badge>
            </div>
            <p className="text-sm text-primary font-medium">{doctor.specialty}</p>
            {doctor.institution && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Building2 className="h-3 w-3" />
                {doctor.institution}
              </div>
            )}
          </div>
        </div>

        {doctor.yearsExperience && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3" />
            {doctor.yearsExperience} years of experience
          </div>
        )}

        {doctor.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2">{doctor.bio}</p>
        )}

        <Button size="sm" className="w-full" onClick={onSelect}>
          View Available Slots <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
