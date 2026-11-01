
-- ==========================================
-- 1. Mood Tracking: daily logs + assessments
-- ==========================================
CREATE TABLE public.mood_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  mood_label TEXT NOT NULL,
  journal_notes TEXT,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, logged_at)
);
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can manage own mood entries" ON public.mood_entries FOR ALL USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);

CREATE TABLE public.mood_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  assessment_type TEXT NOT NULL, -- 'phq9', 'gad7', 'pre_session'
  session_id UUID REFERENCES public.telemedicine_sessions(id),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score INTEGER NOT NULL DEFAULT 0,
  severity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mood_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can manage own assessments" ON public.mood_assessments FOR ALL USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);
CREATE POLICY "Doctors can read patient assessments via session" ON public.mood_assessments FOR SELECT USING (
  EXISTS (SELECT 1 FROM telemedicine_sessions ts WHERE ts.id = mood_assessments.session_id AND ts.doctor_user_id = auth.uid())
);

-- ==========================================
-- 2. Caregiving: tasks + visits
-- ==========================================
CREATE TABLE public.caregiver_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_user_id UUID NOT NULL,
  relationship TEXT NOT NULL, -- 'spouse', 'child', 'parent', 'sibling', 'friend', 'professional'
  full_name TEXT NOT NULL,
  phone TEXT,
  is_professional BOOLEAN NOT NULL DEFAULT false,
  specialty TEXT, -- for professional caregivers
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.caregiver_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own caregiver profiles" ON public.caregiver_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Patients can see their caregivers" ON public.caregiver_profiles FOR SELECT USING (auth.uid() = patient_user_id);

CREATE TABLE public.caregiver_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_user_id UUID NOT NULL,
  patient_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- 'medication', 'appointment', 'exercise', 'meal', 'hygiene', 'general'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.caregiver_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caregivers can manage own tasks" ON public.caregiver_tasks FOR ALL USING (auth.uid() = caregiver_user_id) WITH CHECK (auth.uid() = caregiver_user_id);
CREATE POLICY "Patients can read tasks about them" ON public.caregiver_tasks FOR SELECT USING (auth.uid() = patient_user_id);

CREATE TABLE public.care_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_user_id UUID NOT NULL,
  patient_user_id UUID NOT NULL,
  visit_type TEXT NOT NULL DEFAULT 'home_visit', -- 'home_visit', 'checkup', 'therapy', 'nursing'
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
  notes TEXT,
  vitals_recorded JSONB,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.care_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caregivers can manage own visits" ON public.care_visits FOR ALL USING (auth.uid() = caregiver_user_id) WITH CHECK (auth.uid() = caregiver_user_id);
CREATE POLICY "Patients can read own visits" ON public.care_visits FOR SELECT USING (auth.uid() = patient_user_id);

-- ==========================================
-- 3. Anonymous Sessions (SA consultations)
-- ==========================================
CREATE TABLE public.anonymous_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  real_user_id UUID NOT NULL,
  alias TEXT NOT NULL,
  alias_code TEXT NOT NULL UNIQUE, -- e.g. 'Sunrise-7842'
  session_id UUID REFERENCES public.telemedicine_sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own anonymous sessions" ON public.anonymous_sessions FOR ALL USING (auth.uid() = real_user_id) WITH CHECK (auth.uid() = real_user_id);
-- Doctors can NEVER see real_user_id — they only see alias via telemedicine_sessions.patient_name

-- Enable realtime for mood tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.caregiver_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.care_visits;
