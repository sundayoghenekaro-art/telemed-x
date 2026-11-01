/*
# Patient Profile Enhancement — Allergies, Profile Photo, Extended Health Info

## What this does
Adds a patient allergies table and extends patient_accounts with fields needed for
a complete patient profile: profile photo URL, blood type, height, nationality,
occupation, and marital status. Also creates a private storage bucket for profile
photos with RLS policies so only the owner can read/write their own photos.

## New Tables
- `patient_allergies` — stores patient allergy records (allergen name, severity,
  reaction type, notes, date noted, created_at). Owner-scoped to the patient via
  `patient_user_id` with `DEFAULT auth.uid()`.

## Modified Tables
- `patient_accounts` — adds nullable columns: `photo_url` (text), `blood_type`
  (text), `height_cm` (numeric), `nationality` (text), `occupation` (text),
  `marital_status` (text). All optional so existing rows are unaffected.

## New Storage Bucket
- `profile-photos` — private bucket for patient profile pictures. RLS policies
  allow each authenticated user to read/write only their own folder.

## Security
- `patient_allergies`: RLS enabled, CRUD scoped to `auth.uid() = patient_user_id`,
  granted to `authenticated` only.
- `patient_accounts` already has RLS; the new columns inherit existing policies.
- `profile-photos` bucket: policies for SELECT/INSERT/UPDATE/DELETE scoped to
  the owner's folder path (`auth.uid() as text`).
*/

-- 1. Extend patient_accounts with profile fields
ALTER TABLE patient_accounts
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS marital_status text;

-- 2. Create patient_allergies table
CREATE TABLE IF NOT EXISTS patient_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  allergen text NOT NULL,
  severity text NOT NULL DEFAULT 'moderate'
    CHECK (severity = ANY (ARRAY['mild'::text, 'moderate'::text, 'severe'::text])),
  reaction_type text,
  notes text,
  noted_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON patient_allergies TO authenticated;

DROP POLICY IF EXISTS "select_own_allergies" ON patient_allergies;
CREATE POLICY "select_own_allergies" ON patient_allergies FOR SELECT
  TO authenticated USING (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "insert_own_allergies" ON patient_allergies;
CREATE POLICY "insert_own_allergies" ON patient_allergies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "update_own_allergies" ON patient_allergies;
CREATE POLICY "update_own_allergies" ON patient_allergies FOR UPDATE
  TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "delete_own_allergies" ON patient_allergies;
CREATE POLICY "delete_own_allergies" ON patient_allergies FOR DELETE
  TO authenticated USING (auth.uid() = patient_user_id);

-- 3. Create profile-photos storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: each user can manage only their own folder
DROP POLICY IF EXISTS "read_own_profile_photos" ON storage.objects;
CREATE POLICY "read_own_profile_photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "insert_own_profile_photos" ON storage.objects;
CREATE POLICY "insert_own_profile_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "update_own_profile_photos" ON storage.objects;
CREATE POLICY "update_own_profile_photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "delete_own_profile_photos" ON storage.objects;
CREATE POLICY "delete_own_profile_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Add index for faster allergy lookups
CREATE INDEX IF NOT EXISTS idx_patient_allergies_user ON patient_allergies(patient_user_id);
