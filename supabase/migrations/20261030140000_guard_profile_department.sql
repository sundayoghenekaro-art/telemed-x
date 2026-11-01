/*
# Guard profiles.department against self-service edits

## Problem
`profiles.department` now drives department-scoped visibility in the clinical
views. The existing "Users can update own profile" policy allows every column,
so a clinician could move themselves into another department.

## Change
A BEFORE UPDATE trigger rejects department changes from anyone who is not an
administrator. Service-role and migration writes (no auth.uid()) are unaffected,
as are administrator changes made through User Management.

## Notes
- No data is modified.
- Errors are raised rather than silently reverting so the client surfaces them.
*/

CREATE OR REPLACE FUNCTION public.guard_profile_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.department IS DISTINCT FROM OLD.department
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can change a staff member''s department'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_department ON public.profiles;
CREATE TRIGGER guard_profile_department
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_department();
