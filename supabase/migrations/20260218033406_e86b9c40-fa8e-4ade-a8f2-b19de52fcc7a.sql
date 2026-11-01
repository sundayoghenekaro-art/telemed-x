
-- External doctors table (non-hospital practitioners applying for telemedicine access)
CREATE TABLE public.external_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  specialty text NOT NULL,
  license_number text NOT NULL,
  license_state text NOT NULL,
  institution text,
  years_experience integer,
  bio text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.external_doctors ENABLE ROW LEVEL SECURITY;

-- External doctors can read/update their own record
CREATE POLICY "External doctors can read own record"
  ON public.external_doctors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "External doctors can update own record"
  ON public.external_doctors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "External doctors can insert own record"
  ON public.external_doctors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read and manage all external doctors
CREATE POLICY "Admins can read all external doctors"
  ON public.external_doctors FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update external doctors"
  ON public.external_doctors FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Patient accounts table (separate from hospital staff)
CREATE TABLE public.patient_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  date_of_birth date,
  gender text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can read own account"
  ON public.patient_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Patients can update own account"
  ON public.patient_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Patients can insert own account"
  ON public.patient_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated staff can read patient accounts"
  ON public.patient_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Doctor availability slots
CREATE TABLE public.doctor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_user_id uuid NOT NULL,
  doctor_name text NOT NULL,
  doctor_type text NOT NULL CHECK (doctor_type IN ('hospital', 'external')),
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read availability"
  ON public.doctor_availability FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Doctors can manage own availability"
  ON public.doctor_availability FOR ALL
  USING (auth.uid() = doctor_user_id)
  WITH CHECK (auth.uid() = doctor_user_id);

-- Telemedicine sessions
CREATE TABLE public.telemedicine_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code text UNIQUE NOT NULL,
  doctor_user_id uuid NOT NULL,
  doctor_name text NOT NULL,
  doctor_type text NOT NULL CHECK (doctor_type IN ('hospital', 'external')),
  doctor_specialty text,
  patient_user_id uuid,
  patient_name text NOT NULL,
  patient_account_id uuid REFERENCES public.patient_accounts(id),
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'waiting', 'active', 'completed', 'cancelled', 'no_show')),
  daily_room_url text,
  daily_room_name text,
  chief_complaint text,
  notes text,
  diagnosis text,
  follow_up_date date,
  cancelled_by text,
  cancelled_reason text,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.telemedicine_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can read own sessions"
  ON public.telemedicine_sessions FOR SELECT
  USING (auth.uid() = doctor_user_id);

CREATE POLICY "Doctors can create sessions"
  ON public.telemedicine_sessions FOR INSERT
  WITH CHECK (auth.uid() = doctor_user_id);

CREATE POLICY "Doctors can update own sessions"
  ON public.telemedicine_sessions FOR UPDATE
  USING (auth.uid() = doctor_user_id);

CREATE POLICY "Patients can read own sessions"
  ON public.telemedicine_sessions FOR SELECT
  USING (auth.uid() = patient_user_id);

CREATE POLICY "Authenticated staff can read all sessions"
  ON public.telemedicine_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated staff can manage sessions"
  ON public.telemedicine_sessions FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Session chat messages
CREATE TABLE public.session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.telemedicine_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('doctor', 'patient')),
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'prescription')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can read messages"
  ON public.session_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.telemedicine_sessions ts
      WHERE ts.id = session_id
        AND (ts.doctor_user_id = auth.uid() OR ts.patient_user_id = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

CREATE POLICY "Session participants can send messages"
  ON public.session_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.telemedicine_sessions ts
      WHERE ts.id = session_id
        AND (ts.doctor_user_id = auth.uid() OR ts.patient_user_id = auth.uid())
    )
  );

-- Telemedicine prescriptions (separate from main pharmacy, linked to sessions)
CREATE TABLE public.telemedicine_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.telemedicine_sessions(id) ON DELETE CASCADE NOT NULL,
  doctor_user_id uuid NOT NULL,
  doctor_name text NOT NULL,
  patient_name text NOT NULL,
  patient_account_id uuid REFERENCES public.patient_accounts(id),
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  instructions text,
  refills integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'filled', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.telemedicine_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage own prescriptions"
  ON public.telemedicine_prescriptions FOR ALL
  USING (auth.uid() = doctor_user_id)
  WITH CHECK (auth.uid() = doctor_user_id);

CREATE POLICY "Patients can read own prescriptions"
  ON public.telemedicine_prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_accounts pa
      WHERE pa.id = patient_account_id AND pa.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated staff can read prescriptions"
  ON public.telemedicine_prescriptions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Enable realtime for session messages and session status
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemedicine_sessions;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_telemedicine_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_external_doctors_updated_at
  BEFORE UPDATE ON public.external_doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_telemedicine_updated_at();

CREATE TRIGGER update_patient_accounts_updated_at
  BEFORE UPDATE ON public.patient_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_telemedicine_updated_at();

CREATE TRIGGER update_telemedicine_sessions_updated_at
  BEFORE UPDATE ON public.telemedicine_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_telemedicine_updated_at();
