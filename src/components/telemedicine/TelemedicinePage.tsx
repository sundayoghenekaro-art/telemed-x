import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TelemedicineConsole } from '@/components/telemedicine/TelemedicineConsole';
import { ExternalDoctorApprovals } from '@/components/telemedicine/ExternalDoctorApprovals';
import { Video, Users, UserCheck, Clock, User, Zap } from 'lucide-react';
import { User as UserType } from '@/types/dhos';
import { canPerformAction } from '@/lib/access';
import { format, parseISO } from 'date-fns';

interface TelemedicinePageProps {
  currentUser: UserType;
}

export function TelemedicinePage({ currentUser }: TelemedicinePageProps) {
  const isAdmin = currentUser.role === 'admin';
  const isPhysician = currentUser.role === 'physician';
  const isDoctor = isPhysician || isAdmin;

  // Admin-only users start on approvals; physicians start on their console
  const [tab, setTab] = useState(isAdmin && !isPhysician ? 'approvals' : 'console');

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="glass-panel animate-rise flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Zap className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Telemed-X</h1>
            <p className="text-sm text-muted-foreground">
              Virtual consultations — hospital physicians &amp; external doctors
            </p>
          </div>
        </div>
        <Badge variant="outline" className="capitalize">{currentUser.role.replace('_', ' ')}</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="h-auto w-fit shrink-0 flex-wrap justify-start gap-1 rounded-xl border border-white/70 bg-white/60 p-1 shadow-sm">
          {isDoctor && (
            <TabsTrigger value="console" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Video className="mr-2 h-4 w-4" /> Consultations
            </TabsTrigger>
          )}
          {isAdmin && (
            <>
              <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />
              <span aria-hidden className="self-center px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Administration
              </span>
              <TabsTrigger value="approvals" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <UserCheck className="mr-2 h-4 w-4" /> Practitioner Applications
              </TabsTrigger>
              <TabsTrigger value="all-sessions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Users className="mr-2 h-4 w-4" /> All Sessions
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {isDoctor && (
          <TabsContent value="console" className="flex-1 min-h-0 mt-4">
            <TelemedicineConsole
              doctorUserId={currentUser.id}
              doctorName={currentUser.name}
              doctorType="hospital"
              doctorSpecialty={currentUser.department || 'Internal Medicine'}
              canPrescribe={canPerformAction(currentUser.role, 'action:prescribe_medication')}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <>
            <TabsContent value="approvals" className="flex-1 min-h-0 mt-4 overflow-auto">
              <ExternalDoctorApprovals reviewerName={currentUser.name} />
            </TabsContent>
            <TabsContent value="all-sessions" className="flex-1 min-h-0 mt-4 overflow-auto">
              <AllSessionsView />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function AllSessionsView() {
  const [sessions, setSessions] = useState<Array<{
    id: string;
    session_code: string;
    doctor_name: string;
    doctor_type: string;
    patient_name: string;
    scheduled_at: string;
    status: string;
    duration_minutes: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('telemedicine_sessions')
      .select('id, session_code, doctor_name, doctor_type, patient_name, scheduled_at, status, duration_minutes')
      .order('scheduled_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setSessions(data);
        setLoading(false);
      });
  }, []);

  const statusColors: Record<string, string> = {
    scheduled: 'border-border text-muted-foreground',
    waiting: 'border-primary text-primary',
    active: 'border-primary bg-primary/10 text-primary',
    completed: 'border-border text-muted-foreground',
    cancelled: 'border-destructive text-destructive',
    no_show: 'border-border text-muted-foreground',
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{sessions.length} total sessions</p>
      {sessions.map((session, index) => (
        <Card key={session.id} className="tx-hover animate-rise" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{session.patient_name}</p>
                    <span className="text-muted-foreground text-xs">with</span>
                    <p className="text-sm">Dr. {session.doctor_name}</p>
                    <Badge variant="outline" className="text-xs">
                      {session.doctor_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(session.scheduled_at), 'MMM d, yyyy • h:mm a')}
                    {' '}• {session.duration_minutes} min
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={`text-xs ${statusColors[session.status] || statusColors.scheduled}`}>
                {session.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
