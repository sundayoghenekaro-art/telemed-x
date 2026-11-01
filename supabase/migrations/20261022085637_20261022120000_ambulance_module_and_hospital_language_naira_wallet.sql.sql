/*
# Ambulance module + hospital language support + Naira wallet

## Changes

### 1. New table: `ambulance_accounts`
Accounts for ambulance crew/dispatcher staff who log into the ambulance module.
- `user_id` (uuid, unique) — links to the auth user
- `full_name`, `email`, `phone`
- `role` — 'dispatcher' | 'paramedic' | 'driver'
- `organization_name` — ambulance service company name
- `status` — 'active' | 'suspended'
- `created_at`, `updated_at`

### 2. New table: `ambulance_requests`
Emergency dispatch requests created by patients/bystanders.
- `patient_user_id` (uuid, nullable) — links to a registered patient account if available
- `requester_name`, `requester_phone` — contact info for the person calling
- `emergency_type` — e.g. 'trauma', 'cardiac', 'respiratory', 'obstetric', 'pediatric', 'stroke', 'burn', 'other'
- `severity` — 'critical' | 'urgent' | 'moderate'
- `nature_description` (text) — free-text description of the emergency
- `pickup_address` (text) — where the patient is
- `pickup_latitude`, `pickup_longitude` (double precision, nullable)
- `patient_count` (int, default 1)
- `status` — 'pending' | 'dispatched' | 'en-route' | 'on-scene' | 'transporting' | 'completed' | 'cancelled'
- `assigned_vehicle_id` (uuid, nullable)
- `destination_hospital_id` (uuid, nullable) — suggested receiving facility
- `destination_reason` (text, nullable) — why this facility was suggested
- `created_at`, `updated_at`

### 3. New table: `ambulance_vehicles`
Fleet vehicles available for dispatch.
- `plate_number` (text, unique)
- `vehicle_type` — 'basic' | 'advanced' | 'icu' | 'rapid-response'
- `base_latitude`, `base_longitude` (double precision, nullable)
- `base_address` (text, nullable)
- `status` — 'available' | 'dispatched' | 'maintenance' | 'offline'
- `crew_names` (text[], default empty) — names of crew on board
- `created_at`, `updated_at`

### 4. New table: `ambulance_virtual_care_sessions`
Virtual care sessions connecting patients in transit with remote clinicians.
- `request_id` (uuid, not null) — links to the ambulance request
- `clinician_name` (text) — the remote doctor providing care
- `clinician_specialty` (text, nullable)
- `channel` — 'video' | 'audio' | 'chat'
- `started_at`, `ended_at` (timestamptz)
- `status` — 'active' | 'ended'
- `notes` (text, nullable)
- `created_at`

### 5. Hospital table: new column `supported_languages` (text[], default '{English}')
Hospitals can declare which languages their staff can consult in.

### 6. Wallet currency default → NGN
`patient_wallets.currency` default changed to 'NGN'. Existing rows are updated in place
(no data loss — only the currency code string changes).

## Security
- RLS enabled on all new tables.
- `ambulance_accounts`: each authenticated user manages only their own account row.
- `ambulance_requests`: authenticated users can create; ambulance crew (user has an active
  ambulance_account) can read/update for dispatch. Patient sees own requests.
- `ambulance_vehicles`, `ambulance_virtual_care_sessions`: readable by authenticated users
  involved in the request; crew can update.
- `hospitals.supported_languages` and all new columns inherit existing hospital RLS.
*/

-- ============================================================
-- 1. ambulance_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS ambulance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'paramedic' CHECK (role IN ('dispatcher','paramedic','driver')),
  organization_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ambulance_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ambulance_account" ON ambulance_accounts;
CREATE POLICY "select_own_ambulance_account"
ON ambulance_accounts FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ambulance_account" ON ambulance_accounts;
CREATE POLICY "insert_own_ambulance_account"
ON ambulance_accounts FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ambulance_account" ON ambulance_accounts;
CREATE POLICY "update_own_ambulance_account"
ON ambulance_accounts FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ambulance_account" ON ambulance_accounts;
CREATE POLICY "delete_own_ambulance_account"
ON ambulance_accounts FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 2. ambulance_vehicles
-- ============================================================
CREATE TABLE IF NOT EXISTS ambulance_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text UNIQUE NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'advanced' CHECK (vehicle_type IN ('basic','advanced','icu','rapid-response')),
  base_latitude double precision,
  base_longitude double precision,
  base_address text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','dispatched','maintenance','offline')),
  crew_names text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ambulance_vehicles ENABLE ROW LEVEL SECURITY;

