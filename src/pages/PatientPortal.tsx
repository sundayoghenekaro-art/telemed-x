import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionChat } from '@/components/telemedicine/SessionChat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, MessageSquare, Pill, Calendar, LogOut, Heart, ChevronRight, Clock, Loader2, Plus, Zap, FileText, Brain, HandHeart, Shield, FolderOpen, Activity, User, Wallet, Flame, ClipboardList, Stethoscope, Globe, FileJson, Ambulance, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { PatientAuth } from './PatientAuth';
import { PatientBookingTab } from '@/components/telemedicine/PatientBookingTab';
import { ConsentRequestPopup } from '@/components/telemedicine/ConsentRequestPopup';
import { PatientReferralsView } from '@/components/vendors/PatientReferralsView';
import { MentalHealthPortal } from '@/components/specialized/MentalHealthPortal';
import { CaregivingSection } from '@/components/specialized/CaregivingSection';
import { AnonymousConsultation } from '@/components/specialized/AnonymousConsultation';
import { PreSessionMoodCheckIn } from '@/components/telemedicine/PreSessionMoodCheckIn';
import { MedicalRecordsTab } from '@/components/patient/MedicalRecordsTab';
import { MedicationsTab } from '@/components/patient/MedicationsTab';
import { VitalsDashboard } from '@/components/patient/VitalsDashboard';
import { PatientHomeCards } from '@/components/patient/PatientHomeCards';
import { PainBodyMap } from '@/components/patient/PainBodyMap';
import { EmergencyResponseTab } from '@/components/patient/EmergencyResponseTab';
import { SessionPainMapEditor } from '@/components/patient/SessionPainMapEditor';
import { PatientWallet } from '@/components/patient/PatientWallet';
import { LifestyleTracker } from '@/components/patient/LifestyleTracker';
import { CarePlanView } from '@/components/patient/CarePlanView';
import { TriageAssistant } from '@/components/patient/TriageAssistant';
import { MedicationAdherence } from '@/components/patient/MedicationAdherence';
import { MultilingualSettings } from '@/components/patient/MultilingualSettings';
import { FhirExportView } from '@/components/patient/FhirExportView';
import { PatientProfileTab } from '@/components/patient/PatientProfileTab';
import { HealthProgrammesTab } from '@/components/patient/HealthProgrammesTab';

interface PatientSession {
  id: string;
  session_code: string;
  doctor_name: string;
  doctor_specialty: string | null;
  patient_name: string;
  patient_user_id: string | null;
  patient_account_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  daily_room_url: string | null;
  chief_complaint: string | null;
  diagnosis: string | null;
  notes?: string | null;
  follow_up_date?: string | null;
  cancelled_by?: string | null;
  cancelled_reason?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  refills: number;
  status: string;
  doctor_name: string;
  created_at: string;
}

interface PatientState {
  userId: string;
  patientName: string;
  accountId: string;
  gender: string | null;
}

const NAV_GROUPS = [
  {
    label: 'Care',
    items: [
      { key: 'sessions', icon: Calendar, label: 'My Consultations' },
      { key: 'book', icon: Plus, label: 'Book a Session' },
      { key: 'emergency', icon: Ambulance, label: 'Emergency Ambulance' },
      { key: 'triage', icon: Stethoscope, label: 'AI Symptom Checker' },
      { key: 'programmes', icon: Heart, label: 'Health Programmes' },
    ],
  },
  {
    label: 'Medications',
    items: [
      { key: 'prescriptions', icon: Pill, label: 'Prescriptions' },
      { key: 'medications', icon: Pill, label: 'Active Medications' },
      { key: 'adherence', icon: Pill, label: 'Medication Tracking' },
    ],
  },
  {
    label: 'Health Records',
    items: [
      { key: 'records', icon: FolderOpen, label: 'Medical Records' },
      { key: 'vitals', icon: Activity, label: 'Vitals' },
      { key: 'pain-map', icon: User, label: 'Pain Body Map' },
      { key: 'care-plans', icon: ClipboardList, label: 'Care Plans' },
      { key: 'fhir', icon: FileJson, label: 'Health Export' },
    ],
  },
  {
    label: 'Wellbeing & Support',
    items: [
      { key: 'mental-health', icon: Brain, label: 'Mental Health' },
      { key: 'caregiving', icon: HandHeart, label: 'Caregiver Support' },
      { key: 'referrals', icon: FileText, label: 'Referrals' },
      { key: 'lifestyle', icon: Flame, label: 'Lifestyle' },
      { key: 'anonymous', icon: Shield, label: 'Confidential Consult' },
    ],
  },
  {
    label: 'Account',
    items: [
      { key: 'wallet', icon: Wallet, label: 'My Wallet' },
      { key: 'profile', icon: User, label: 'My Profile' },
      { key: 'language', icon: Globe, label: 'Language' },
    ],
  },
];

