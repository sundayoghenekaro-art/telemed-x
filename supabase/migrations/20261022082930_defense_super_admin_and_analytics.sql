/*
# Defense Health Network: Super Admin table and consultation analytics view

## Purpose
Adds a dedicated defense super admin role that can view all active medical personnel,
facilities, and consultation analytics across the entire defense health network.
This is separate from the public hospital system's admin role.

## New Tables
1. `defense_super_admins` — links auth.users to defense super admin status
   - `user_id` (uuid, references auth.users, unique)
   - `full_name` (text)
   - `status` (text, active/suspended)
   - `created_at` (timestamptz)

## New Functions
1. `is_defense_super_admin(p_user uuid)` — SECURITY DEFINER helper for RLS policies.

## New Views
1. `defense_consultation_analytics` — joins consultations with personnel, facilities,
   and staff to expose: consultation details, patient name, consulting physician name,
   facility name and location. Uses SECURITY INVOKER so RLS on underlying tables applies.

## Security
- RLS enabled on `defense_super_admins`.
- Only defense super admins or self can read the super admin table.
- `is_defense_super_admin` is SECURITY DEFINER, EXECUTE revoked from anon.
- Existing defense table SELECT policies extended to include super admin access.
- Analytics view uses SECURITY INVOKER (Postgres 15+).
*/

-- ============================================================
-- 1. Defense Super Admins table
-- ============================================================
CREATE TABLE IF NOT EXISTS defense_super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE defense_super_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Helper: is user a defense super admin?
--    Created BEFORE policies that reference it.
-- ============================================================
CREATE OR REPLACE FUNCTION is_defense_super_admin(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM defense_super_admins
    WHERE user_id = p_user AND status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION is_defense_super_admin(uuid) FROM anon;

-- ============================================================
-- 3. Super admin table policies (after function exists)
-- ============================================================
DROP POLICY IF EXISTS "select_own_super_admin" ON defense_super_admins;
CREATE POLICY "select_own_super_admin"
  ON defense_super_admins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_defense_super_admin(auth.uid()));

DROP POLICY IF EXISTS "insert_own_super_admin" ON defense_super_admins;
CREATE POLICY "insert_own_super_admin"
  ON defense_super_admins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_super_admin" ON defense_super_admins;
CREATE POLICY "update_own_super_admin"
  ON defense_super_admins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_super_admin" ON defense_super_admins;
CREATE POLICY "delete_own_super_admin"
  ON defense_super_admins FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_defense_super_admins_user ON defense_super_admins(user_id);

-- ============================================================
-- 4. Extend defense table policies to include super admins
-- ============================================================

-- defense_facilities
DROP POLICY IF EXISTS "super_admin_select_facilities" ON defense_facilities;
CREATE POLICY "super_admin_select_facilities"
  ON defense_facilities FOR SELECT
  TO authenticated
  USING (is_defense_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super_admin_update_facilities" ON defense_facilities;
CREATE POLICY "super_admin_update_facilities"
  ON defense_facilities FOR UPDATE
  TO authenticated
  USING (is_defense_super_admin(auth.uid()))
  WITH CHECK (is_defense_super_admin(auth.uid()));

-- defense_medical_staff
DROP POLICY IF EXISTS "super_admin_select_staff" ON defense_medical_staff;
CREATE POLICY "super_admin_select_staff"
  ON defense_medical_staff FOR SELECT
  TO authenticated
  USING (is_defense_super_admin(auth.uid()));

-- defense_personnel
DROP POLICY IF EXISTS "super_admin_select_personnel" ON defense_personnel;
CREATE POLICY "super_admin_select_personnel"
  ON defense_personnel FOR SELECT
  TO authenticated
  USING (is_defense_super_admin(auth.uid()));

-- defense_medical_records
DROP POLICY IF EXISTS "super_admin_select_records" ON defense_medical_records;
CREATE POLICY "super_admin_select_records"
  ON defense_medical_records FOR SELECT
  TO authenticated
  USING (is_defense_super_admin(auth.uid()));

-- defense_field_consultations
DROP POLICY IF EXISTS "super_admin_select_consultations" ON defense_field_consultations;
CREATE POLICY "super_admin_select_consultations"
  ON defense_field_consultations FOR SELECT
  TO authenticated
  USING (is_defense_super_admin(auth.uid()));

-- defense_triage_referrals
DROP POLICY IF EXISTS "super_admin_select_triage" ON defense_triage_referrals;
CREATE POLICY "super_admin_select_triage"
  ON defense_triage_referrals FOR SELECT
  TO authenticated
  USING (is_defense_super_admin(auth.uid()));

-- ============================================================
-- 5. Consultation Analytics View
--    Uses SECURITY INVOKER so RLS on underlying tables applies.
-- ============================================================
CREATE OR REPLACE VIEW defense_consultation_analytics AS
SELECT
  c.id AS consultation_id,
  c.chief_complaint,
  c.consultation_type,
  c.status,
  c.priority,
  c.field_location,
  c.field_conditions,
  c.specialist_notes,
  c.recommendations,
  c.created_at,
  c.updated_at,
  p.id AS personnel_id,
  p.full_name AS personnel_name,
  p.service_number,
  p.rank AS personnel_rank,
  p.branch,
  p.unit,
  rf.id AS requesting_facility_id,
  rf.name AS requesting_facility_name,
  rf.type AS requesting_facility_type,
  rf.region AS requesting_facility_region,
  sf.id AS supporting_facility_id,
  sf.name AS supporting_facility_name,
  sf.type AS supporting_facility_type,
  sf.region AS supporting_facility_region,
  rs.id AS requesting_staff_id,
  rs.full_name AS requesting_physician_name,
  rs.rank AS requesting_physician_rank,
  rs.role AS requesting_physician_role,
  rs.specialty AS requesting_physician_specialty,
  ss.id AS supporting_staff_id,
  ss.full_name AS supporting_physician_name,
  ss.rank AS supporting_physician_rank,
  ss.role AS supporting_physician_role,
  ss.specialty AS supporting_physician_specialty
FROM defense_field_consultations c
LEFT JOIN defense_personnel p ON c.personnel_id = p.id
LEFT JOIN defense_facilities rf ON c.requesting_facility_id = rf.id
LEFT JOIN defense_facilities sf ON c.supporting_facility_id = sf.id
LEFT JOIN defense_medical_staff rs ON c.requesting_staff_id = rs.id
LEFT JOIN defense_medical_staff ss ON c.supporting_staff_id = ss.id;

ALTER VIEW defense_consultation_analytics SET (security_invoker = true);
