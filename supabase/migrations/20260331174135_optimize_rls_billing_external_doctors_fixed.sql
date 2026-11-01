/*
  # Optimize RLS Policies - Billing and External Doctors (Fixed)

  1. Performance Optimization
    - Optimize billing-related policies (invoices, payments, insurance claims)
    - Optimize external doctors policies
    - Replace auth.uid() with (select auth.uid())
    - Fix overly permissive policies
*/

-- Invoices Policies (patient_id is text field, not a foreign key)
DROP POLICY IF EXISTS "Billing staff can manage all invoices" ON public.invoices;
CREATE POLICY "Billing staff can manage all invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'billing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'billing')
    )
  );

DROP POLICY IF EXISTS "Patients can view own invoices" ON public.invoices;
CREATE POLICY "Patients can view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (patient_id::uuid = (select auth.uid()));

-- Invoice Items Policies
DROP POLICY IF EXISTS "Billing staff can manage all invoice items" ON public.invoice_items;
CREATE POLICY "Billing staff can manage all invoice items" ON public.invoice_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'billing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'billing')
    )
  );

DROP POLICY IF EXISTS "Patients can view own invoice items" ON public.invoice_items;
CREATE POLICY "Patients can view own invoice items" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE patient_id::uuid = (select auth.uid())
    )
  );

-- Fix overly permissive delete policy for invoice items
DROP POLICY IF EXISTS "Authenticated users can delete invoice items" ON public.invoice_items;
CREATE POLICY "Billing staff can delete invoice items" ON public.invoice_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'billing')
    )
  );

-- Payments Policies
DROP POLICY IF EXISTS "Billing staff can manage all payments" ON public.payments;
CREATE POLICY "Billing staff can manage all payments" ON public.payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'billing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'billing')
    )
  );

DROP POLICY IF EXISTS "Patients can view own payments" ON public.payments;
CREATE POLICY "Patients can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE patient_id::uuid = (select auth.uid())
    )
  );

-- Insurance Claims Policies
DROP POLICY IF EXISTS "Billing staff can manage all insurance claims" ON public.insurance_claims;
CREATE POLICY "Billing staff can manage all insurance claims" ON public.insurance_claims
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'billing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'billing')
    )
  );

DROP POLICY IF EXISTS "Patients can view own insurance claims" ON public.insurance_claims;
CREATE POLICY "Patients can view own insurance claims" ON public.insurance_claims
  FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE patient_id::uuid = (select auth.uid())
    )
  );

-- External Doctors Policies
DROP POLICY IF EXISTS "Admins can read all external doctors" ON public.external_doctors;
CREATE POLICY "Admins can read all external doctors" ON public.external_doctors
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update external doctors" ON public.external_doctors;
CREATE POLICY "Admins can update external doctors" ON public.external_doctors
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "External doctors can insert own record" ON public.external_doctors;
CREATE POLICY "External doctors can insert own record" ON public.external_doctors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "External doctors can read own record" ON public.external_doctors;
CREATE POLICY "External doctors can read own record" ON public.external_doctors
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "External doctors can update own record" ON public.external_doctors;
CREATE POLICY "External doctors can update own record" ON public.external_doctors
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Fix overly permissive audit log policy
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.allergy_override_audit_log;
DROP POLICY IF EXISTS "Pharmacists can insert audit logs" ON public.allergy_override_audit_log;
CREATE POLICY "Pharmacists can insert audit logs" ON public.allergy_override_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'pharmacist'
    )
  );