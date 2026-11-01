
-- Daily calorie goals
CREATE TABLE public.patient_calorie_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  daily_calorie_goal INTEGER NOT NULL DEFAULT 2000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_patient_calorie_goals_user ON public.patient_calorie_goals (patient_user_id);
ALTER TABLE public.patient_calorie_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can manage own calorie goals" ON public.patient_calorie_goals FOR ALL USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);

-- Meal tracking
CREATE TABLE public.patient_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  meal_name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'other', -- breakfast, lunch, dinner, snack, other
  calories INTEGER NOT NULL DEFAULT 0,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can manage own meals" ON public.patient_meals FOR ALL USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);

-- Exercise tracking (including steps)
CREATE TABLE public.patient_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT 'walking', -- walking, running, cycling, swimming, gym, yoga, other
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  calories_burned INTEGER NOT NULL DEFAULT 0,
  steps INTEGER,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can manage own exercises" ON public.patient_exercises FOR ALL USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);

-- Enable realtime for all lifestyle tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_meals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_exercises;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_calorie_goals;
