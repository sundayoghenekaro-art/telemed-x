/*
# Lock external doctor approval fields

## Problem
The self-service policies on `external_doctors` let a practitioner write their
own row without limiting which columns change:
- INSERT accepted any `status`, so a new applicant could self-approve.
- UPDATE accepted every column, including `status`, `reviewed_by` and
  `reviewed_at`, so a pending applicant could approve themselves.

## Change
- INSERT: an authenticated user can still create their own application, but only
  with `status = 'pending'` and no review metadata.
- UPDATE: self-service updates removed. Only administrators can update
  applications (approve / reject).

## Notes
- No data is modified.
- RLS stays enabled; the existing admin policies are unchanged.
*/

DROP POLICY IF EXISTS "External doctors can insert own record" ON public.external_doctors;
CREATE POLICY "External doctors can insert own record"
ON public.external_doctors FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND status = 'pending'
  AND rejection_reason IS NULL
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);

DROP POLICY IF EXISTS "External doctors can update own record" ON public.external_doctors;
