/*
# Fix RLS recursion between patient_accounts and telemedicine_prescriptions

## Problem
`20261030150000` gave pharmacists a `patient_accounts` policy that reads
`telemedicine_prescriptions`. The older "Patients can read own prescriptions"
policy on that table already reads `patient_accounts`, so Postgres reported
"infinite recursion detected in policy" for pharmacist queries.

## Change
Move the prescription lookup into a SECURITY DEFINER helper that bypasses RLS,
and rebuild the pharmacist policy on top of it. The helper repeats the role
check so it returns false for anyone who is not a pharmacist.

## Security
- The helper only answers "does this account appear on a live prescription".
- Execute is revoked from `public`/`anon` and granted to `authenticated`.
- No policy is widened; patient self-access is unchanged.
*/

CREATE OR REPLACE FUNCTION public.is_pharmacy_patient(_patient_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'pharmacist'::app_role)
     AND EXISTS (
       SELECT 1
       FROM public.telemedicine_prescriptions p
       WHERE p.patient_account_id = _patient_account_id
         AND p.status <> 'cancelled'
     )
$$;

REVOKE ALL ON FUNCTION public.is_pharmacy_patient(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_pharmacy_patient(uuid) TO authenticated;

DROP POLICY IF EXISTS "Pharmacists can read prescription patients" ON public.patient_accounts;

CREATE POLICY "Pharmacists can read prescription patients" ON public.patient_accounts
  FOR SELECT TO authenticated
  USING (public.is_pharmacy_patient(id));
