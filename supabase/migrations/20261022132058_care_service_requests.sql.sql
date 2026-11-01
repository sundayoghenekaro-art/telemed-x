/*
# Add patient care provider and facility requests

## Purpose
Adds a durable request record so a patient can choose an available professional
caregiver or hospital facility before requesting care. The existing task and visit
features remain unchanged.

## New Tables
- `care_service_requests`
- `id` — unique request identifier.
- `patient_user_id` — authenticated patient who owns the request.
- `provider_type` — `caregiver` or `facility`.
- `caregiver_profile_id` — selected professional caregiver when applicable.
- `facility_id` — selected hospital facility when applicable.
- `service_type` — requested service such as home visit, nursing, therapy, or check-up.
- `preferred_date` — optional preferred date and time.
- `notes` — patient instructions or context.
- `status` — pending, accepted, declined, or completed.
- `created_at`, `updated_at` — audit timestamps.

## Security
- RLS is enabled on `care_service_requests`.
- Authenticated patients can only read, create, update, and delete their own requests.
- Data API access is granted only to the authenticated role.
- Provider and facility directories are read through their existing tables; no public
  directory records are created by this migration.
*/

CREATE TABLE IF NOT EXISTS care_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('caregiver', 'facility')),
  caregiver_profile_id uuid REFERENCES caregiver_profiles(id) ON DELETE SET NULL,
  facility_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  service_type text NOT NULL DEFAULT 'home_visit',
  preferred_date timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE care_service_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON care_service_requests TO authenticated;

DROP POLICY IF EXISTS "patients_read_own_care_requests" ON care_service_requests;
CREATE POLICY "patients_read_own_care_requests" ON care_service_requests FOR SELECT
  TO authenticated USING (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "patients_create_own_care_requests" ON care_service_requests;
CREATE POLICY "patients_create_own_care_requests" ON care_service_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "patients_update_own_care_requests" ON care_service_requests;
CREATE POLICY "patients_update_own_care_requests" ON care_service_requests FOR UPDATE
  TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "patients_delete_own_care_requests" ON care_service_requests;
CREATE POLICY "patients_delete_own_care_requests" ON care_service_requests FOR DELETE
  TO authenticated USING (auth.uid() = patient_user_id);

CREATE INDEX IF NOT EXISTS idx_care_service_requests_patient
  ON care_service_requests(patient_user_id, created_at DESC);
