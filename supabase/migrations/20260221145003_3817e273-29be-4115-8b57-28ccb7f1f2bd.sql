
-- 1. patient_medical_records
CREATE TABLE public.patient_medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'other',
  provider_name TEXT,
  record_date DATE,
  notes TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage own medical records"
ON public.patient_medical_records FOR ALL
USING (auth.uid() = patient_user_id)
WITH CHECK (auth.uid() = patient_user_id);

-- 2. patient_medications
CREATE TABLE public.patient_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  route TEXT DEFAULT 'oral',
  start_date DATE,
  end_date DATE,
  prescribing_doctor TEXT,
  pharmacy TEXT,
  refills_remaining INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage own medications"
ON public.patient_medications FOR ALL
USING (auth.uid() = patient_user_id)
WITH CHECK (auth.uid() = patient_user_id);

-- 3. patient_vitals
CREATE TABLE public.patient_vitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  heart_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  temperature NUMERIC(5,2),
  spo2 INTEGER,
  respiratory_rate INTEGER,
  weight NUMERIC(6,2),
  blood_glucose INTEGER,
  steps INTEGER,
  sleep_hours NUMERIC(4,2),
  source TEXT NOT NULL DEFAULT 'manual',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage own vitals"
ON public.patient_vitals FOR ALL
USING (auth.uid() = patient_user_id)
WITH CHECK (auth.uid() = patient_user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_vitals;

-- 4. Storage bucket for medical records
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-records', 'medical-records', false);

CREATE POLICY "Patients can upload own medical records"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Patients can read own medical records"
ON storage.objects FOR SELECT
USING (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Patients can delete own medical records"
ON storage.objects FOR DELETE
USING (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Updated_at triggers
CREATE TRIGGER update_patient_medical_records_updated_at
BEFORE UPDATE ON public.patient_medical_records
FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();

CREATE TRIGGER update_patient_medications_updated_at
BEFORE UPDATE ON public.patient_medications
FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();
