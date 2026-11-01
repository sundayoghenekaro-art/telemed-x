
-- 1. Fix session_messages: Remove overly permissive SELECT policy
DROP POLICY IF EXISTS "Session participants can read messages" ON public.session_messages;

CREATE POLICY "Session participants can read messages"
ON public.session_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.telemedicine_sessions ts
    WHERE ts.id = session_messages.session_id
    AND (ts.doctor_user_id = auth.uid() OR ts.patient_user_id = auth.uid())
  )
);

CREATE POLICY "Admins can read session messages"
ON public.session_messages FOR SELECT
USING (is_super_admin(auth.uid()));

-- 2. Fix patient_accounts: Remove overly broad staff read policy, add scoped access
DROP POLICY IF EXISTS "Authenticated staff can read patient accounts" ON public.patient_accounts;

CREATE POLICY "Doctors can read session patients"
ON public.patient_accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.telemedicine_sessions ts
    WHERE ts.patient_account_id = patient_accounts.id
    AND ts.doctor_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can read all patient accounts"
ON public.patient_accounts FOR SELECT
USING (is_super_admin(auth.uid()));

-- 3. Fix billing tables: Replace WITH CHECK (true) with staff-role-based policies

-- invoices
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;

CREATE POLICY "Staff can read invoices" ON public.invoices FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role) OR has_role(auth.uid(), 'nurse'::app_role)
);

CREATE POLICY "Staff can insert invoices" ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role)
);

CREATE POLICY "Staff can update invoices" ON public.invoices FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role)
);

-- invoice_items
DROP POLICY IF EXISTS "Authenticated users can insert invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can read invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can update invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can delete invoice items" ON public.invoice_items;

CREATE POLICY "Staff can read invoice items" ON public.invoice_items FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role) OR has_role(auth.uid(), 'nurse'::app_role)
);

CREATE POLICY "Staff can insert invoice items" ON public.invoice_items FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role)
);

CREATE POLICY "Staff can update invoice items" ON public.invoice_items FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role)
);

CREATE POLICY "Staff can delete invoice items" ON public.invoice_items FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role)
);

-- payments
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can read payments" ON public.payments;

CREATE POLICY "Staff can read payments" ON public.payments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role) OR has_role(auth.uid(), 'nurse'::app_role)
);

CREATE POLICY "Staff can insert payments" ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'physician'::app_role)
);
