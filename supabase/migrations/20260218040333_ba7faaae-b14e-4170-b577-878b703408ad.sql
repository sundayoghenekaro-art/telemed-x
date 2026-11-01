
-- Allow patients to self-book sessions by inserting rows where they are the patient
CREATE POLICY "Patients can self-book sessions"
ON public.telemedicine_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = patient_user_id);
