
-- Fix radiology_reports: restrict to clinical roles
DROP POLICY IF EXISTS "Authenticated users can read radiology reports" ON public.radiology_reports;
DROP POLICY IF EXISTS "Authenticated users can insert radiology reports" ON public.radiology_reports;
DROP POLICY IF EXISTS "Authenticated users can update radiology reports" ON public.radiology_reports;

CREATE POLICY "Clinical staff can read radiology reports"
  ON public.radiology_reports FOR SELECT
  USING (
    has_role(auth.uid(), 'radiologist') OR
    has_role(auth.uid(), 'physician') OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Radiologists can insert radiology reports"
  ON public.radiology_reports FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'radiologist') OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Radiologists can update radiology reports"
  ON public.radiology_reports FOR UPDATE
  USING (
    has_role(auth.uid(), 'radiologist') OR
    has_role(auth.uid(), 'admin')
  );

-- Fix critical_finding_notifications: restrict to clinical roles
DROP POLICY IF EXISTS "Authenticated users can read critical notifications" ON public.critical_finding_notifications;
DROP POLICY IF EXISTS "Authenticated users can insert critical notifications" ON public.critical_finding_notifications;
DROP POLICY IF EXISTS "Authenticated users can update critical notifications" ON public.critical_finding_notifications;

CREATE POLICY "Clinical staff can read critical notifications"
  ON public.critical_finding_notifications FOR SELECT
  USING (
    has_role(auth.uid(), 'radiologist') OR
    has_role(auth.uid(), 'physician') OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Radiologists can insert critical notifications"
  ON public.critical_finding_notifications FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'radiologist') OR
    has_role(auth.uid(), 'physician') OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Clinical staff can update critical notifications"
  ON public.critical_finding_notifications FOR UPDATE
  USING (
    has_role(auth.uid(), 'radiologist') OR
    has_role(auth.uid(), 'physician') OR
    has_role(auth.uid(), 'admin')
  );
