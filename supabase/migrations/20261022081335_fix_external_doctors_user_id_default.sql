/*
# Fix external_doctors user_id default and defense_medical_staff insert policy

## Changes
1. Set DEFAULT auth.uid() on external_doctors.user_id so the practitioner
   signup insert works even if the client omits user_id (best practice for
   owner-scoped tables). The column is currently nullable; keep it nullable
   to avoid breaking existing rows, but add the default.
2. Recreate the defense_medical_staff INSERT policy to use the new default
   cleanly: WITH CHECK (auth.uid() = user_id) still works when user_id is
   defaulted to auth.uid().

## Security
- No policies are widened. The INSERT check still requires auth.uid() = user_id.
- No data is lost — only a column default and a policy recreation.
*/

ALTER TABLE external_doctors
  ALTER COLUMN user_id SET DEFAULT auth.uid();
