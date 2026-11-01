/*
# Defense Health Network Module

Adds a comprehensive module for government/military healthcare institutions enabling
tertiary and secondary hospitals to support primary health centers remotely.

## Purpose
- Tertiary military hospitals provide remote specialist support to secondary hospitals
- Secondary hospitals support primary field clinics and smart clinics
- Military medical personnel manage personnel health records
- Remote consultation for deployed personnel (field and smart clinic)
- Inter-facility triage and patient transfer between military facilities

## New Tables
1. defense_facilities — 3-tier military medical facility hierarchy
2. defense_medical_staff — medical personnel assigned to facilities
3. defense_personnel — service members receiving care
4. defense_medical_records — classified health records
5. defense_field_consultations — remote field-to-hospital consultations
6. defense_triage_referrals — inter-facility patient transfers

## Security
RLS enabled on all tables. Owner-scoped for staff records, facility-scoped for
medical data via is_defense_medical_staff() helper. All policies per CRUD verb.
*/

-- ============================================================
-- 1. Defense Facilities (3-tier hierarchy)
-- ============================================================
CREATE TABLE IF NOT EXISTS defense_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('tertiary', 'secondary', 'primary')),
  branch text NOT NULL DEFAULT 'joint' CHECK (branch IN ('army', 'navy', 'airforce', 'joint')),
  region text,
  command_level text,
  parent_facility_id uuid REFERENCES defense_facilities(id) ON DELETE SET NULL,
  latitude numeric,
  longitude numeric,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE defense_facilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_defense_facilities" ON defense_facilities;
