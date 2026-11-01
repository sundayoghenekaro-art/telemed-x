
-- Consent requests table for the "Default Lock, Request Unlock" privacy model
CREATE TABLE public.consent_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.telemedicine_sessions(id) ON DELETE CASCADE,
  doctor_user_id UUID NOT NULL,
  patient_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, allowed, denied, expired
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- set to requested_at + 24h when allowed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;

-- Doctors can create consent requests for their sessions
CREATE POLICY "Doctors can create consent requests"
ON public.consent_requests
FOR INSERT
WITH CHECK (
  auth.uid() = doctor_user_id
  AND EXISTS (
    SELECT 1 FROM public.telemedicine_sessions ts
    WHERE ts.id = consent_requests.session_id
    AND ts.doctor_user_id = auth.uid()
  )
);

-- Doctors can read consent requests they created
CREATE POLICY "Doctors can read own consent requests"
ON public.consent_requests
FOR SELECT
USING (auth.uid() = doctor_user_id);

-- Patients can read consent requests directed at them
CREATE POLICY "Patients can read own consent requests"
ON public.consent_requests
FOR SELECT
USING (auth.uid() = patient_user_id);

-- Patients can update (respond to) consent requests directed at them
CREATE POLICY "Patients can respond to consent requests"
ON public.consent_requests
FOR UPDATE
USING (auth.uid() = patient_user_id AND status = 'pending');

-- Enable realtime for consent requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.consent_requests;

-- Consent audit log (tamper-proof, append-only)
CREATE TABLE public.consent_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consent_request_id UUID NOT NULL REFERENCES public.consent_requests(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  doctor_user_id UUID NOT NULL,
  patient_user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'requested', 'allowed', 'denied', 'expired', 'revoked'
  actor_id UUID NOT NULL, -- who performed the action
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.consent_audit_log ENABLE ROW LEVEL SECURITY;

-- Only insertable, never updatable or deletable (tamper-proof)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.consent_audit_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = actor_id);

-- Doctors and patients can read their own audit logs
CREATE POLICY "Participants can read own audit logs"
ON public.consent_audit_log
FOR SELECT
USING (auth.uid() = doctor_user_id OR auth.uid() = patient_user_id);
