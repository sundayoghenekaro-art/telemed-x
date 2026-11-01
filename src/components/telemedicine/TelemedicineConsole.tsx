import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Video, VideoOff, MessageSquare, Pill, Calendar, Clock,
  User, Plus, ChevronRight, Stethoscope,
  Activity, FileText, Loader2, Mail, CalendarDays, Shield,
  MoreVertical, Search, UserX, XCircle, CheckCircle2, Timer, ClipboardList,
  AlertCircle, Save, Users,
} from 'lucide-react';
import { ConsentRequestButton } from './ConsentRequestButton';
import { SessionChat } from './SessionChat';
import { WritePrescriptionDialog } from './WritePrescriptionDialog';
import { AvailabilityScheduler } from './AvailabilityScheduler';
import { SessionPainMapViewer } from '@/components/patient/SessionPainMapViewer';
import { toast } from 'sonner';
import { format, parseISO, isToday } from 'date-fns';

interface Session {
  id: string;
  session_code: string;
  doctor_name: string;
  doctor_type: string;
  doctor_specialty: string | null;
  patient_name: string;
  patient_user_id: string | null;
  patient_account_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  daily_room_url: string | null;
  daily_room_name: string | null;
  chief_complaint: string | null;
  notes: string | null;
  diagnosis: string | null;
  follow_up_date: string | null;
  cancelled_by: string | null;
  cancelled_reason: string | null;
  started_at: string | null;
  ended_at: string | null;
}

interface PatientOption {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface SessionPrescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  refills: number | null;
  status: string;
  created_at: string;
}

interface TelemedicineConsoleProps {
  doctorUserId: string;
  doctorName: string;
  doctorType: 'hospital' | 'external';
  doctorSpecialty?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_META: Record<string, { label: string; chip: string; dot: string }> = {
  scheduled: { label: 'Scheduled', chip: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  waiting: { label: 'In Waiting Room', chip: 'bg-amber-500/15 text-amber-700 border-amber-500/40', dot: 'bg-amber-500' },
  active: { label: 'In Consultation', chip: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40', dot: 'bg-emerald-500' },
  completed: { label: 'Completed', chip: 'bg-sky-500/10 text-sky-700 border-sky-500/30', dot: 'bg-sky-500' },
  cancelled: { label: 'Cancelled', chip: 'bg-red-500/10 text-red-700 border-red-500/30', dot: 'bg-red-500' },
  no_show: { label: 'No Show', chip: 'bg-orange-500/10 text-orange-700 border-orange-500/30', dot: 'bg-orange-500' },
};

const sendSessionNotification = async (type: string, payload: Record<string, unknown>) => {
  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token;
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${SUPABASE_URL}/functions/v1/send-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ type, ...payload }),
    }).catch(() => { /* non-blocking */ });
  } catch {
    // non-blocking
  }
};

const callDailyVideo = async (body: Record<string, unknown>) => {
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const token = authSession?.access_token;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/daily-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data } as { ok: boolean; data: any };
};

