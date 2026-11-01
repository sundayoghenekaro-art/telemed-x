import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TelemedicineConsole } from '@/components/telemedicine/TelemedicineConsole';
import { ExternalDoctorApprovals } from '@/components/telemedicine/ExternalDoctorApprovals';
import { Video, Users, UserCheck, Clock, User, Zap } from 'lucide-react';
import { User as UserType } from '@/types/dhos';
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
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" style={{ color: 'hsl(250, 84%, 54%)' }} />
            Telemed-X
          </h1>
          <p className="text-sm text-muted-foreground">
            Virtual consultations — hospital physicians & external doctors
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {currentUser.role.replace('_', ' ')}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 w-fit h-auto flex-wrap justify-start gap-1">
          {isDoctor && (
            <TabsTrigger value="console">
              <Video className="h-4 w-4 mr-2" /> Consultations
            </TabsTrigger>
          )}
          {isAdmin && (
            <>
              <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />
              <span aria-hidden className="self-center px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Administration
              </span>
              <TabsTrigger value="approvals">
                <UserCheck className="h-4 w-4 mr-2" /> Practitioner Applications
              </TabsTrigger>
              <TabsTrigger value="all-sessions">
                <Users className="h-4 w-4 mr-2" /> All Sessions
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
      {sessions.map((session) => (
        <Card key={session.id} className="hover:border-primary/30 transition-all">
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
