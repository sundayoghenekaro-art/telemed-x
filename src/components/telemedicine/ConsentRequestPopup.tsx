import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ShieldX, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { addHours } from 'date-fns';

interface PendingConsent {
  id: string;
  session_id: string;
  doctor_user_id: string;
  patient_user_id: string;
  status: string;
  requested_at: string;
}

interface ConsentRequestPopupProps {
  patientUserId: string;
}

export function ConsentRequestPopup({ patientUserId }: ConsentRequestPopupProps) {
  const [pending, setPending] = useState<PendingConsent | null>(null);
  const [responding, setResponding] = useState(false);
  const [doctorName, setDoctorName] = useState<string>('Your doctor');

  useEffect(() => {
    // Check for existing pending requests
    const checkPending = async () => {
      const { data } = await supabase
        .from('consent_requests')
        .select('*')
        .eq('patient_user_id', patientUserId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const req = data[0] as unknown as PendingConsent;
        setPending(req);
        fetchDoctorName(req.session_id);
      }
    };
    checkPending();

    // Listen for new consent requests in real-time
    const channel = supabase
      .channel(`consent-patient-${patientUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'consent_requests',
        filter: `patient_user_id=eq.${patientUserId}`,
      }, (payload) => {
        const req = payload.new as PendingConsent;
        if (req.status === 'pending') {
          setPending(req);
          fetchDoctorName(req.session_id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [patientUserId]);

  const fetchDoctorName = async (sessionId: string) => {
    const { data } = await supabase
      .from('telemedicine_sessions')
      .select('doctor_name')
      .eq('id', sessionId)
      .single();
    if (data) setDoctorName(`Dr. ${data.doctor_name}`);
  };

  const respond = async (allow: boolean) => {
    if (!pending) return;
    setResponding(true);
    try {
      const now = new Date();
      const update: Record<string, unknown> = {
        status: allow ? 'allowed' : 'denied',
        responded_at: now.toISOString(),
      };
      if (allow) {
        update.expires_at = addHours(now, 24).toISOString();
      }

      const { error } = await supabase
        .from('consent_requests')
        .update(update)
        .eq('id', pending.id);

      if (error) throw error;

      // Audit log
      await supabase.from('consent_audit_log').insert({
        consent_request_id: pending.id,
        session_id: pending.session_id,
        doctor_user_id: pending.doctor_user_id,
        patient_user_id: patientUserId,
        action: allow ? 'allowed' : 'denied',
        actor_id: patientUserId,
      });

      toast.success(
        allow
          ? 'Access granted for 24 hours'
          : 'Access denied — doctor will proceed without your history'
      );
      setPending(null);
    } catch (err) {
      toast.error('Failed to respond to consent request');
    } finally {
      setResponding(false);
    }
  };

  if (!pending) return null;

  return (
    <Dialog open={!!pending} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-yellow-500/10">
              <Shield className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">Medical History Request</DialogTitle>
              <DialogDescription className="text-sm">
                Privacy consent required
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm leading-relaxed">
              <strong>{doctorName}</strong> is requesting access to your medical history
              for this consultation.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              If allowed, the doctor will be able to view your past diagnoses,
              lab results, medications, and consultation notes for 24 hours.
            </p>
          </div>

          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3 shrink-0" />
              Access will automatically expire after 24 hours. You can revoke access at any time.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => respond(false)}
            disabled={responding}
          >
            <ShieldX className="h-4 w-4" />
            Deny
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => respond(true)}
            disabled={responding}
          >
            <ShieldCheck className="h-4 w-4" />
            Allow for 24 Hours
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