const nextHalfHourLocal = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  if (m >= 30) {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
  } else {
    d.setMinutes(30);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtElapsed = (startedAt: string | null, now: number) => {
  if (!startedAt) return '—';
  const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const isJoinable = (s: Session) =>
  ['scheduled', 'waiting', 'active'].includes(s.status);

export function TelemedicineConsole({ doctorUserId, doctorName, doctorType, doctorSpecialty }: TelemedicineConsoleProps) {
  const isDemoMode = !UUID_REGEX.test(doctorUserId);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isDemoMode);
  const [showNewSession, setShowNewSession] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [videoToken, setVideoToken] = useState<string | null>(null);
  const [startingVideo, setStartingVideo] = useState(false);
  const [tab, setTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const [prescriptions, setPrescriptions] = useState<SessionPrescription[]>([]);
  const [notesDraft, setNotesDraft] = useState({ notes: '', diagnosis: '', followUp: '' });
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const [completeForm, setCompleteForm] = useState({ diagnosis: '', followUp: '', summary: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const notesSessionRef = useRef<string | null>(null);

  const fetchSessions = async () => {
    if (isDemoMode) return;
    const { data } = await supabase
      .from('telemedicine_sessions')
      .select('*')
      .eq('doctor_user_id', doctorUserId)
      .order('scheduled_at', { ascending: false });
    if (data) setSessions(data as Session[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isDemoMode) return;
    fetchSessions();

    const channel = supabase
      .channel('telemedicine-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telemedicine_sessions' }, fetchSessions)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [doctorUserId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedId) || null,
    [sessions, selectedId],
  );

  // Reset per-session workspace state
  useEffect(() => {
    setVideoActive(false);
    setVideoToken(null);
    setNotesDirty(false);
    if (!selectedSession) {
      notesSessionRef.current = null;
      setPrescriptions([]);
      return;
    }
    if (notesSessionRef.current !== selectedSession.id) {
      notesSessionRef.current = selectedSession.id;
      setNotesDraft({
        notes: selectedSession.notes || '',
        diagnosis: selectedSession.diagnosis || '',
        followUp: selectedSession.follow_up_date || '',
      });
    }
  }, [selectedSession?.id]);

  useEffect(() => {
    if (!selectedSession) { setPrescriptions([]); return; }
    let cancelled = false;
    supabase
      .from('telemedicine_prescriptions')
      .select('id, medication_name, dosage, frequency, duration, instructions, refills, status, created_at')
      .eq('session_id', selectedSession.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setPrescriptions(data as SessionPrescription[]);
      });
    return () => { cancelled = true; };
  }, [selectedSession?.id, showPrescription]);

  const sendReminder = async (session: Session) => {
    setSendingReminder(session.id);
    try {
      await sendSessionNotification('session_reminder', {
        sessionId: session.id,
        patientAccountId: session.patient_account_id,
        patientName: session.patient_name,
        doctorName: session.doctor_name,
        doctorSpecialty: session.doctor_specialty,
        scheduledAt: session.scheduled_at,
        durationMinutes: session.duration_minutes,
        sessionCode: session.session_code,
      });
      toast.success(`Reminder sent to ${session.patient_name}`);
    } catch {
      toast.warning('Could not send reminder email');
    } finally {
      setSendingReminder(null);
    }
  };

  const updateSession = async (sessionId: string, update: Record<string, unknown>, successMessage?: string) => {
    const { error } = await supabase.from('telemedicine_sessions').update(update).eq('id', sessionId);
    if (error) {
      toast.error('Failed to update session');
      return false;
    }
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, ...(update as Partial<Session>) } : s));
    if (successMessage) toast.success(successMessage);
    return true;
  };

  const startVideoSession = async (session: Session) => {
    setStartingVideo(true);
    try {
      const { ok, data } = await callDailyVideo({ action: 'create_room', sessionId: session.id });
      if (!ok) {
        toast.error(data.error || 'Failed to create video room');
        return;
      }
      setVideoToken(data.token);
      setVideoActive(true);
      setSessions((prev) => prev.map((s) => s.id === session.id
        ? {
            ...s,
            daily_room_url: data.roomUrl,
            daily_room_name: data.roomName,
            status: 'active',
            started_at: s.started_at || new Date().toISOString(),
          }
        : s));

      await supabase.from('session_messages').insert({
        session_id: session.id,
        sender_id: doctorUserId,
        sender_name: 'System',
        sender_role: 'doctor',
        content: `Video consultation started by Dr. ${doctorName}`,
        message_type: 'system',
      });

      toast.success('Video room ready — you are live');
    } catch {
      toast.error('Failed to start video session');
    } finally {
      setStartingVideo(false);
    }
  };

  const deleteRoom = async (sessionId: string) => {
    try {
      await callDailyVideo({ action: 'delete_room', sessionId });
    } catch {
      // Room cleanup is best-effort
    }
  };

  const saveNotes = async () => {
    if (!selectedSession) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('telemedicine_sessions')
        .update({
          notes: notesDraft.notes || null,
          diagnosis: notesDraft.diagnosis || null,
          follow_up_date: notesDraft.followUp || null,
        })
        .eq('id', selectedSession.id);
      if (error) throw error;
      setSessions((prev) => prev.map((s) => s.id === selectedSession.id
        ? {
            ...s,
            notes: notesDraft.notes || null,
            diagnosis: notesDraft.diagnosis || null,
            follow_up_date: notesDraft.followUp || null,
          }
        : s));
      setNotesDirty(false);
      toast.success('Clinical record saved');
    } catch {
      toast.error('Could not save clinical notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const completeVisit = async () => {
    if (!selectedSession) return;
    if (!completeForm.diagnosis.trim()) {
      toast.error('A diagnosis or assessment is required to complete the visit');
      return;
    }
    setUpdating(true);
    try {
      const endedAt = new Date().toISOString();
      const mergedNotes = notesDraft.notes?.trim() || null;
      const ok = await updateSession(selectedSession.id, {
        status: 'completed',
        ended_at: endedAt,
        diagnosis: completeForm.diagnosis.trim(),
        follow_up_date: completeForm.followUp || null,
        ...(mergedNotes ? { notes: mergedNotes } : {}),
      }, 'Visit completed — summary sent to the patient');
      if (!ok) return;

      const summaryParts = [
        `Consultation completed — diagnosis: ${completeForm.diagnosis.trim()}`,
        completeForm.followUp ? `follow-up on ${format(parseISO(completeForm.followUp), 'MMM d, yyyy')}` : null,
        completeForm.summary.trim() ? completeForm.summary.trim() : null,
      ].filter(Boolean);

      await supabase.from('session_messages').insert({
        session_id: selectedSession.id,
        sender_id: doctorUserId,
        sender_name: 'System',
        sender_role: 'doctor',
        content: summaryParts.join(' • '),
        message_type: 'system',
      });

      await deleteRoom(selectedSession.id);
      setVideoActive(false);
      setVideoToken(null);
      setShowComplete(false);
      setCompleteForm({ diagnosis: '', followUp: '', summary: '' });
      setNotesDirty(false);
    } finally {
      setUpdating(false);
    }
  };

  const cancelSession = async () => {
    if (!selectedSession) return;
    if (!cancelReason.trim()) {
      toast.error('Add a reason so the patient is informed');
      return;
    }
    setUpdating(true);
    try {
      const ok = await updateSession(selectedSession.id, {
        status: 'cancelled',
        cancelled_by: `Dr. ${doctorName}`,
        cancelled_reason: cancelReason.trim(),
        ended_at: new Date().toISOString(),
      }, 'Session cancelled');
      if (!ok) return;

      await supabase.from('session_messages').insert({
        session_id: selectedSession.id,
        sender_id: doctorUserId,
        sender_name: 'System',
        sender_role: 'doctor',
        content: `Session cancelled by Dr. ${doctorName}: ${cancelReason.trim()}`,
        message_type: 'system',
      });

      await deleteRoom(selectedSession.id);
      setVideoActive(false);
      setVideoToken(null);
      setShowCancel(false);
      setCancelReason('');
    } finally {
      setUpdating(false);
    }
  };

  const markNoShow = async (session: Session) => {
    const ok = await updateSession(session.id, {
      status: 'no_show',
      ended_at: new Date().toISOString(),
    }, 'Marked as no-show');
    if (ok) {
      await supabase.from('session_messages').insert({
        session_id: session.id,
        sender_id: doctorUserId,
        sender_name: 'System',
        sender_role: 'doctor',
        content: 'Patient did not attend the scheduled consultation.',
        message_type: 'system',
      });
    }
  };

  const openCompleteDialog = (session: Session) => {
    setCompleteForm({
      diagnosis: session.diagnosis || notesDraft.diagnosis || '',
      followUp: session.follow_up_date || '',
      summary: '',
    });
    setShowComplete(true);
  };

  const updateSessionStatus = async (sessionId: string, status: string) => {
    await updateSession(sessionId, { status }, status === 'waiting' ? 'Patient moved to the waiting room' : undefined);
  };

  const replaceSession = (session: Session) => {
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === session.id);
      return exists ? prev.map((s) => s.id === session.id ? session : s) : [session, ...prev];
    });
  };

  const sortedQueue = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = (s: Session) =>
      !term ||
      s.patient_name.toLowerCase().includes(term) ||
      s.session_code.toLowerCase().includes(term) ||
      (s.chief_complaint || '').toLowerCase().includes(term);

    return {
      active: sessions
        .filter((s) => s.status === 'active' && matches(s))
        .sort((a, b) => (a.started_at || a.scheduled_at).localeCompare(b.started_at || b.scheduled_at)),
      upcoming: sessions
        .filter((s) => ['scheduled', 'waiting'].includes(s.status) && matches(s))
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'waiting' ? -1 : 1;
          return a.scheduled_at.localeCompare(b.scheduled_at);
        }),
      past: sessions
        .filter((s) => ['completed', 'cancelled', 'no_show'].includes(s.status) && matches(s))
        .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    };
  }, [sessions, search]);

  const stats = useMemo(() => {
    const today = sessions.filter((s) => isToday(parseISO(s.scheduled_at)));
    return {
      today: today.length,
      waiting: sessions.filter((s) => s.status === 'waiting').length,
      active: sessions.filter((s) => s.status === 'active').length,
      completedToday: today.filter((s) => s.status === 'completed').length,
    };
  }, [sessions]);

  if (isDemoMode) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="max-w-md text-center space-y-4 p-8">
          <div className="p-4 rounded-full bg-muted inline-flex mx-auto">
            <Video className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Demo Mode — Consultations Unavailable</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Telemedicine sessions require a real authenticated account. Demo login uses a mock ID that cannot pass security checks.
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in with a real staff account to create and manage telemedicine sessions, or use the <strong>Practitioner Applications</strong> tab to review external doctor requests.
          </p>
        </div>
      </div>
    );
  }

  const statusMeta = selectedSession ? (STATUS_META[selectedSession.status] || STATUS_META.scheduled) : STATUS_META.scheduled;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Header + stats */}
      <div className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" /> Consultation Console
            </h2>
            <p className="text-xs text-muted-foreground">
              {doctorType === 'hospital' ? 'In-house' : 'External'} physician • {doctorSpecialty || 'General Practice'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={showAvailability ? 'default' : 'outline'}
              onClick={() => setShowAvailability((v) => !v)}
            >
              <CalendarDays className="h-4 w-4 mr-1" /> Availability
            </Button>
            <Button size="sm" onClick={() => setShowNewSession(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Session
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Today', value: stats.today, icon: Calendar, tone: 'text-foreground' },
            { label: 'Waiting room', value: stats.waiting, icon: Timer, tone: stats.waiting ? 'text-amber-600' : 'text-foreground' },
            { label: 'In consultation', value: stats.active, icon: Activity, tone: stats.active ? 'text-emerald-600' : 'text-foreground' },
            { label: 'Completed today', value: stats.completedToday, icon: CheckCircle2, tone: 'text-sky-600' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="rounded-lg bg-muted p-2">
                  <Icon className={`h-4 w-4 ${tone}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xl font-bold leading-none ${tone}`}>{value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {showAvailability ? (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Weekly Availability</h3>
            <span className="text-xs text-muted-foreground">Patients can only book inside these windows</span>
          </div>
          <AvailabilityScheduler doctorUserId={doctorUserId} doctorName={doctorName} doctorType={doctorType} />
        </div>
      ) : (
        <div className="grid flex-1 min-h-0 gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
          {/* Queue */}
          <Card className="flex min-h-0 flex-col xl:h-full">
            <CardHeader className="pb-2 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Session Queue</CardTitle>
                <Badge variant="outline" className="text-[10px]">{sessions.length} total</Badge>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Patient, code or complaint…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pt-0">
              <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col">
                <TabsList className="grid grid-cols-3 w-full text-[11px] h-8 shrink-0">
                  <TabsTrigger value="active" className="text-[11px]">Active{stats.active ? ` (${stats.active})` : ''}</TabsTrigger>
                  <TabsTrigger value="upcoming" className="text-[11px]">Upcoming{stats.waiting ? ` (${stats.waiting})` : ''}</TabsTrigger>
                  <TabsTrigger value="past" className="text-[11px]">Past</TabsTrigger>
                </TabsList>

                {['active', 'upcoming', 'past'].map((key) => {
                  const list = sortedQueue[key as keyof typeof sortedQueue];
                  return (
                    <TabsContent key={key} value={key} className="flex-1 min-h-0 mt-2">
                      <ScrollArea className="h-full max-h-[calc(100vh-330px)] pr-1">
                        <div className="space-y-2">
                          {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                          ) : list.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground">
                              No {key} sessions
                            </div>
                          ) : list.map((session) => (
                            <QueueItem
                              key={session.id}
                              session={session}
                              selected={session.id === selectedId}
                              onClick={() => setSelectedId(session.id)}
                              onRemind={key === 'upcoming' ? () => sendReminder(session) : undefined}
                              reminding={sendingReminder === session.id}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>

          {/* Workspace */}
          <div className="min-w-0 min-h-0 xl:overflow-y-auto xl:pr-1">
            {!selectedSession ? (
              <Card className="h-full min-h-[360px] border-dashed">
                <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-semibold">Select a consultation</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Pick a session from the queue to open the waiting room, video, chat, notes and prescription tools.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setShowNewSession(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Schedule a session
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Session header */}
                <Card>
                  <CardContent className="py-3 px-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 rounded-full bg-muted shrink-0">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{selectedSession.patient_name}</p>
                            <Badge variant="outline" className={`text-[10px] ${statusMeta.chip}`}>{statusMeta.label}</Badge>
                            <code className="text-[10px] text-muted-foreground">{selectedSession.session_code}</code>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(parseISO(selectedSession.scheduled_at), 'EEE, MMM d • h:mm a')} • {selectedSession.duration_minutes} min
                          </p>
                          {selectedSession.chief_complaint && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              <span className="font-medium text-foreground">Reason:</span> {selectedSession.chief_complaint}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedSession.status === 'active' && (
                          <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-mono">
                            <Timer className="h-3 w-3" /> {fmtElapsed(selectedSession.started_at, now)}
                          </Badge>
                        )}
                        {selectedSession.status === 'scheduled' && (
                          <Button size="sm" variant="outline" onClick={() => updateSessionStatus(selectedSession.id, 'waiting')}>
                            <Timer className="h-4 w-4 mr-1" /> Patient waiting
                          </Button>
                        )}
                        {isJoinable(selectedSession) && (
                          <Button size="sm" onClick={() => startVideoSession(selectedSession)} disabled={startingVideo}>
                            {startingVideo
                              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              : <Video className="h-4 w-4 mr-1" />}
                            {startingVideo ? 'Connecting…' : selectedSession.status === 'active' ? 'Rejoin Video' : 'Start Video'}
                          </Button>
                        )}
                        {selectedSession.status === 'active' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setShowPrescription(true)}>
                              <Pill className="h-4 w-4 mr-1" /> Prescribe
                            </Button>
                            <Button size="sm" onClick={() => openCompleteDialog(selectedSession)}>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Visit
                            </Button>
                          </>
                        )}
                        {['scheduled', 'waiting', 'active'].includes(selectedSession.status) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {selectedSession.patient_account_id && (
                                <DropdownMenuItem onClick={() => sendReminder(selectedSession)}>
                                  <Mail className="h-4 w-4 mr-2" /> Send reminder email
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => markNoShow(selectedSession)}>
                                <UserX className="h-4 w-4 mr-2" /> Mark no-show
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => setShowCancel(true)}>
                                <XCircle className="h-4 w-4 mr-2" /> Cancel session
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Status stepper */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      {['scheduled', 'waiting', 'active', 'completed'].map((stage, idx) => {
                        const order = ['scheduled', 'waiting', 'active', 'completed'];
                        const currentIdx = order.indexOf(selectedSession.status);
                        const isPast = currentIdx >= 0 && idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        if (['cancelled', 'no_show'].includes(selectedSession.status)) {
                          return (
                            <span key={stage} className="text-muted-foreground">
                              {idx > 0 && <span className="mx-1">→</span>}
                              {stage === 'active' ? selectedSession.status.replace('_', ' ') : stage}
                            </span>
                          );
                        }
                        return (
                          <span key={stage} className="flex items-center gap-1.5">
                            {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                            <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 capitalize ${
                              isCurrent
                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                : isPast
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                                  : 'border-border text-muted-foreground'
                            }`}>
                              {stage}
                            </span>
                          </span>
                        );
                      })}
                      {['cancelled', 'no_show'].includes(selectedSession.status) && (
                        <Badge variant="outline" className={`ml-1 text-[10px] ${statusMeta.chip}`}>
                          {statusMeta.label}
                          {selectedSession.cancelled_reason ? ` — ${selectedSession.cancelled_reason}` : ''}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
                  {/* Main column */}
                  <div className="min-w-0 space-y-3">
                    {selectedSession.status === 'completed' || selectedSession.status === 'cancelled' || selectedSession.status === 'no_show' ? (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-primary" /> Visit Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {(selectedSession.diagnosis || selectedSession.notes) ? (
                            <>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Diagnosis / Assessment</p>
                                <p className="text-sm mt-0.5">{selectedSession.diagnosis || 'Not recorded'}</p>
                              </div>
                              {selectedSession.notes && (
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Clinical Notes</p>
                                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{selectedSession.notes}</p>
                                </div>
                              )}
                              <Separator />
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Started</p>
                                  <p className="font-medium">
                                    {selectedSession.started_at ? format(new Date(selectedSession.started_at), 'MMM d, h:mm a') : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Ended</p>
                                  <p className="font-medium">
                                    {selectedSession.ended_at ? format(new Date(selectedSession.ended_at), 'MMM d, h:mm a') : '—'}
                                  </p>
                                </div>
                              </div>
                              {selectedSession.follow_up_date && (
                                <Badge variant="outline" className="bg-sky-500/10 text-sky-700 border-sky-500/30">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Follow-up {format(parseISO(selectedSession.follow_up_date), 'MMM d, yyyy')}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <div className="rounded-lg border border-dashed border-border p-4 text-center">
                              <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground/50 mb-1" />
                              <p className="text-sm text-muted-foreground">No clinical summary recorded for this session.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="overflow-hidden">
                        <div className="relative aspect-video bg-slate-950">
                          {videoActive && selectedSession.daily_room_url && videoToken ? (
                            <>
                              <iframe
                                src={`${selectedSession.daily_room_url}?t=${videoToken}`}
                                allow="camera; microphone; fullscreen; display-capture; autoplay"
                                className="h-full w-full"
                                title="Video consultation"
                              />
                              <div className="absolute top-2 right-2 flex gap-1.5">
                                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => setVideoActive(false)}>
                                  <VideoOff className="h-3.5 w-3.5 mr-1" /> Hide
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
                              <div className="rounded-full bg-white/5 p-4 ring-1 ring-white/10">
                                <Video className="h-7 w-7" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-100">
                                  {selectedSession.status === 'active'
                                    ? 'Consultation in progress'
                                    : selectedSession.status === 'waiting'
                                      ? `${selectedSession.patient_name} is in the waiting room`
                                      : 'Waiting room is ready'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {selectedSession.status === 'scheduled'
                                    ? 'Start the call to admit the patient when you are ready.'
                                    : 'Join the secure video room to begin the consultation.'}
                                </p>
                              </div>
                              <Button size="sm" onClick={() => startVideoSession(selectedSession)} disabled={startingVideo}>
                                {startingVideo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Video className="h-4 w-4 mr-1" />}
                                {startingVideo ? 'Connecting…' : 'Start Secure Video'}
                              </Button>
                              <p className="text-[10px] text-slate-500">End-to-end encrypted room • camera &amp; mic required</p>
                            </div>
                          )}
                        </div>
                        <CardContent className="py-2.5 px-3 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Shield className="h-3 w-3" /> Private room
                          </Badge>
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Clock className="h-3 w-3" /> {selectedSession.duration_minutes} min slot
                          </Badge>
                          {selectedSession.daily_room_url && (
                            <Badge variant="outline" className="gap-1 text-[10px] text-emerald-700 border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" /> Room provisioned
                            </Badge>
                          )}
                          <div className="ml-auto flex items-center gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowPrescription(true)}>
                              <Pill className="h-3.5 w-3.5 mr-1" /> Prescribe
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openCompleteDialog(selectedSession)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <ConsentRequestButton
                      sessionId={selectedSession.id}
                      doctorUserId={doctorUserId}
                      patientUserId={selectedSession.patient_user_id}
                      patientName={selectedSession.patient_name}
                    />
                  </div>

                  {/* Right rail */}
                  <div className="min-w-0">
                    <Tabs defaultValue="chat" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 h-8">
                        <TabsTrigger value="chat" className="text-[11px]"><MessageSquare className="h-3.5 w-3.5 mr-1" />Chat</TabsTrigger>
                        <TabsTrigger value="notes" className="text-[11px]"><FileText className="h-3.5 w-3.5 mr-1" />Notes</TabsTrigger>
                        <TabsTrigger value="rx" className="text-[11px]"><Pill className="h-3.5 w-3.5 mr-1" />Rx</TabsTrigger>
                        <TabsTrigger value="patient" className="text-[11px]"><User className="h-3.5 w-3.5 mr-1" />Patient</TabsTrigger>
                      </TabsList>

                      <TabsContent value="chat" className="mt-2">
                        <div className="rounded-xl border border-border bg-card overflow-hidden h-[380px]">
                          <SessionChat
                            sessionId={selectedSession.id}
                            currentUserId={doctorUserId}
                            currentUserName={`Dr. ${doctorName}`}
                            currentRole="doctor"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="notes" className="mt-2">
                        <Card>
                          <CardContent className="pt-4 space-y-3">
                            {selectedSession.chief_complaint && (
                              <div className="rounded-lg bg-muted/60 p-2.5">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Patient's reason for visit</p>
                                <p className="text-xs mt-0.5">{selectedSession.chief_complaint}</p>
                              </div>
                            )}
                            <div className="space-y-1">
                              <Label className="text-xs">Clinical notes</Label>
                              <Textarea
                                rows={5}
                                placeholder="History, examination findings, plan…"
                                value={notesDraft.notes}
                                onChange={(e) => { setNotesDraft((f) => ({ ...f, notes: e.target.value })); setNotesDirty(true); }}
                                className="text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Diagnosis / assessment</Label>
                              <Textarea
                                rows={2}
                                placeholder="Working diagnosis"
                                value={notesDraft.diagnosis}
                                onChange={(e) => { setNotesDraft((f) => ({ ...f, diagnosis: e.target.value })); setNotesDirty(true); }}
                                className="text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Follow-up date</Label>
                              <Input
                                type="date"
                                value={notesDraft.followUp}
                                onChange={(e) => { setNotesDraft((f) => ({ ...f, followUp: e.target.value })); setNotesDirty(true); }}
                                className="h-8 text-xs"
                              />
                            </div>
                            <Button size="sm" className="w-full" onClick={saveNotes} disabled={savingNotes || !notesDirty}>
                              {savingNotes ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                              {notesDirty ? 'Save clinical record' : 'Saved'}
                            </Button>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="rx" className="mt-2">
                        <Card>
                          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm">Prescriptions</CardTitle>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowPrescription(true)}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> New
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {prescriptions.length === 0 ? (
                              <div className="rounded-lg border border-dashed p-4 text-center">
                                <Pill className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
                                <p className="text-xs text-muted-foreground">No prescriptions for this visit</p>
                              </div>
                            ) : prescriptions.map((rx) => (
                              <div key={rx.id} className="rounded-lg border border-border p-2.5 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-semibold">{rx.medication_name} {rx.dosage}</p>
                                  <Badge variant="outline" className="text-[9px] capitalize">{rx.status}</Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{rx.frequency} • {rx.duration}{rx.refills ? ` • ${rx.refills} refill(s)` : ''}</p>
                                {rx.instructions && <p className="text-[11px] text-muted-foreground italic">{rx.instructions}</p>}
                                <p className="text-[10px] text-muted-foreground">{format(new Date(rx.created_at), 'MMM d, h:mm a')}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="patient" className="mt-2">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Patient Overview</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-primary/10 p-2"><User className="h-4 w-4 text-primary" /></div>
                              <div>
                                <p className="font-semibold text-sm">{selectedSession.patient_name}</p>
                                <p className="text-muted-foreground">
                                  {selectedSession.patient_account_id ? 'Registered patient' : 'Unregistered / walk-in'}
                                </p>
                              </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-2">
                              <div><p className="text-muted-foreground">Session code</p><p className="font-mono">{selectedSession.session_code}</p></div>
                              <div><p className="text-muted-foreground">Duration</p><p>{selectedSession.duration_minutes} min</p></div>
                              <div><p className="text-muted-foreground">Scheduled</p><p>{format(parseISO(selectedSession.scheduled_at), 'MMM d, h:mm a')}</p></div>
                              <div><p className="text-muted-foreground">Status</p><p className="capitalize">{selectedSession.status.replace('_', ' ')}</p></div>
                            </div>
                            <Separator />
                            <div>
                              <p className="text-muted-foreground mb-1">Pain map shared by patient</p>
                              <SessionPainMapViewer sessionId={selectedSession.id} />
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <NewSessionDialog
        open={showNewSession}
        onOpenChange={setShowNewSession}
        doctorUserId={doctorUserId}
        doctorName={doctorName}
        doctorType={doctorType}
        doctorSpecialty={doctorSpecialty}
        onCreated={(session) => {
          replaceSession(session);
          setSelectedId(session.id);
          setTab('upcoming');
        }}
      />

      {selectedSession && (
        <>
          <WritePrescriptionDialog
            open={showPrescription}
            onOpenChange={setShowPrescription}
            sessionId={selectedSession.id}
            doctorUserId={doctorUserId}
            doctorName={doctorName}
            patientName={selectedSession.patient_name}
            patientAccountId={selectedSession.patient_account_id}
            onPrescriptionWritten={() => { /* list refreshes when the dialog closes */ }}
          />

          <Dialog open={showComplete} onOpenChange={setShowComplete}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Complete Consultation
                </DialogTitle>
                <DialogDescription>
                  Record the outcome. The patient will see the diagnosis and any follow-up date in their portal.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Diagnosis / assessment *</Label>
                  <Textarea
                    rows={2}
                    value={completeForm.diagnosis}
                    onChange={(e) => setCompleteForm((f) => ({ ...f, diagnosis: e.target.value }))}
                    placeholder="e.g. Acute viral pharyngitis"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Follow-up date</Label>
                  <Input
                    type="date"
                    value={completeForm.followUp}
                    onChange={(e) => setCompleteForm((f) => ({ ...f, followUp: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notes for the patient</Label>
                  <Textarea
                    rows={3}
                    value={completeForm.summary}
                    onChange={(e) => setCompleteForm((f) => ({ ...f, summary: e.target.value }))}
                    placeholder="Advice, red flags, when to seek urgent care…"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowComplete(false)}>Cancel</Button>
                <Button onClick={completeVisit} disabled={updating}>
                  {updating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Complete &amp; Send Summary
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCancel} onOpenChange={setShowCancel}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" /> Cancel Consultation
                </DialogTitle>
                <DialogDescription>
                  The reason is shared with the patient in the session chat.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1">
                <Label>Cancellation reason *</Label>
                <Textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Emergency case, please rebook"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCancel(false)}>Keep Session</Button>
                <Button variant="destructive" onClick={cancelSession} disabled={updating}>
                  {updating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Cancel Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function QueueItem({
  session, selected, onClick, onRemind, reminding,
}: {
  session: Session;
  selected: boolean;
  onClick: () => void;
  onRemind?: () => void;
  reminding?: boolean;
}) {
  const meta = STATUS_META[session.status] || STATUS_META.scheduled;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={`w-full text-left rounded-lg border p-2.5 transition-all cursor-pointer ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            <p className="text-xs font-semibold truncate">{session.patient_name}</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {format(parseISO(session.scheduled_at), 'MMM d • h:mm a')} • {session.duration_minutes}m
          </p>
        </div>
        {onRemind ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            title="Send reminder"
            disabled={reminding}
            onClick={(e) => { e.stopPropagation(); onRemind(); }}
          >
            {reminding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
          </Button>
        ) : (
          <Badge variant="outline" className={`text-[9px] shrink-0 ${meta.chip}`}>{meta.label}</Badge>
        )}
      </div>
      {session.chief_complaint && (
        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{session.chief_complaint}</p>
      )}
    </div>
  );
}

function NewSessionDialog({
  open, onOpenChange, doctorUserId, doctorName, doctorType, doctorSpecialty, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorUserId: string;
  doctorName: string;
  doctorType: 'hospital' | 'external';
  doctorSpecialty?: string;
  onCreated: (session: Session) => void;
}) {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PatientOption | null>(null);
  const [manualName, setManualName] = useState('');
  const [scheduledAt, setScheduledAt] = useState(nextHalfHourLocal);
  const [duration, setDuration] = useState('30');
  const [complaint, setComplaint] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScheduledAt(nextHalfHourLocal());
    setSelected(null);
    setQuery('');
    setManualName('');
    setComplaint('');
    setDuration('30');
    supabase
      .from('patient_accounts')
      .select('id, user_id, full_name, email, phone')
      .order('full_name')
      .limit(200)
      .then(({ data }) => { if (data) setPatients(data as PatientOption[]); });
  }, [open]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return patients.slice(0, 6);
    return patients
      .filter((p) => p.full_name.toLowerCase().includes(term) || (p.email || '').toLowerCase().includes(term))
      .slice(0, 8);
  }, [patients, query]);

  const patientName = selected?.full_name || manualName.trim();

  const submit = async () => {
    if (!patientName) {
      toast.error('Select a registered patient or enter a name');
      return;
    }
    if (!scheduledAt) {
      toast.error('Choose the appointment date and time');
      return;
    }
    setSaving(true);
    try {
      const iso = new Date(scheduledAt).toISOString();
      const code = `TM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const { data, error } = await supabase
        .from('telemedicine_sessions')
        .insert({
          session_code: code,
          doctor_user_id: doctorUserId,
          doctor_name: doctorName,
          doctor_type: doctorType,
          doctor_specialty: doctorSpecialty || null,
          patient_name: patientName,
          patient_user_id: selected?.user_id || null,
          patient_account_id: selected?.id || null,
          scheduled_at: iso,
          duration_minutes: parseInt(duration, 10) || 30,
          chief_complaint: complaint.trim() || null,
          status: 'scheduled',
        })
        .select()
        .single();
      if (error) throw error;

      if (selected) {
        sendSessionNotification('session_reminder', {
          sessionId: data.id,
          patientAccountId: selected.id,
          patientName: selected.full_name,
          doctorName,
          doctorSpecialty,
          scheduledAt: iso,
          durationMinutes: parseInt(duration, 10) || 30,
          sessionCode: code,
        });
      }

      toast.success(`Session scheduled with ${patientName}`);
      onCreated(data as Session);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Could not schedule the session');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Schedule a Consultation
          </DialogTitle>
          <DialogDescription>
            Link a registered patient so they receive reminders and can join from their portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Registered patient</Label>
            {selected ? (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selected.full_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{selected.email || selected.phone || 'No contact details'}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setSelected(null)}>Change</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search patients by name or email…"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                {query.trim() && (
                  <div className="rounded-lg border border-border divide-y divide-border max-h-40 overflow-y-auto">
                    {matches.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No registered patient matched.</p>
                    ) : matches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted/60"
                        onClick={() => { setSelected(p); setQuery(''); }}
                      >
                        <p className="text-xs font-medium">{p.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.email || p.phone || p.user_id}</p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Or type a walk-in patient name"
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date &amp; time *</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['15', '30', '45', '60'].map((d) => (
                    <SelectItem key={d} value={d}>{d} minutes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Reason for visit</Label>
            <Textarea
              rows={2}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Symptoms or purpose of the consultation…"
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            {saving ? 'Scheduling…' : 'Schedule Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
