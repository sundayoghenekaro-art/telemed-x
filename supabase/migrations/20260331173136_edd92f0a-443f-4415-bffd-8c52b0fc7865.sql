
-- Fix insurance_claims
DROP POLICY IF EXISTS "Authenticated users can insert insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Authenticated users can update insurance claims" ON public.insurance_claims;

CREATE POLICY "Staff can insert insurance claims" ON public.insurance_claims FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role) OR has_role(auth.uid(), 'nurse'::app_role)
);

CREATE POLICY "Staff can update insurance claims" ON public.insurance_claims FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role) OR has_role(auth.uid(), 'nurse'::app_role)
);

-- Fix allergy_override_audit_log
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.allergy_override_audit_log;

CREATE POLICY "Pharmacists can insert audit logs" ON public.allergy_override_audit_log FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'pharmacist'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);