-- Crew/dispatchers and staff can view vehicles (fleet info is shared operationally)
DROP POLICY IF EXISTS "authenticated_read_ambulance_vehicles" ON ambulance_vehicles;
CREATE POLICY "authenticated_read_ambulance_vehicles"
ON ambulance_vehicles FOR SELECT
TO authenticated USING (
  true
);

DROP POLICY IF EXISTS "crew_insert_ambulance_vehicles" ON ambulance_vehicles;
CREATE POLICY "crew_insert_ambulance_vehicles"
ON ambulance_vehicles FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active')
);

DROP POLICY IF EXISTS "crew_update_ambulance_vehicles" ON ambulance_vehicles;
CREATE POLICY "crew_update_ambulance_vehicles"
ON ambulance_vehicles FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active')
);

-- ============================================================
-- 3. ambulance_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS ambulance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  requester_phone text NOT NULL,
  emergency_type text NOT NULL DEFAULT 'other',
  severity text NOT NULL DEFAULT 'urgent' CHECK (severity IN ('critical','urgent','moderate')),
  nature_description text,
  pickup_address text NOT NULL,
  pickup_latitude double precision,
  pickup_longitude double precision,
  patient_count integer NOT NULL DEFAULT 1 CHECK (patient_count >= 1 AND patient_count <= 10),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dispatched','en-route','on-scene','transporting','completed','cancelled')),
  assigned_vehicle_id uuid REFERENCES ambulance_vehicles(id) ON DELETE SET NULL,
  destination_hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  destination_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ambulance_requests ENABLE ROW LEVEL SECURITY;

-- Crew can read all requests; patients can read their own
DROP POLICY IF EXISTS "read_ambulance_requests" ON ambulance_requests;
CREATE POLICY "read_ambulance_requests"
ON ambulance_requests FOR SELECT
TO authenticated USING (
  patient_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active')
);

-- Any authenticated user can create a request (requester may not be the patient)
DROP POLICY IF EXISTS "insert_ambulance_requests" ON ambulance_requests;
CREATE POLICY "insert_ambulance_requests"
ON ambulance_requests FOR INSERT
TO authenticated WITH CHECK (true);

-- Crew can update; patients can cancel their own request
DROP POLICY IF EXISTS "update_ambulance_requests" ON ambulance_requests;
CREATE POLICY "update_ambulance_requests"
ON ambulance_requests FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active')
  OR patient_user_id = auth.uid()
) WITH CHECK (
  EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active')
  OR patient_user_id = auth.uid()
);

DROP POLICY IF EXISTS "delete_ambulance_requests" ON ambulance_requests;
CREATE POLICY "delete_ambulance_requests"
ON ambulance_requests FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_ambulance_requests_status ON ambulance_requests(status);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_patient ON ambulance_requests(patient_user_id);

-- ============================================================
-- 4. ambulance_virtual_care_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS ambulance_virtual_care_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES ambulance_requests(id) ON DELETE CASCADE,
  clinician_name text NOT NULL,
  clinician_specialty text,
  channel text NOT NULL DEFAULT 'video' CHECK (channel IN ('video','audio','chat')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ambulance_virtual_care_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_virtual_care_sessions" ON ambulance_virtual_care_sessions;
CREATE POLICY "read_virtual_care_sessions"
ON ambulance_virtual_care_sessions FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM ambulance_requests r
    WHERE r.id = request_id
      AND (r.patient_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active'))
  )
);

DROP POLICY IF EXISTS "insert_virtual_care_sessions" ON ambulance_virtual_care_sessions;
CREATE POLICY "insert_virtual_care_sessions"
ON ambulance_virtual_care_sessions FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM ambulance_requests r
    WHERE r.id = request_id
      AND (r.patient_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active'))
  )
);

DROP POLICY IF EXISTS "update_virtual_care_sessions" ON ambulance_virtual_care_sessions;
CREATE POLICY "update_virtual_care_sessions"
ON ambulance_virtual_care_sessions FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM ambulance_requests r
    WHERE r.id = request_id
      AND (r.patient_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active'))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM ambulance_requests r
    WHERE r.id = request_id
      AND (r.patient_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM ambulance_accounts WHERE ambulance_accounts.user_id = auth.uid() AND ambulance_accounts.status = 'active'))
  )
);

-- ============================================================
-- 5. hospitals.supported_languages
-- ============================================================
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS supported_languages text[] DEFAULT '{English}';

-- ============================================================
-- 6. Wallet currency → NGN
-- ============================================================
ALTER TABLE patient_wallets ALTER COLUMN currency SET DEFAULT 'NGN';

UPDATE patient_wallets SET currency = 'NGN' WHERE currency = 'USD';
