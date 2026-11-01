/*
# Ambulance GPS location prompts for requesting patients

## 1. New table
- `ambulance_location_requests`
  - Prompts sent from the ambulance dispatch console to a requesting patient,
    asking them to share their live GPS location so the crew can find them and
    route to the closest appropriate facility.
  - `ambulance_request_id` (uuid, fk to ambulance_requests, on delete cascade)
  - `patient_user_id` (uuid, fk to auth.users) — the patient being prompted
  - `status` (text: pending / shared / declined, default 'pending')
  - `latitude`, `longitude` (double precision) — the shared GPS position
  - `accuracy_m` (double precision) — GPS accuracy in meters
  - `created_at`, `responded_at` (timestamptz)

## 2. Security (RLS)
- RLS enabled on ambulance_location_requests.
- Crew (users with an active ambulance_accounts row): full CRUD — they create
  prompts and read the patient responses.
- Patients: can read and update (respond to) only their own prompt rows.
- Patients cannot insert or delete prompt rows.

## 3. Notes
- No changes to existing tables. When a patient shares GPS, the patient also
  updates the linked ambulance_requests pickup latitude/longitude, which the
  existing owner-scoped update policy on ambulance_requests already allows.
- Index added on patient_user_id + status for fast lookup of pending prompts.
*/

CREATE TABLE IF NOT EXISTS ambulance_location_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambulance_request_id uuid NOT NULL REFERENCES ambulance_requests(id) ON DELETE CASCADE,
  patient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shared', 'declined')),
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE ambulance_location_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ambulance_loc_reqs_patient_status
  ON ambulance_location_requests (patient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_ambulance_loc_reqs_request
  ON ambulance_location_requests (ambulance_request_id);

-- Crew: full CRUD on location prompts (creating prompts, reading responses)
DROP POLICY IF EXISTS "crew_select_location_requests" ON ambulance_location_requests;
CREATE POLICY "crew_select_location_requests"
ON ambulance_location_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ambulance_accounts
    WHERE ambulance_accounts.user_id = auth.uid()
      AND ambulance_accounts.status = 'active'
  )
  OR patient_user_id = auth.uid()
);

DROP POLICY IF EXISTS "crew_insert_location_requests" ON ambulance_location_requests;
CREATE POLICY "crew_insert_location_requests"
ON ambulance_location_requests FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ambulance_accounts
    WHERE ambulance_accounts.user_id = auth.uid()
      AND ambulance_accounts.status = 'active'
  )
);

DROP POLICY IF EXISTS "crew_or_patient_update_location_requests" ON ambulance_location_requests;
CREATE POLICY "crew_or_patient_update_location_requests"
ON ambulance_location_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ambulance_accounts
    WHERE ambulance_accounts.user_id = auth.uid()
      AND ambulance_accounts.status = 'active'
  )
  OR patient_user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ambulance_accounts
    WHERE ambulance_accounts.user_id = auth.uid()
      AND ambulance_accounts.status = 'active'
  )
  OR patient_user_id = auth.uid()
);

DROP POLICY IF EXISTS "crew_delete_location_requests" ON ambulance_location_requests;
CREATE POLICY "crew_delete_location_requests"
ON ambulance_location_requests FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ambulance_accounts
    WHERE ambulance_accounts.user_id = auth.uid()
      AND ambulance_accounts.status = 'active'
  )
);