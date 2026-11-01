/*
# Fix defense facilities access and seed initial data

## Problems
1. The Defense Health sign-up page loads facilities via the anon-key Supabase client
   (the user is not yet authenticated when choosing a facility). The existing
   `select_defense_facilities` policy is scoped to `TO authenticated` only, so an
   unauthenticated visitor sees an empty facility dropdown — making registration
   impossible.
2. There are zero active defense facilities in the database, so even an authenticated
   user would see nothing.
3. `defense_medical_staff.user_id` has no `DEFAULT auth.uid()` — the insert from the
   signup page supplies it explicitly so it works today, but adding the default
   follows the owner-column best practice.

## Changes
1. Add a SELECT policy `select_defense_facilities_public` scoped to
   `TO anon, authenticated` with `USING (status = 'active')` so the signup
   dropdown can load active facilities without a session. Drop the old
   authenticated-only SELECT policy as the new one covers both roles.
2. Set `DEFAULT auth.uid()` on `defense_medical_staff.user_id`.
3. Seed 8 initial defense facilities across the three tiers (tertiary command
   hospitals, secondary regional hospitals, primary field clinics) covering
   Army, Navy, Air Force, and Joint commands. Branch values follow the existing
   CHECK constraint: army, navy, airforce, joint.

## Security
- The public SELECT policy only exposes rows with status = 'active' and the
  table contains only facility metadata (name, type, branch, region) — no
  sensitive medical data.
- All other defense tables remain behind authenticated + is_defense_medical_staff() checks.
- The user_id default does not weaken security — the INSERT policy still enforces
  auth.uid() = user_id.
*/

-- 1. Fix defense_facilities SELECT policy to allow anon (signup page needs it)
DROP POLICY IF EXISTS "select_defense_facilities" ON defense_facilities;
DROP POLICY IF EXISTS "select_defense_facilities_public" ON defense_facilities;

CREATE POLICY "select_defense_facilities_public"
  ON defense_facilities FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- 2. Add DEFAULT auth.uid() to defense_medical_staff.user_id
ALTER TABLE defense_medical_staff
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 3. Seed initial defense facilities (branch must match CHECK: army, navy, airforce, joint)
INSERT INTO defense_facilities (name, type, branch, region, status)
SELECT * FROM (VALUES
  ('Land Forces Command Medical Center', 'tertiary', 'army', 'National Capital Region', 'active'),
  ('Naval Medical Command Hospital', 'tertiary', 'navy', 'National Capital Region', 'active'),
  ('Air Force Aerospace Medical Center', 'tertiary', 'airforce', 'National Capital Region', 'active'),
  ('Joint Forces Regional Hospital - North', 'secondary', 'joint', 'Northern Command', 'active'),
  ('Eastern Regional Military Hospital', 'secondary', 'army', 'Eastern Command', 'active'),
  ('Southern Naval Regional Hospital', 'secondary', 'navy', 'Southern Command', 'active'),
  ('Forward Operating Base Clinic Alpha', 'primary', 'army', 'Field Operations', 'active'),
  ('Deployed Field Clinic Bravo', 'primary', 'joint', 'Field Operations', 'active')
) AS v(name, type, branch, region, status)
WHERE NOT EXISTS (
  SELECT 1 FROM defense_facilities df WHERE df.name = v.name
);