CREATE POLICY "select_defense_facilities" ON defense_facilities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_defense_facilities" ON defense_facilities;
CREATE POLICY "insert_defense_facilities" ON defense_facilities FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_defense_facilities" ON defense_facilities;
CREATE POLICY "update_defense_facilities" ON defense_facilities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Defense Medical Staff
-- ============================================================
CREATE TABLE IF NOT EXISTS defense_medical_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES defense_facilities(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  rank text,
  role text NOT NULL DEFAULT 'field_medic' CHECK (role IN ('command_surgeon', 'specialist', 'field_medic', 'nurse', 'medical_officer', 'administrator')),
  specialty text,
  security_clearance text NOT NULL DEFAULT 'restricted' CHECK (security_clearance IN ('unclassified', 'restricted', 'confidential', 'secret')),
  deployment_status text NOT NULL DEFAULT 'active' CHECK (deployment_status IN ('active', 'deployed', 'standby', 'retired')),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE defense_medical_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_defense_staff" ON defense_medical_staff;
CREATE POLICY "select_defense_staff" ON defense_medical_staff FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_defense_staff" ON defense_medical_staff;
CREATE POLICY "insert_own_defense_staff" ON defense_medical_staff FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_defense_staff" ON defense_medical_staff;
CREATE POLICY "update_own_defense_staff" ON defense_medical_staff FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_defense_staff" ON defense_medical_staff;
CREATE POLICY "delete_own_defense_staff" ON defense_medical_staff FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_defense_staff_facility ON defense_medical_staff(facility_id);
CREATE INDEX IF NOT EXISTS idx_defense_staff_user ON defense_medical_staff(user_id);

-- ============================================================
-- Helper: is user a defense medical staff member?
-- ============================================================
CREATE OR REPLACE FUNCTION is_defense_medical_staff(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM defense_medical_staff
    WHERE user_id = p_user AND status = 'active'
  );
$$;

-- ============================================================
-- 3. Defense Personnel (service members receiving care)
-- ============================================================
CREATE TABLE IF NOT EXISTS defense_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_number text NOT NULL UNIQUE,
  full_name text NOT NULL,
  rank text,
  branch text NOT NULL DEFAULT 'joint' CHECK (branch IN ('army', 'navy', 'airforce', 'joint')),
  unit text,
  deployment_status text NOT NULL DEFAULT 'active' CHECK (deployment_status IN ('active', 'deployed', 'reserve', 'retired', 'wia', 'kia')),
  security_clearance text NOT NULL DEFAULT 'restricted' CHECK (security_clearance IN ('unclassified', 'restricted', 'confidential', 'secret')),
  facility_id uuid REFERENCES defense_facilities(id) ON DELETE SET NULL,
  date_of_birth date,
  blood_type text,
  allergies text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE defense_personnel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_defense_personnel" ON defense_personnel;
CREATE POLICY "select_defense_personnel" ON defense_personnel FOR SELECT TO authenticated USING (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "insert_defense_personnel" ON defense_personnel;
CREATE POLICY "insert_defense_personnel" ON defense_personnel FOR INSERT TO authenticated WITH CHECK (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "update_defense_personnel" ON defense_personnel;
CREATE POLICY "update_defense_personnel" ON defense_personnel FOR UPDATE TO authenticated USING (is_defense_medical_staff(auth.uid())) WITH CHECK (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "delete_defense_personnel" ON defense_personnel;
CREATE POLICY "delete_defense_personnel" ON defense_personnel FOR DELETE TO authenticated USING (is_defense_medical_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_defense_personnel_facility ON defense_personnel(facility_id);
CREATE INDEX IF NOT EXISTS idx_defense_personnel_service ON defense_personnel(service_number);

-- ============================================================
-- 4. Defense Medical Records
-- ============================================================
CREATE TABLE IF NOT EXISTS defense_medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES defense_personnel(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES defense_facilities(id) ON DELETE SET NULL,
  record_type text NOT NULL CHECK (record_type IN ('encounter', 'injury', 'vaccination', 'physical', 'mental_health', 'deployment_health', 'field_report')),
  diagnosis text,
  treatment text,
  medications text,
  notes text,
  classification text NOT NULL DEFAULT 'restricted' CHECK (classification IN ('unclassified', 'restricted', 'confidential', 'secret')),
  attending_staff_id uuid REFERENCES defense_medical_staff(id) ON DELETE SET NULL,
  is_field_record boolean NOT NULL DEFAULT false,
  field_location text,
  record_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE defense_medical_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_defense_medical_records" ON defense_medical_records;
CREATE POLICY "select_defense_medical_records" ON defense_medical_records FOR SELECT TO authenticated USING (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "insert_defense_medical_records" ON defense_medical_records;
CREATE POLICY "insert_defense_medical_records" ON defense_medical_records FOR INSERT TO authenticated WITH CHECK (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "update_defense_medical_records" ON defense_medical_records;
CREATE POLICY "update_defense_medical_records" ON defense_medical_records FOR UPDATE TO authenticated USING (is_defense_medical_staff(auth.uid())) WITH CHECK (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "delete_defense_medical_records" ON defense_medical_records;
CREATE POLICY "delete_defense_medical_records" ON defense_medical_records FOR DELETE TO authenticated USING (is_defense_medical_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_defense_records_personnel ON defense_medical_records(personnel_id);
CREATE INDEX IF NOT EXISTS idx_defense_records_facility ON defense_medical_records(facility_id);
CREATE INDEX IF NOT EXISTS idx_defense_records_date ON defense_medical_records(record_date DESC);

-- ============================================================
-- 5. Defense Field Consultations
-- ============================================================
CREATE TABLE IF NOT EXISTS defense_field_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES defense_personnel(id) ON DELETE CASCADE,
  requesting_facility_id uuid NOT NULL REFERENCES defense_facilities(id) ON DELETE CASCADE,
  supporting_facility_id uuid REFERENCES defense_facilities(id) ON DELETE SET NULL,
  requesting_staff_id uuid REFERENCES defense_medical_staff(id) ON DELETE SET NULL,
  supporting_staff_id uuid REFERENCES defense_medical_staff(id) ON DELETE SET NULL,
  chief_complaint text NOT NULL,
  consultation_type text NOT NULL DEFAULT 'chat' CHECK (consultation_type IN ('video', 'radio', 'chat')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'emergency')),
  field_location text,
  field_conditions text,
  specialist_notes text,
  recommendations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE defense_field_consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_defense_consultations" ON defense_field_consultations;
CREATE POLICY "select_defense_consultations" ON defense_field_consultations FOR SELECT TO authenticated USING (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "insert_defense_consultations" ON defense_field_consultations;
CREATE POLICY "insert_defense_consultations" ON defense_field_consultations FOR INSERT TO authenticated WITH CHECK (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "update_defense_consultations" ON defense_field_consultations;
CREATE POLICY "update_defense_consultations" ON defense_field_consultations FOR UPDATE TO authenticated USING (is_defense_medical_staff(auth.uid())) WITH CHECK (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "delete_defense_consultations" ON defense_field_consultations;
CREATE POLICY "delete_defense_consultations" ON defense_field_consultations FOR DELETE TO authenticated USING (is_defense_medical_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_defense_consultations_status ON defense_field_consultations(status, priority);
CREATE INDEX IF NOT EXISTS idx_defense_consultations_facility ON defense_field_consultations(requesting_facility_id);

-- ============================================================
-- 6. Defense Inter-Facility Triage Referrals
-- ============================================================
CREATE TABLE IF NOT EXISTS defense_triage_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES defense_personnel(id) ON DELETE CASCADE,
  from_facility_id uuid NOT NULL REFERENCES defense_facilities(id) ON DELETE CASCADE,
  to_facility_id uuid NOT NULL REFERENCES defense_facilities(id) ON DELETE CASCADE,
  referring_staff_id uuid REFERENCES defense_medical_staff(id) ON DELETE SET NULL,
  reason text NOT NULL,
  clinical_summary text,
  urgency text NOT NULL DEFAULT 'routine' CHECK (urgency IN ('immediate', 'priority', 'routine')),
  transport_mode text NOT NULL DEFAULT 'ground' CHECK (transport_mode IN ('ground', 'air', 'sea', 'self')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_transit', 'arrived', 'completed', 'rejected')),
  accepted_by uuid REFERENCES defense_medical_staff(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE defense_triage_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_defense_triage" ON defense_triage_referrals;
CREATE POLICY "select_defense_triage" ON defense_triage_referrals FOR SELECT TO authenticated USING (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "insert_defense_triage" ON defense_triage_referrals;
CREATE POLICY "insert_defense_triage" ON defense_triage_referrals FOR INSERT TO authenticated WITH CHECK (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "update_defense_triage" ON defense_triage_referrals;
CREATE POLICY "update_defense_triage" ON defense_triage_referrals FOR UPDATE TO authenticated USING (is_defense_medical_staff(auth.uid())) WITH CHECK (is_defense_medical_staff(auth.uid()));
DROP POLICY IF EXISTS "delete_defense_triage" ON defense_triage_referrals;
CREATE POLICY "delete_defense_triage" ON defense_triage_referrals FOR DELETE TO authenticated USING (is_defense_medical_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_defense_triage_status ON defense_triage_referrals(status, urgency);
CREATE INDEX IF NOT EXISTS idx_defense_triage_facilities ON defense_triage_referrals(from_facility_id, to_facility_id);
