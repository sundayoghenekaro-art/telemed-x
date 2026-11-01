/*
# Scope staff record access to the roles that need it

## Purpose
The role-permission matrix is enforced in the client, but several tables still
let any signed-in staff account read records outside its role. This migration
narrows the database policies so hiding a screen is backed by RLS.

## Changes
- `telemedicine_prescriptions`: replace the "any authenticated user" read policy
  with the prescribing doctor plus admin/physician/nurse/pharmacist.
- `patient_accounts`: the hospital-wide directory is limited to admin, physician,
  nurse and receptionist. A pharmacist can read only the patient accounts that
  appear on a non-cancelled prescription, which is exactly what is needed to
  verify and dispense. Patients keep access to their own row.
- `invoices`, `invoice_items`, `payments`: include the `billing` role (it was
  missing, so billing staff could not read their own tables) and restrict writes
  to admin and billing. Reception keeps read access only.

## Security
- RLS stays enabled; no rows or columns are deleted.
- No INSERT/UPDATE policy is widened for pharmacists: dispensing remains a
  read-only concern for the server until a dedicated RPC is reviewed.
*/

-- 1. Prescriptions -----------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated staff can read prescriptions" ON public.telemedicine_prescriptions;
DROP POLICY IF EXISTS "Clinical staff can read prescriptions" ON public.telemedicine_prescriptions;

CREATE POLICY "Clinical staff can read prescriptions" ON public.telemedicine_prescriptions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = doctor_user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'physician'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'pharmacist'::app_role)
  );

-- 2. Patient accounts --------------------------------------------------------

DROP POLICY IF EXISTS "Staff can read patient accounts" ON public.patient_accounts;
DROP POLICY IF EXISTS "Clinical and front-desk staff can read patient accounts" ON public.patient_accounts;
DROP POLICY IF EXISTS "Pharmacists can read prescription patients" ON public.patient_accounts;

CREATE POLICY "Clinical and front-desk staff can read patient accounts" ON public.patient_accounts
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'physician'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
  );

CREATE POLICY "Pharmacists can read prescription patients" ON public.patient_accounts
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'pharmacist'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.telemedicine_prescriptions p
      WHERE p.patient_account_id = patient_accounts.id
        AND p.status <> 'cancelled'
    )
  );

-- 3. Billing tables ----------------------------------------------------------

DROP POLICY IF EXISTS "Staff can read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON public.invoices;

CREATE POLICY "Staff can read invoices" ON public.invoices FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'physician'::app_role)
  OR has_role(auth.uid(), 'nurse'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY "Staff can insert invoices" ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
);

CREATE POLICY "Staff can update invoices" ON public.invoices FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
);

DROP POLICY IF EXISTS "Staff can read invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff can insert invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff can update invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff can delete invoice items" ON public.invoice_items;

CREATE POLICY "Staff can read invoice items" ON public.invoice_items FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'physician'::app_role)
  OR has_role(auth.uid(), 'nurse'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY "Staff can insert invoice items" ON public.invoice_items FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
);

CREATE POLICY "Staff can update invoice items" ON public.invoice_items FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
);

CREATE POLICY "Staff can delete invoice items" ON public.invoice_items FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
);

DROP POLICY IF EXISTS "Staff can read payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON public.payments;

CREATE POLICY "Staff can read payments" ON public.payments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'physician'::app_role)
  OR has_role(auth.uid(), 'nurse'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY "Staff can insert payments" ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'billing'::app_role)
);
