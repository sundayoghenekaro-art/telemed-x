
-- Create audit log table for allergy overrides
CREATE TABLE public.allergy_override_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  pharmacist_name TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  prescription_id TEXT NOT NULL,
  medications TEXT[] NOT NULL,
  allergies TEXT[] NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning')),
  action TEXT NOT NULL CHECK (action IN ('dispensed', 'prescribed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allergy_override_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read audit logs (pharmacists need to see the full log)
CREATE POLICY "Authenticated users can read audit logs"
  ON public.allergy_override_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.allergy_override_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also allow anonymous access for this demo app (no auth implemented yet)
CREATE POLICY "Anonymous users can read audit logs"
  ON public.allergy_override_audit_log
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can insert audit logs"
  ON public.allergy_override_audit_log
  FOR INSERT
  TO anon
  WITH CHECK (true);