export function PatientPortal() {
  const [patient, setPatient] = useState<PatientState | null>(null);
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [activeSession, setActiveSession] = useState<PatientSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [videoJoined, setVideoJoined] = useState(false);
  const [moodCheckSession, setMoodCheckSession] = useState<PatientSession | null>(null);
  const [sessionRx, setSessionRx] = useState<Prescription[]>([]);
  const [notifyingReady, setNotifyingReady] = useState(false);
  const [railTab, setRailTab] = useState('chat');

  useEffect(() => {
    if (!patient) return;
    fetchData();

    const channel = supabase
      .channel('patient-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telemedicine_sessions' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [patient]);

  const fetchData = async () => {
    if (!patient) return;
    setLoading(true);

    const [sessionsRes, prescriptionsRes] = await Promise.all([
      supabase.from('telemedicine_sessions').select('*')
        .eq('patient_user_id', patient.userId)
        .order('scheduled_at', { ascending: false }),
      supabase.from('telemedicine_prescriptions').select('*')
        .eq('patient_account_id', patient.accountId)
        .order('created_at', { ascending: false }),
    ]);

    if (sessionsRes.data) setSessions(sessionsRes.data as PatientSession[]);
    if (prescriptionsRes.data) setPrescriptions(prescriptionsRes.data as Prescription[]);
    setLoading(false);
  };

  const [joiningVideo, setJoiningVideo] = useState(false);
  const [videoToken, setVideoToken] = useState<string | null>(null);

  const joinSession = async (session: PatientSession) => {
    setActiveSession(session);
    setVideoJoined(false);
    setVideoToken(null);
    setRailTab('chat');
  };

  // Keep the open consultation in sync with realtime session updates (room ready, status changes)
  useEffect(() => {
    if (!activeSession) return;
    const fresh = sessions.find((s) => s.id === activeSession.id);
    if (fresh && fresh.status !== activeSession.status) setActiveSession(fresh);
    if (fresh && fresh.daily_room_url !== activeSession.daily_room_url) setActiveSession(fresh);
  }, [sessions]);

  useEffect(() => {
    if (!activeSession) { setSessionRx([]); return; }
    let cancelled = false;
    supabase
      .from('telemedicine_prescriptions')
      .select('id, medication_name, dosage, frequency, duration, instructions, refills, status, doctor_name, created_at')
      .eq('session_id', activeSession.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setSessionRx(data as Prescription[]);
      });
    return () => { cancelled = true; };
  }, [activeSession?.id]);

  const notifyReady = async (session: PatientSession) => {
    if (!patient) return;
    setNotifyingReady(true);
    try {
      const { error } = await supabase.from('session_messages').insert({
        session_id: session.id,
        sender_id: patient.userId,
        sender_name: patient.patientName,
        sender_role: 'patient',
        content: `${patient.patientName} is waiting in the waiting room`,
        message_type: 'system',
      });
      if (error) throw error;
      toast.success('Your care team has been notified that you are ready');
    } catch {
      toast.error('Could not notify the care team');
    } finally {
      setNotifyingReady(false);
    }
  };

  const handleJoinWithMoodCheck = (session: PatientSession) => {
    if (['scheduled', 'waiting', 'active'].includes(session.status)) {
      setMoodCheckSession(session);
    } else {
      joinSession(session);
    }
  };

  const handleMoodCheckComplete = () => {
    if (moodCheckSession) {
      joinSession(moodCheckSession);
      setMoodCheckSession(null);
    }
  };

  const joinVideoCall = async () => {
    if (!activeSession || !patient) return;
    if (!activeSession.daily_room_url) {
      toast.info('Your doctor has not started the video call yet. Please wait.');
      return;
    }

    setJoiningVideo(true);
    try {
      // Update patient_user_id if not set
      if (!activeSession.patient_user_id) {
        await supabase.from('telemedicine_sessions').update({
          patient_user_id: patient.userId,
          patient_account_id: patient.accountId,
        }).eq('id', activeSession.id);
      }

      // Get patient access token from edge function (uses anon key — no auth header needed)
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      // Include the patient's auth token so the edge function can identify the caller
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const authToken = authSession?.access_token;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/daily-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ action: 'get_token', sessionId: activeSession.id, role: 'patient' }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not get video access token');
        return;
      }

      setVideoToken(data.token);
      setVideoJoined(true);
    } catch (err) {
      toast.error('Failed to connect to video call');
    } finally {
      setJoiningVideo(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPatient(null);
    setActiveSession(null);
  };

  if (!patient) {
    return <PatientAuth onLogin={(userId, patientName, accountId, gender) => setPatient({ userId, patientName, accountId, gender })} />;
  }

  const upcomingSessions = sessions.filter(s => ['scheduled', 'waiting', 'active'].includes(s.status));
  const pastSessions = sessions.filter(s => ['completed', 'cancelled'].includes(s.status));
  const isClosedVisit = activeSession
    ? ['completed', 'cancelled', 'no_show'].includes(activeSession.status)
    : false;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Real-time consent request popup */}
      <ConsentRequestPopup patientUserId={patient.userId} />
      {/* Pre-session mood check-in */}
      {moodCheckSession && (
        <PreSessionMoodCheckIn
          open={!!moodCheckSession}
          onOpenChange={(open) => { if (!open) setMoodCheckSession(null); }}
          patientUserId={patient.userId}
          sessionId={moodCheckSession.id}
          doctorName={moodCheckSession.doctor_name}
          onComplete={handleMoodCheckComplete}
          onSkip={handleMoodCheckComplete}
        />
      )}
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary-foreground/20">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Telemed-X</p>
              <p className="text-xs opacity-70">Welcome, {patient.patientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4">
        {activeSession ? (
          /* Consultation / Visit summary view */
          <div className="space-y-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold truncate">Dr. {activeSession.doctor_name}</h2>
                  <Badge variant="outline" className={`text-xs ${PATIENT_STATUS[activeSession.status]?.chip || PATIENT_STATUS.scheduled.chip}`}>
                    {PATIENT_STATUS[activeSession.status]?.label || activeSession.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeSession.doctor_specialty || 'General Practice'} • {format(parseISO(activeSession.scheduled_at), 'MMM d, yyyy')} at {format(parseISO(activeSession.scheduled_at), 'h:mm a')} • {activeSession.duration_minutes} min
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Session code <code className="font-mono">{activeSession.session_code}</code>
                </p>
              </div>
              <Button variant="outline" onClick={() => { setActiveSession(null); setVideoJoined(false); setVideoToken(null); }}>
                Back to Dashboard
              </Button>
            </div>

            {isClosedVisit ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {activeSession.status === 'completed'
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : <XCircle className="h-4 w-4 text-red-500" />}
                        Visit Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {activeSession.status === 'completed' ? (
                        <>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Diagnosis / assessment</p>
                            <p className="mt-0.5">{activeSession.diagnosis || 'Your clinician has not recorded a diagnosis.'}</p>
                          </div>
                          <SeparatorRow />
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">Consultation started</p>
                              <p className="font-medium">
                                {activeSession.started_at ? format(new Date(activeSession.started_at), 'MMM d, h:mm a') : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ended</p>
                              <p className="font-medium">
                                {activeSession.ended_at ? format(new Date(activeSession.ended_at), 'MMM d, h:mm a') : '—'}
                              </p>
                            </div>
                          </div>
                          {activeSession.follow_up_date && (
                            <Badge variant="outline" className="bg-sky-500/10 text-sky-700 border-sky-500/30">
                              <Calendar className="h-3 w-3 mr-1" />
                              Follow-up on {format(parseISO(activeSession.follow_up_date), 'MMM d, yyyy')}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-muted-foreground">
                            This consultation was cancelled
                            {activeSession.cancelled_by ? ` by ${activeSession.cancelled_by}` : ''}.
                          </p>
                          {activeSession.cancelled_reason && (
                            <div className="rounded-lg bg-muted/60 p-3 text-xs">
                              <p className="font-medium">Reason</p>
                              <p className="text-muted-foreground mt-0.5">{activeSession.cancelled_reason}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">You can book a new consultation at any time from “Book a Session”.</p>
                        </div>
                      )}

                      {sessionRx.length > 0 && (
                        <>
                          <SeparatorRow />
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Prescriptions from this visit</p>
                            <div className="space-y-2">
                              {sessionRx.map((rx) => (
                                <div key={rx.id} className="rounded-lg border border-border p-2.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold">{rx.medication_name} {rx.dosage}</p>
                                    <Badge variant="outline" className="text-[9px] capitalize">{rx.status}</Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{rx.frequency} • {rx.duration}</p>
                                  {rx.instructions && <p className="text-[11px] text-muted-foreground italic mt-0.5">{rx.instructions}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 text-xs text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      This summary is part of your medical record and is available for export under “Health Export”.
                    </CardContent>
                  </Card>
                </div>

                <div className="min-w-0">
                  <div className="rounded-xl border border-border bg-card overflow-hidden h-[520px] flex flex-col">
                    <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Consultation chat</span>
                    </div>
                    <div className="flex-1 min-h-0">
                      <SessionChat
                        sessionId={activeSession.id}
                        currentUserId={patient.userId}
                        currentUserName={patient.patientName}
                        currentRole="patient"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-3">
                  <Card className="overflow-hidden">
                    <div className="relative aspect-video bg-slate-950">
                      {videoJoined && activeSession.daily_room_url && videoToken ? (
                        <iframe
                          src={`${activeSession.daily_room_url}?t=${videoToken}`}
                          allow="camera; microphone; fullscreen; autoplay"
                          className="h-full w-full"
                          title="Video consultation"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
                          <div className="rounded-full bg-white/5 p-4 ring-1 ring-white/10">
                            <Video className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-100">
                              {activeSession.daily_room_url
                                ? 'Your video room is open'
                                : activeSession.status === 'waiting'
                                  ? 'You are in the waiting room'
                                  : 'Waiting for your doctor to start'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                              {activeSession.daily_room_url
                                ? 'Join now to speak with your doctor. Ensure your camera and microphone are allowed.'
                                : 'Keep this page open — the join button appears automatically when your doctor starts the call.'}
                            </p>
                          </div>
                          {activeSession.daily_room_url ? (
                            <Button onClick={joinVideoCall} disabled={joiningVideo}>
                              {joiningVideo
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting…</>
                                : <><Video className="h-4 w-4 mr-2" /> Join Video Call</>}
                            </Button>
                          ) : (
                            <Button variant="secondary" onClick={() => notifyReady(activeSession)} disabled={notifyingReady}>
                              {notifyingReady
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Notifying…</>
                                : <><MessageSquare className="h-4 w-4 mr-2" /> I&apos;m ready</>}
                            </Button>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            {['Scheduled', 'Waiting room', 'In consultation'].map((step, idx) => {
                              const order = ['scheduled', 'waiting', 'active'];
                              const current = order.indexOf(activeSession.status);
                              const done = idx <= current;
                              return (
                                <span key={step} className="flex items-center gap-1.5">
                                  {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                                  <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                  <span className={done ? 'text-slate-200' : ''}>{step}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <CardContent className="py-2.5 px-3 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline" className="gap-1 text-[10px]"><Shield className="h-3 w-3" /> Private &amp; secure</Badge>
                      <Badge variant="outline" className="gap-1 text-[10px]"><Clock className="h-3 w-3" /> {activeSession.duration_minutes} min</Badge>
                      {activeSession.daily_room_url && !videoJoined && (
                        <Badge variant="outline" className="gap-1 text-[10px] text-emerald-700 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" /> Doctor is ready
                        </Badge>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <Stethoscope className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reason for visit</p>
                          <p className="text-sm">{activeSession.chief_complaint || 'No reason recorded'}</p>
                        </div>
                      </div>
                      <SeparatorRow />
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Doctor</p>
                          <p className="font-medium">Dr. {activeSession.doctor_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Specialty</p>
                          <p className="font-medium">{activeSession.doctor_specialty || 'General Practice'}</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        You can add pain markings and chat with your doctor while you wait. Everything is saved to this session.
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="min-w-0">
                  <Tabs value={railTab} onValueChange={setRailTab}>
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger value="chat" className="text-[11px]"><MessageSquare className="h-3.5 w-3.5 mr-1" />Chat</TabsTrigger>
                      <TabsTrigger value="visit" className="text-[11px]"><ClipboardList className="h-3.5 w-3.5 mr-1" />Visit Prep</TabsTrigger>
                    </TabsList>

                    <TabsContent value="chat" className="mt-2">
                      <div className="rounded-xl border border-border bg-card overflow-hidden h-[420px] flex flex-col">
                        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Chat with Doctor</span>
                        </div>
                        <div className="flex-1 min-h-0">
                          <SessionChat
                            sessionId={activeSession.id}
                            currentUserId={patient.userId}
                            currentUserName={patient.patientName}
                            currentRole="patient"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="visit" className="mt-2 space-y-3">
                      <div className="border border-border rounded-lg overflow-hidden bg-background p-3">
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" /> Pain map shared with your doctor
                        </p>
                        <SessionPainMapEditor
                          sessionId={activeSession.id}
                          patientUserId={patient.userId}
                          gender={patient.gender}
                        />
                      </div>

                      {sessionRx.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2"><Pill className="h-4 w-4 text-primary" /> Prescriptions</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {sessionRx.map((rx) => (
                              <div key={rx.id} className="rounded-lg border border-border p-2.5">
                                <p className="text-xs font-semibold">{rx.medication_name} {rx.dosage}</p>
                                <p className="text-[11px] text-muted-foreground">{rx.frequency} • {rx.duration}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardContent className="pt-4 text-[11px] text-muted-foreground space-y-1.5">
                          <p className="font-semibold text-foreground text-xs">Before you join</p>
                          <p>• Allow camera and microphone access when prompted.</p>
                          <p>• Use a quiet, well-lit space and a stable connection.</p>
                          <p>• Keep your session code <span className="font-mono">{activeSession.session_code}</span> handy.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Dashboard with Sidebar */
          <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-64px)]">
            {/* Sidebar Navigation */}
            <nav className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-border p-2 lg:py-4 lg:pr-2 lg:pl-0 bg-muted/30">
              <div className="lg:hidden">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="h-9 bg-background text-sm" aria-label="Patient portal section">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NAV_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-[10px] uppercase tracking-wider">{group.label}</SelectLabel>
                        {group.items.map((item) => (
                          <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden lg:block">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label} className="mb-3 last:mb-0">
                    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {group.label}
                    </p>
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setActiveTab(item.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          activeTab === item.key
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 w-full px-2 lg:pl-6 py-4 min-w-0">
              {activeTab === 'sessions' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-foreground">My Consultations</h2>
                  <PatientHomeCards patientUserId={patient.userId} />
                  {upcomingSessions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Upcoming</h3>
                      {upcomingSessions.map((session) => (
                        <PatientSessionCard key={session.id} session={session} onJoin={() => handleJoinWithMoodCheck(session)} />
                      ))}
                    </div>
                  )}
                  {pastSessions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-muted-foreground">Past</h3>
                      {pastSessions.map((session) => (
                        <PatientSessionCard key={session.id} session={session} onJoin={() => setActiveSession(session)} />
                      ))}
                    </div>
                  )}
                  {sessions.length === 0 && !loading && (
                    <div className="text-center py-16 space-y-2">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30" />
                      <p className="font-medium text-muted-foreground">No consultations yet</p>
                      <p className="text-sm text-muted-foreground">Your scheduled telemedicine sessions will appear here</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'emergency' && (
                <EmergencyResponseTab patientUserId={patient.userId} patientName={patient.patientName} />
              )}
              {activeTab === 'book' && (
                <PatientBookingTab
                  patientUserId={patient.userId}
                  patientName={patient.patientName}
                  patientAccountId={patient.accountId}
                  onBookingComplete={() => { setActiveTab('sessions'); fetchData(); }}
                />
              )}

              {activeTab === 'prescriptions' && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-foreground">Prescriptions</h2>
                  {prescriptions.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                      <Pill className="h-12 w-12 mx-auto text-muted-foreground/30" />
                      <p className="font-medium text-muted-foreground">No prescriptions yet</p>
                      <p className="text-sm text-muted-foreground">Prescriptions from your consultations will appear here</p>
                    </div>
                  ) : (
                    prescriptions.map((rx) => (
                      <Card key={rx.id}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Pill className="h-4 w-4 text-primary" />
                                <p className="font-semibold">{rx.medication_name} — {rx.dosage}</p>
                                <Badge variant="outline" className="text-xs">{rx.status}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {rx.frequency} for {rx.duration}
                                {rx.refills > 0 && ` • ${rx.refills} refill(s)`}
                              </p>
                              {rx.instructions && (
                                <p className="text-xs text-muted-foreground mt-1">📋 {rx.instructions}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Prescribed by Dr. {rx.doctor_name} • {format(parseISO(rx.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'wallet' && <PatientWallet patientUserId={patient.userId} />}
              {activeTab === 'referrals' && <PatientReferralsView />}
              {activeTab === 'records' && <MedicalRecordsTab patientUserId={patient.userId} />}
              {activeTab === 'medications' && <MedicationsTab patientUserId={patient.userId} />}
              {activeTab === 'vitals' && <VitalsDashboard patientUserId={patient.userId} />}
              {activeTab === 'care-plans' && <CarePlanView patientUserId={patient.userId} />}
              {activeTab === 'triage' && <TriageAssistant patientUserId={patient.userId} onBookConsult={() => setActiveTab('book')} />}
              {activeTab === 'programmes' && (
                <HealthProgrammesTab patientUserId={patient.userId} patientName={patient.patientName} />
              )}
              {activeTab === 'adherence' && <MedicationAdherence patientUserId={patient.userId} />}
              {activeTab === 'language' && <MultilingualSettings patientUserId={patient.userId} />}
              {activeTab === 'fhir' && <FhirExportView patientUserId={patient.userId} />}
              {activeTab === 'pain-map' && <PainBodyMap patientUserId={patient.userId} gender={patient.gender} />}
              {activeTab === 'lifestyle' && <LifestyleTracker patientUserId={patient.userId} />}
              {activeTab === 'mental-health' && (
                <MentalHealthPortal patientUserId={patient.userId} patientName={patient.patientName} patientAccountId={patient.accountId} onBookingComplete={() => { setActiveTab('sessions'); fetchData(); }} />
              )}
              {activeTab === 'caregiving' && <CaregivingSection patientUserId={patient.userId} patientName={patient.patientName} />}
              {activeTab === 'profile' && (
                <PatientProfileTab
                  patientUserId={patient.userId}
                  accountId={patient.accountId}
                  onProfileUpdate={(updates) => setPatient(prev => prev ? { ...prev, patientName: updates.patientName } : prev)}
                />
              )}
              {activeTab === 'anonymous' && <AnonymousConsultation patientUserId={patient.userId} patientName={patient.patientName} patientAccountId={patient.accountId} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PATIENT_STATUS: Record<string, { label: string; chip: string }> = {
  scheduled: { label: 'Scheduled', chip: 'border-border text-muted-foreground' },
  waiting: { label: 'In waiting room', chip: 'border-amber-500/40 bg-amber-500/10 text-amber-700' },
  active: { label: 'In consultation — join now', chip: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700' },
  completed: { label: 'Completed', chip: 'border-sky-500/30 bg-sky-500/10 text-sky-700' },
  cancelled: { label: 'Cancelled', chip: 'border-red-500/30 bg-red-500/10 text-red-600' },
  no_show: { label: 'Missed', chip: 'border-orange-500/30 bg-orange-500/10 text-orange-700' },
};

function SeparatorRow() {
  return <div className="h-px w-full bg-border" />;
}

function PatientSessionCard({ session, onJoin }: { session: PatientSession; onJoin: () => void }) {
  const s = PATIENT_STATUS[session.status] || PATIENT_STATUS.scheduled;
  const isUpcoming = ['scheduled', 'waiting', 'active'].includes(session.status);

  return (
    <Card className={`transition-all hover:border-primary/30 ${session.status === 'active' ? 'border-emerald-500/40' : ''}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">Dr. {session.doctor_name}</p>
              <Badge variant="outline" className={`text-xs ${s.chip}`}>{s.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {session.doctor_specialty || 'General Practice'} • {session.duration_minutes} min
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {format(parseISO(session.scheduled_at), 'EEEE, MMM d, yyyy • h:mm a')}
            </p>
            {session.chief_complaint && (
              <p className="text-xs text-muted-foreground line-clamp-1">Reason: {session.chief_complaint}</p>
            )}
            {!isUpcoming && session.status === 'completed' && session.diagnosis && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                <span className="font-medium text-foreground">Diagnosis:</span> {session.diagnosis}
              </p>
            )}
          </div>
          {['scheduled', 'waiting', 'active', 'completed'].includes(session.status) && (
            <Button
              size="sm"
              variant={session.status === 'active' ? 'default' : 'outline'}
              onClick={onJoin}
            >
              {session.status === 'completed' ? 'View summary' : session.status === 'active' ? 'Join now' : 'Join'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
