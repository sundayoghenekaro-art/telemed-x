
-- Radiology reports table
CREATE TABLE public.radiology_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  patient_upid TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  modality TEXT NOT NULL,
  body_part TEXT NOT NULL,
  findings TEXT NOT NULL,
  impression TEXT NOT NULL,
  technique TEXT,
  comparison TEXT,
  radiologist TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  critical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.radiology_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read radiology reports"
  ON public.radiology_reports FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert radiology reports"
  ON public.radiology_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update radiology reports"
  ON public.radiology_reports FOR UPDATE
  USING (true);

-- Critical finding notifications table
CREATE TABLE public.critical_finding_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id TEXT NOT NULL,
  study_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  modality TEXT NOT NULL,
  body_part TEXT NOT NULL,
  finding TEXT NOT NULL,
  radiologist TEXT NOT NULL,
  referring_physician TEXT NOT NULL,
  communication_method TEXT NOT NULL,
  communicated_at TIMESTAMPTZ NOT NULL,
  communicated_to TEXT NOT NULL,
  read_back_confirmed BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.critical_finding_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read critical notifications"
  ON public.critical_finding_notifications FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert critical notifications"
  ON public.critical_finding_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update critical notifications"
  ON public.critical_finding_notifications FOR UPDATE
  USING (true);
