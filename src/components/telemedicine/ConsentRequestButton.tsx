import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, ShieldCheck, ShieldX, Clock, Loader2, FileText, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, addHours, isBefore } from 'date-fns';

interface ConsentRequest {
  id: string;
  session_id: string;
  doctor_user_id: string;
  patient_user_id: string;
  status: 'pending' | 'allowed' | 'denied' | 'expired';
  requested_at: string;
  responded_at: string | null;
  expires_at: string | null;
}

interface ConsentRequestButtonProps {
  sessionId: string;
  doctorUserId: string;
  patientUserId: string | null;
  patientName: string;
}

export function ConsentRequestButton({
  sessionId,
  doctorUserId,
  patientUserId,
  patientName,
}: ConsentRequestButtonProps) {
  const [consent, setConsent] = useState<ConsentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchConsent = async () => {
    const { data } = await supabase
      .from('consent_requests')
      .select('*')
      .eq('session_id', sessionId)
      .eq('doctor_user_id', doctorUserId)
      .order('requested_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const req = data[0] as unknown as ConsentRequest;
      // Check expiry
      if (req.status === 'allowed' && req.expires_at && isBefore(new Date(req.expires_at), new Date())) {
        setConsent({ ...req, status: 'expired' });
      } else {
        setConsent(req);
      }
    } else {
      setConsent(null);
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchConsent();

    const channel = supabase
      .channel(`consent-doctor-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'consent_requests',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchConsent())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const requestConsent = async () => {
    if (!patientUserId) {
      toast.error('Patient has not connected to this session yet');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('consent_requests').insert({
        session_id: sessionId,
        doctor_user_id: doctorUserId,
        patient_user_id: patientUserId,
        status: 'pending',
      });
      if (error) throw error;

      // Audit log
      await supabase.from('consent_audit_log').insert({
        consent_request_id: '00000000-0000-0000-0000-000000000000', // will be updated
        session_id: sessionId,
        doctor_user_id: doctorUserId,
        patient_user_id: patientUserId,
        action: 'requested',
        actor_id: doctorUserId,
      });

      toast.success('Consent request sent to patient');
      fetchConsent();
    } catch (err) {
      toast.error('Failed to send consent request');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return null;

  const isGranted = consent?.status === 'allowed' && consent.expires_at && isBefore(new Date(), new Date(consent.expires_at));
  const isPending = consent?.status === 'pending';
  const isDenied = consent?.status === 'denied';

  return (
    <div className="space-y-3">
      {/* Consent Status Card */}
      <Card className={`border ${isGranted ? 'border-green-500/30 bg-green-500/5' : isPending ? 'border-yellow-500/30 bg-yellow-500/5' : isDenied ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isGranted ? (
                <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
              ) : isPending ? (
                <Clock className="h-5 w-5 text-yellow-500 shrink-0 animate-pulse" />
              ) : isDenied ? (
                <ShieldX className="h-5 w-5 text-destructive shrink-0" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isGranted
                    ? 'Medical History Access Granted'
                    : isPending
                    ? 'Awaiting Patient Consent…'
                    : isDenied
                    ? 'Access Denied by Patient'
                    : 'Patient History Locked'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isGranted && consent?.expires_at
                    ? `Expires ${format(parseISO(consent.expires_at), 'MMM d, h:mm a')}`
                    : isPending
                    ? `Sent to ${patientName} — waiting for response`
                    : isDenied
                    ? 'Patient declined. Continue with verbal information only.'
                    : 'Patient records are hidden by default. Request access to view.'}
                </p>
              </div>
            </div>

            {!isGranted && !isPending && (
              <Button
                size="sm"
                variant={isDenied ? 'outline' : 'default'}
                onClick={requestConsent}
                disabled={loading || !patientUserId}
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-1" />
                )}
                {isDenied ? 'Request Again' : 'Request Medical History'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Medical History Panel (only visible when consent granted) */}
      {isGranted && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              Patient Medical History
              <Badge variant="outline" className="text-xs border-green-500/30 text-green-600">Consented</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Medical records for <strong className="text-foreground">{patientName}</strong></span>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-xs leading-relaxed">
                  <p className="font-medium text-foreground mb-2">Consent-Gated Medical Records</p>
                  <p>
                    In a full HMIS integration, this section would populate with the patient's:
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Past diagnoses & conditions</li>
                    <li>Previous lab results</li>
                    <li>Active medications & allergies</li>
                    <li>Imaging history</li>
                    <li>Prior consultation notes</li>
                  </ul>
                  <p className="mt-2 text-xs">
                    Data access expires at {consent?.expires_at ? format(parseISO(consent.expires_at), 'MMM d, yyyy h:mm a') : '—'}.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
