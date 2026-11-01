-- Table for real-time pain map data shared during consultations
CREATE TABLE public.session_pain_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.telemedicine_sessions(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL,
  pain_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  draw_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  body_view text NOT NULL DEFAULT 'front',
  notes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.session_pain_maps ENABLE ROW LEVEL SECURITY;

-- Patients can manage their own pain maps
CREATE POLICY "Patients can manage own pain maps"
  ON public.session_pain_maps FOR ALL
  USING (auth.uid() = patient_user_id)
  WITH CHECK (auth.uid() = patient_user_id);

-- Doctors can read pain maps for their sessions
CREATE POLICY "Doctors can read session pain maps"
  ON public.session_pain_maps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.telemedicine_sessions ts
    WHERE ts.id = session_pain_maps.session_id
    AND ts.doctor_user_id = auth.uid()
  ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_pain_maps;
