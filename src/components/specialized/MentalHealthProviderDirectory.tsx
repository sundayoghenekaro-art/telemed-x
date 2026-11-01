import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Stethoscope, Building2, ChevronLeft, ChevronRight,
  Calendar, Clock, CheckCircle2, Loader2, Star, Brain, Heart,
  User,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, addDays, isSameDay, parseISO } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MHDoctor {
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
  time: string;
  label: string;
  available: boolean;
  availabilityId: string;
  durationMinutes: number;
}

interface Props {
  patientUserId: string;
  patientName: string;
  patientAccountId: string;
  onBookingComplete: () => void;
}

type Screen = 'browse' | 'slots' | 'confirm' | 'success';

const PSYCHIATRY_KEYWORDS = ['psychiatry', 'psychiatrist'];
const THERAPY_KEYWORDS = ['therapy', 'therapist', 'psychologist', 'counselor', 'counselling', 'psychotherapy'];

function matchesCategory(specialty: string, keywords: string[]) {
  const s = specialty.toLowerCase();
  return keywords.some(k => s.includes(k));
}

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

export function MentalHealthProviderDirectory({
  patientUserId,
  patientName,
  patientAccountId,
  onBookingComplete,
}: Props) {
  const [category, setCategory] = useState('psychiatry');
  const [doctors, setDoctors] = useState<MHDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('browse');
  const [selectedDoctor, setSelectedDoctor] = useState<MHDoctor | null>(null);

  // Slot picking state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [booking, setBooking] = useState(false);
  const [sessionCode, setSessionCode] = useState('');

  const dateOptions = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  // Fetch all mental-health doctors
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const [availRes, extRes, profRes] = await Promise.all([
        supabase.from('doctor_availability').select('*').eq('is_available', true),
        supabase.from('external_doctors').select('*').eq('status', 'approved'),
        supabase.from('profiles').select('*'),
      ]);

      const availRows: AvailabilityRow[] = availRes.data || [];
      const doctorMap = new Map<string, { type: string; name: string }>();
      availRows.forEach(a => {
        if (!doctorMap.has(a.doctor_user_id)) {
          doctorMap.set(a.doctor_user_id, { type: a.doctor_type, name: a.doctor_name });
        }
      });

      const result: MHDoctor[] = [];
      doctorMap.forEach((info, userId) => {
        if (info.type === 'external') {
          const ext = (extRes.data || []).find((e: any) => e.user_id === userId);
          if (ext) {
            const spec = ext.specialty as string;
            if (matchesCategory(spec, [...PSYCHIATRY_KEYWORDS, ...THERAPY_KEYWORDS])) {
              result.push({
                userId,
                name: ext.full_name,
                type: 'external',
                specialty: spec,
                bio: ext.bio,
                institution: ext.institution,
                yearsExperience: ext.years_experience,
              });
            }
          }
        } else {
          const prof = (profRes.data || []).find((p: any) => p.user_id === userId);
          if (prof) {
            const spec = (prof.department || 'General Practice') as string;
            if (matchesCategory(spec, [...PSYCHIATRY_KEYWORDS, ...THERAPY_KEYWORDS])) {
              result.push({
                userId,
                name: prof.full_name,
                type: 'hospital',
                specialty: spec,
                bio: null,
                institution: 'UHES Hospital',
                yearsExperience: null,
              });
            }
          }
        }
      });

      setDoctors(result);
    } catch {
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const psychiatrists = doctors.filter(d => matchesCategory(d.specialty, PSYCHIATRY_KEYWORDS));
  const therapists = doctors.filter(d => matchesCategory(d.specialty, THERAPY_KEYWORDS));
  const currentList = category === 'psychiatry' ? psychiatrists : therapists;

  // Fetch slots
  useEffect(() => {
    if (selectedDoctor && screen === 'slots') fetchSlots(selectedDoctor, selectedDate);
  }, [selectedDoctor, selectedDate, screen]);

  const fetchSlots = async (doctor: MHDoctor, date: Date) => {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const dayOfWeek = date.getDay();
      const dateStr = format(date, 'yyyy-MM-dd');

      const [availRes, sessionsRes] = await Promise.all([
        supabase.from('doctor_availability').select('*').eq('doctor_user_id', doctor.userId),
        supabase.from('telemedicine_sessions').select('scheduled_at, duration_minutes')
          .eq('doctor_user_id', doctor.userId)
          .neq('status', 'cancelled')
          .gte('scheduled_at', `${dateStr}T00:00:00`)
          .lte('scheduled_at', `${dateStr}T23:59:59`),
      ]);

      const allRows: AvailabilityRow[] = availRes.data || [];
      const isDateBlocked = allRows.some(r => r.specific_date === dateStr && !r.is_available);
      if (isDateBlocked) { setSlots([]); setLoadingSlots(false); return; }

      const specificRows = allRows.filter(r => r.specific_date === dateStr && r.is_available);
      const weeklyRows = allRows.filter(r => r.specific_date === null && r.day_of_week === dayOfWeek && r.is_available);
      const availRows2 = specificRows.length > 0 ? specificRows : weeklyRows;

      const bookedRanges: Array<{ start: number; end: number }> = [];
      (sessionsRes.data || []).forEach((s: any) => {
        const scheduled = parseISO(s.scheduled_at);
        const startMin = scheduled.getHours() * 60 + scheduled.getMinutes();
        bookedRanges.push({ start: startMin, end: startMin + (s.duration_minutes || 30) });
      });

      const isSlotBooked = (slotTime: string) => {
        const [h, m] = slotTime.split(':').map(Number);
        const slotStart = h * 60 + m;
        return bookedRanges.some(r => slotStart < r.end && (slotStart + 30) > r.start);
      };

      const allSlots: TimeSlot[] = [];
      availRows2.forEach(avail => {
        generateSlots(avail.start_time, avail.end_time).forEach(slotTime => {
          allSlots.push({
            time: slotTime,
            label: formatTime(slotTime),
            available: !isSlotBooked(slotTime),
            availabilityId: avail.id,
            durationMinutes: 30,
          });
        });
      });

      const seen = new Set<string>();
      setSlots(allSlots.filter(s => { if (seen.has(s.time)) return false; seen.add(s.time); return true; })
        .sort((a, b) => a.time.localeCompare(b.time)));
    } catch {
      toast.error('Failed to load time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const confirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot) return;
    setBooking(true);
    try {
      const code = 'MH-' + Date.now().toString(36).toUpperCase();
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
      setScreen('success');
    } catch (err: any) {
      toast.error(err.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  // ── Browse ──────────────────────────────────────────────────────────────────
  if (screen === 'browse') {
    return (
      <div className="space-y-4">
        <Tabs value={category} onValueChange={(v) => setCategory(v)}>
          <TabsList className="bg-muted border-border">
            <TabsTrigger value="psychiatry" className="data-[state=active]:bg-primary/20 text-blue-600 data-[state=active]:text-blue-700">
              <Brain className="h-3 w-3 mr-1" /> Psychiatry
            </TabsTrigger>
            <TabsTrigger value="therapy" className="data-[state=active]:bg-primary/20 text-blue-600 data-[state=active]:text-blue-700">
              <Heart className="h-3 w-3 mr-1" /> Therapy
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <User className="h-12 w-12 mx-auto text-foreground/30" />
            <p className="font-medium text-foreground">
              No {category === 'psychiatry' ? 'psychiatrists' : 'therapists'} available yet
            </p>
            <p className="text-sm text-muted-foreground">
              Mental health providers will appear here once they set their availability
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentList.map(doc => (
              <Card key={doc.userId} className="border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                      {category === 'psychiatry'
                        ? <Brain className="h-5 w-5 text-purple-400" />
                        : <Heart className="h-5 w-5 text-pink-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white truncate">{doc.name}</p>
                        <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                          {doc.type === 'hospital' ? 'In-House' : 'External'}
                        </Badge>
                      </div>
                      <p className="text-sm text-purple-300 font-medium">{doc.specialty}</p>
                      {doc.institution && (
                        <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                          <Building2 className="h-3 w-3" /> {doc.institution}
                        </div>
                      )}
                    </div>
                  </div>

                  {doc.yearsExperience && (
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <Star className="h-3 w-3" /> {doc.yearsExperience} years of experience
                    </div>
                  )}

                  {doc.bio && (
                    <p className="text-xs text-white/50 line-clamp-2">{doc.bio}</p>
                  )}

                  <Button size="sm" className="w-full" onClick={() => {
                    setSelectedDoctor(doc);
                    setSelectedDate(new Date());
                    setScreen('slots');
                  }}
                    style={{ background: 'linear-gradient(135deg, hsl(270 80% 50%), hsl(250 84% 54%))' }}>
                    View Available Slots <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Slot picker ─────────────────────────────────────────────────────────────
  if (screen === 'slots' && selectedDoctor) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setScreen('browse')}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <p className="font-semibold text-white">{selectedDoctor.name}</p>
            <p className="text-sm text-purple-300">{selectedDoctor.specialty}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-white/60">Select a date</p>
          <ScrollArea className="w-full" type="scroll">
            <div className="flex gap-2 pb-2">
              {dateOptions.map(date => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                return (
                  <button key={date.toISOString()} onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl border min-w-[64px] transition-colors ${
                      isSelected
                        ? 'bg-purple-500 text-white border-purple-400'
                        : 'bg-white/5 border-white/10 hover:border-purple-400/50 text-white/80'
                    }`}>
                    <span className="text-xs font-medium">{format(date, 'EEE')}</span>
                    <span className="text-lg font-bold">{format(date, 'd')}</span>
                    <span className="text-xs">{format(date, 'MMM')}</span>
                    {isToday && <span className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-purple-400'}`}>Today</span>}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div>
          <p className="text-sm font-medium mb-3 text-white/60">
            Available times — {format(selectedDate, 'EEEE, MMMM d')}
          </p>
          {loadingSlots ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Calendar className="h-10 w-10 mx-auto text-white/20" />
              <p className="text-sm font-medium text-white/60">No availability on this day</p>
              <p className="text-xs text-white/40">Try selecting a different date</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map(slot => (
                <button key={slot.time} disabled={!slot.available}
                  onClick={() => { setSelectedSlot(slot); setScreen('confirm'); }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    !slot.available
                      ? 'border-white/5 text-white/20 bg-white/5 cursor-not-allowed line-through'
                      : 'border-white/10 bg-white/5 hover:border-purple-400 hover:bg-purple-500/10 text-white'
                  }`}>
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Confirm ─────────────────────────────────────────────────────────────────
  if (screen === 'confirm' && selectedDoctor && selectedSlot) {
    return (
      <div className="max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setScreen('slots')}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <p className="font-semibold text-white">Confirm Booking</p>
        </div>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <Stethoscope className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-white">{selectedDoctor.name}</p>
                <p className="text-sm text-purple-300">{selectedDoctor.specialty}</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-white/60">
                <Calendar className="h-4 w-4" /> {format(selectedDate, 'MMMM d, yyyy')}
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Clock className="h-4 w-4" /> {selectedSlot.label} · {selectedSlot.durationMinutes} min
              </div>
              {selectedDoctor.institution && (
                <div className="flex items-center gap-2 text-white/60 col-span-2">
                  <Building2 className="h-4 w-4" /> {selectedDoctor.institution}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label className="text-white/70">What would you like to discuss? <span className="text-white/40 font-normal">(optional)</span></Label>
          <Textarea placeholder="Share what you'd like to focus on in your session…"
            value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)}
            rows={3} className="bg-white/10 border-white/20 text-white placeholder:text-white/30" />
        </div>

        <Button className="w-full" onClick={confirmBooking} disabled={booking}
          style={{ background: 'linear-gradient(135deg, hsl(270 80% 50%), hsl(250 84% 54%))' }}>
          {booking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Booking…</> : 'Confirm Booking'}
        </Button>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (screen === 'success' && selectedDoctor && selectedSlot) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-8">
        <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white">Booking Confirmed!</h3>
          <p className="text-white/60 text-sm">
            Your {category === 'psychiatry' ? 'psychiatry' : 'therapy'} session with {selectedDoctor.name} is
            scheduled for {format(selectedDate, 'MMMM d')} at {selectedSlot.label}.
          </p>
        </div>

        <div className="bg-white/10 rounded-xl p-4 space-y-1">
          <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Session Code</p>
          <p className="text-2xl font-mono font-bold tracking-wider text-purple-300">{sessionCode}</p>
        </div>

        <Button className="w-full" onClick={onBookingComplete}
          style={{ background: 'linear-gradient(135deg, hsl(270 80% 50%), hsl(250 84% 54%))' }}>
          <Calendar className="h-4 w-4 mr-2" /> Go to My Consultations
        </Button>
      </div>
    );
  }

  return null;
}
