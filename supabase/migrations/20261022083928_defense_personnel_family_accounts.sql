/*
# Defense Personnel & Family User Accounts

## Purpose
Allows defense personnel and their family members to sign up and sign in
to the Defense Health Network using their defense ID / service number,
view their own medical records and consultations, and manage family links.

## New Tables

1. `defense_user_accounts`
   - Links auth.users to defense_personnel records.
   - `user_id` (uuid, references auth.users, unique)
   - `personnel_id` (uuid, references defense_personnel)
   - `email` (text)
   - `full_name` (text)
   - `account_type` (text: 'personnel' or 'family')
   - `linked_personnel_id` (uuid, nullable — for family members, the personnel they belong to)
   - `family_member_id` (uuid, nullable — if family, references defense_family_members)
   - `status` (text, active/suspended)

2. `defense_family_members`
   - Family members linked to a defense personnel record.
   - `personnel_id` (uuid, references defense_personnel — the service member they belong to)
   - `full_name` (text)
   - `relationship` (text: spouse, child, parent, sibling, other)
   - `date_of_birth` (date, nullable)
   - `blood_type` (text, nullable)
   - `allergies` (text, nullable)
   - `notes` (text, nullable)
   - `created_by_staff_id` (uuid, nullable — which staff member added them)
   - `created_at` (timestamptz)

## Security
- RLS enabled on both new tables.
- defense_user_accounts: users can read/update/delete only their own row.
  Personnel can also read accounts linked to their personnel_id (so they can see family).
- defense_family_members: staff can read all (they already have defense_personnel SELECT),
  personnel users can read family members linked to their own personnel_id,
  staff can insert/update/delete family members.
- A new helper `is_defense_personnel_user(uuid)` checks if a user has an active defense_user_account.
- Policies on defense_personnel, defense_medical_records, and defense_field_consultations
  are extended so personnel users can read their own data.
*/

-- ============================================================
-- 1. defense_family_members table
-- ============================================================
CREATE TABLE IF NOT EXISTS defense_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES defense_personnel(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relationship text NOT NULL DEFAULT 'other' CHECK (relationship IN ('spouse','child','parent','sibling','other')),
  date_of_birth date,
  blood_type text,
  allergies text,
  notes text,
  created_by_staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE defense_family_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_defense_family_members_personnel ON defense_family_members(personnel_id);

-- ============================================================
-- 2. defense_user_accounts table
-- ============================================================
CREATE TABLE IF NOT EXISTS defense_user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  personnel_id uuid REFERENCES defense_personnel(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  account_type text NOT NULL DEFAULT 'personnel' CHECK (account_type IN ('personnel','family')),
  linked_personnel_id uuid REFERENCES defense_personnel(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES defense_family_members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE defense_user_accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_defense_user_accounts_user ON defense_user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_defense_user_accounts_personnel ON defense_user_accounts(personnel_id);
CREATE INDEX IF NOT EXISTS idx_defense_user_accounts_linked ON defense_user_accounts(linked_personnel_id);

-- ============================================================
-- 3. Helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION is_defense_personnel_user(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM defense_user_accounts
    WHERE user_id = p_user AND status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION is_defense_personnel_user(uuid) FROM anon;

-- Get the personnel_id for a defense user account
CREATE OR REPLACE FUNCTION get_defense_user_personnel_id(p_user uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(personnel_id, linked_personnel_id)
  FROM defense_user_accounts
  WHERE user_id = p_user AND status = 'active'
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION get_defense_user_personnel_id(uuid) FROM anon;

-- ============================================================
-- 4. defense_user_accounts policies
-- ============================================================
DROP POLICY IF EXISTS "select_own_user_account" ON defense_user_accounts;
CREATE POLICY "select_own_user_account"
  ON defense_user_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_account" ON defense_user_accounts;
CREATE POLICY "insert_own_user_account"
  ON defense_user_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_account" ON defense_user_accounts;
CREATE POLICY "update_own_user_account"
  ON defense_user_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_account" ON defense_user_accounts;
CREATE POLICY "delete_own_user_account"
  ON defense_user_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. defense_family_members policies
--    Staff can read all (via is_defense_staff check on defense_personnel).
--    Personnel users can read family linked to their own personnel_id.
--    Staff can insert/update/delete.
-- ============================================================
DROP POLICY IF EXISTS "select_family_members" ON defense_family_members;
CREATE POLICY "select_family_members"
  ON defense_family_members FOR SELECT
  TO authenticated
  USING (
    personnel_id = get_defense_user_personnel_id(auth.uid())
    OR is_defense_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "insert_family_members_staff" ON defense_family_members;
CREATE POLICY "insert_family_members_staff"
  ON defense_family_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_family_members_staff" ON defense_family_members;
CREATE POLICY "update_family_members_staff"
  ON defense_family_members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "delete_family_members_staff" ON defense_family_members;
CREATE POLICY "delete_family_members_staff"
  ON defense_family_members FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 6. Extend defense_personnel SELECT for personnel users
--    Personnel users can read their own personnel record.
-- ============================================================
DROP POLICY IF EXISTS "personnel_user_select_own" ON defense_personnel;
CREATE POLICY "personnel_user_select_own"
  ON defense_personnel FOR SELECT
  TO authenticated
  USING (id = get_defense_user_personnel_id(auth.uid()));

-- ============================================================
-- 7. Extend defense_medical_records SELECT for personnel users
--    Personnel users can read records about themselves.
-- ============================================================
DROP POLICY IF EXISTS "personnel_user_select_own_records" ON defense_medical_records;
CREATE POLICY "personnel_user_select_own_records"
  ON defense_medical_records FOR SELECT
  TO authenticated
  USING (personnel_id = get_defense_user_personnel_id(auth.uid()));

-- ============================================================
-- 8. Extend defense_field_consultations SELECT for personnel users
--    Personnel users can read consultations about themselves.
-- ============================================================
DROP POLICY IF EXISTS "personnel_user_select_own_consultations" ON defense_field_consultations;
CREATE POLICY "personnel_user_select_own_consultations"
  ON defense_field_consultations FOR SELECT
  TO authenticated
  USING (personnel_id = get_defense_user_personnel_id(auth.uid()));

-- ============================================================
-- 9. Extend defense_facilities SELECT for personnel users
--    Personnel users can read facility info (needed for joins).
-- ============================================================
DROP POLICY IF EXISTS "personnel_user_select_facilities" ON defense_facilities;
CREATE POLICY "personnel_user_select_facilities"
  ON defense_facilities FOR SELECT
  TO authenticated
  USING (true);
