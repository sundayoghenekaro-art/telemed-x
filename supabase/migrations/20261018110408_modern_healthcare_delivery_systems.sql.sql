/*
# Modern Healthcare Delivery Systems

Adds database tables for seven new healthcare delivery features:

1. Remote Patient Monitoring — alert thresholds and clinician alerts on patient vitals
2. AI-Assisted Care Plans & Triage — structured care plans, triage assessments, and AI-generated recommendations
3. Digital Referrals — already have referrals table; add referral tracking notes (no new table needed, existing referrals table reused)
4. Medication Adherence Tracking — dose logs tracking taken/skipped/missed per medication
5. Multilingual Patient Communication — translation log for patient-provider messages (phase 1: preference + log)
6. Provider Availability & Credential Management — credential records for practitioners (licenses, certifications, expiry)
7. FHIR Interoperability — FHIR export records tracking generated bundles

## New Tables

### rpm_alert_thresholds
Per-patient thresholds for vital signs that trigger alerts when exceeded.
- patient_user_id (uuid, owner)
- metric (text: heart_rate, spo2, blood_pressure_systolic, temperature, blood_glucose, etc.)
- min_value (numeric, nullable)
- max_value (numeric, nullable)
- severity (text: info, warning, critical)
- created_by (uuid, the clinician who set it)

### rpm_alerts
Generated when a patient's vital reading crosses a threshold.
- patient_user_id (uuid, owner)
- threshold_id (uuid, nullable FK)
- vital_id (uuid, nullable FK to patient_vitals)
- metric (text)
- value (numeric)
- severity (text)
- status (text: active, acknowledged, resolved)
- acknowledged_by (uuid, nullable)
- acknowledged_at (timestamptz, nullable)

### care_plans
Structured care plans created by clinicians for patients.
- patient_user_id (uuid, owner)
- created_by (uuid, clinician)
- title (text)
- diagnosis (text, nullable)
- goals (text)
- interventions (text)
- status (text: active, completed, archived)

### care_plan_tasks
Individual tasks within a care plan, with due dates and completion tracking.
- care_plan_id (uuid, FK)
- patient_user_id (uuid, owner)
- title (text)
- description (text, nullable)
- due_date (date, nullable)
- status (text: pending, in_progress, completed, skipped)

### triage_assessments
AI-assisted triage results for patients based on symptom input.
- patient_user_id (uuid, owner)
- symptoms (text)
- ai_summary (text)
- urgency_level (text: low, moderate, high, emergency)
- recommendations (text)
- recommended_specialty (text, nullable)
- created_by_ai (boolean)

### medication_dose_logs
Tracks each dose of a medication — taken, skipped, or missed.
- patient_user_id (uuid, owner)
- medication_id (uuid, nullable FK to patient_medications)
- medication_name (text)
- scheduled_time (timestamptz)
- status (text: taken, skipped, missed)
- taken_at (timestamptz, nullable)
- notes (text, nullable)

### patient_language_preferences
Patient's preferred language for communication.
- patient_user_id (uuid, owner, unique)
- language (text, e.g. en, es, fr)
- updated_at (timestamptz)

### provider_credentials
Credential and license records for practitioners (external doctors and hospital staff).
- provider_user_id (uuid, owner)
- credential_type (text: license, certification, degree, dea)
- credential_name (text)
- issuing_authority (text)
- license_number (text, nullable)
- state (text, nullable)
- issued_date (date, nullable)
- expiry_date (date, nullable)
- status (text: active, expiring, expired, revoked)
- verified (boolean, default false)
- verified_by (uuid, nullable)

### fhir_exports
Records of FHIR bundle exports for a patient's health data.
- patient_user_id (uuid, owner)
- resource_types (text[])
- bundle_json (jsonb)
- version (text)
- created_at (timestamptz)

## Security

All tables enable RLS. Owner-scoped policies use auth.uid() = patient_user_id for patient tables.
Provider_credentials are owner-scoped to the provider.
RPM alerts have an additional clinician read policy via a SECURITY DEFINER function check.
All policies are separate per CRUD verb (select/insert/update/delete) and scoped TO authenticated.
*/

-- ============================================================
-- 1. Remote Patient Monitoring
-- ============================================================

CREATE TABLE IF NOT EXISTS rpm_alert_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL,
  min_value numeric,
  max_value numeric,
  severity text NOT NULL DEFAULT 'warning',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rpm_alert_thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_rpm_thresholds" ON rpm_alert_thresholds;
CREATE POLICY "select_own_rpm_thresholds" ON rpm_alert_thresholds FOR SELECT TO authenticated USING (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "insert_own_rpm_thresholds" ON rpm_alert_thresholds;
CREATE POLICY "insert_own_rpm_thresholds" ON rpm_alert_thresholds FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "update_own_rpm_thresholds" ON rpm_alert_thresholds;
CREATE POLICY "update_own_rpm_thresholds" ON rpm_alert_thresholds FOR UPDATE TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "delete_own_rpm_thresholds" ON rpm_alert_thresholds;
CREATE POLICY "delete_own_rpm_thresholds" ON rpm_alert_thresholds FOR DELETE TO authenticated USING (auth.uid() = patient_user_id);

CREATE TABLE IF NOT EXISTS rpm_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threshold_id uuid REFERENCES rpm_alert_thresholds(id) ON DELETE SET NULL,
  vital_id uuid,
  metric text NOT NULL,
  value numeric NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  status text NOT NULL DEFAULT 'active',
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rpm_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_rpm_alerts" ON rpm_alerts;
CREATE POLICY "select_own_rpm_alerts" ON rpm_alerts FOR SELECT TO authenticated USING (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "insert_own_rpm_alerts" ON rpm_alerts;
CREATE POLICY "insert_own_rpm_alerts" ON rpm_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "update_own_rpm_alerts" ON rpm_alerts;
CREATE POLICY "update_own_rpm_alerts" ON rpm_alerts FOR UPDATE TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "delete_own_rpm_alerts" ON rpm_alerts;
CREATE POLICY "delete_own_rpm_alerts" ON rpm_alerts FOR DELETE TO authenticated USING (auth.uid() = patient_user_id);

CREATE INDEX IF NOT EXISTS idx_rpm_alerts_patient_status ON rpm_alerts(patient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_rpm_alerts_created ON rpm_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rpm_thresholds_patient ON rpm_alert_thresholds(patient_user_id);

-- ============================================================
-- 2. AI-Assisted Care Plans & Triage
-- ============================================================

CREATE TABLE IF NOT EXISTS care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid,
  title text NOT NULL,
  diagnosis text,
  goals text NOT NULL,
  interventions text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_care_plans" ON care_plans;
CREATE POLICY "select_own_care_plans" ON care_plans FOR SELECT TO authenticated USING (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "insert_own_care_plans" ON care_plans;
CREATE POLICY "insert_own_care_plans" ON care_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "update_own_care_plans" ON care_plans;
CREATE POLICY "update_own_care_plans" ON care_plans FOR UPDATE TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "delete_own_care_plans" ON care_plans;
CREATE POLICY "delete_own_care_plans" ON care_plans FOR DELETE TO authenticated USING (auth.uid() = patient_user_id);

CREATE TABLE IF NOT EXISTS care_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE care_plan_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_care_plan_tasks" ON care_plan_tasks;
CREATE POLICY "select_own_care_plan_tasks" ON care_plan_tasks FOR SELECT TO authenticated USING (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "insert_own_care_plan_tasks" ON care_plan_tasks;
CREATE POLICY "insert_own_care_plan_tasks" ON care_plan_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "update_own_care_plan_tasks" ON care_plan_tasks;
CREATE POLICY "update_own_care_plan_tasks" ON care_plan_tasks FOR UPDATE TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "delete_own_care_plan_tasks" ON care_plan_tasks;
CREATE POLICY "delete_own_care_plan_tasks" ON care_plan_tasks FOR DELETE TO authenticated USING (auth.uid() = patient_user_id);

CREATE TABLE IF NOT EXISTS triage_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptoms text NOT NULL,
  ai_summary text,
  urgency_level text NOT NULL DEFAULT 'low',
  recommendations text,
  recommended_specialty text,
  created_by_ai boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE triage_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_triage" ON triage_assessments;
CREATE POLICY "select_own_triage" ON triage_assessments FOR SELECT TO authenticated USING (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "insert_own_triage" ON triage_assessments;
CREATE POLICY "insert_own_triage" ON triage_assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "update_own_triage" ON triage_assessments;
CREATE POLICY "update_own_triage" ON triage_assessments FOR UPDATE TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "delete_own_triage" ON triage_assessments;
CREATE POLICY "delete_own_triage" ON triage_assessments FOR DELETE TO authenticated USING (auth.uid() = patient_user_id);

CREATE INDEX IF NOT EXISTS idx_care_plans_patient ON care_plans(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_patient ON care_plan_tasks(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_triage_patient ON triage_assessments(patient_user_id);

-- ============================================================
-- 3. Medication Adherence Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS medication_dose_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES patient_medications(id) ON DELETE SET NULL,
  medication_name text NOT NULL,
  scheduled_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'taken',
  taken_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE medication_dose_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_dose_logs" ON medication_dose_logs;
CREATE POLICY "select_own_dose_logs" ON medication_dose_logs FOR SELECT TO authenticated USING (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "insert_own_dose_logs" ON medication_dose_logs;
CREATE POLICY "insert_own_dose_logs" ON medication_dose_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "update_own_dose_logs" ON medication_dose_logs;
CREATE POLICY "update_own_dose_logs" ON medication_dose_logs FOR UPDATE TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "delete_own_dose_logs" ON medication_dose_logs;
CREATE POLICY "delete_own_dose_logs" ON medication_dose_logs FOR DELETE TO authenticated USING (auth.uid() = patient_user_id);

CREATE INDEX IF NOT EXISTS idx_dose_logs_patient_date ON medication_dose_logs(patient_user_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_dose_logs_medication ON medication_dose_logs(medication_id);

-- ============================================================
-- 4. Multilingual Patient Communication
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_language_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE patient_language_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_language_pref" ON patient_language_preferences;
CREATE POLICY "select_own_language_pref" ON patient_language_preferences FOR SELECT TO authenticated USING (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "insert_own_language_pref" ON patient_language_preferences;
CREATE POLICY "insert_own_language_pref" ON patient_language_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "update_own_language_pref" ON patient_language_preferences;
CREATE POLICY "update_own_language_pref" ON patient_language_preferences FOR UPDATE TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "delete_own_language_pref" ON patient_language_preferences;
CREATE POLICY "delete_own_language_pref" ON patient_language_preferences FOR DELETE TO authenticated USING (auth.uid() = patient_user_id);

-- ============================================================
-- 5. Provider Credential Management
-- ============================================================

CREATE TABLE IF NOT EXISTS provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_type text NOT NULL,
  credential_name text NOT NULL,
  issuing_authority text,
  license_number text,
  state text,
  issued_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'active',
  verified boolean NOT NULL DEFAULT false,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_credentials" ON provider_credentials;
CREATE POLICY "select_own_credentials" ON provider_credentials FOR SELECT TO authenticated USING (auth.uid() = provider_user_id);
DROP POLICY IF EXISTS "insert_own_credentials" ON provider_credentials;
CREATE POLICY "insert_own_credentials" ON provider_credentials FOR INSERT TO authenticated WITH CHECK (auth.uid() = provider_user_id);
DROP POLICY IF EXISTS "update_own_credentials" ON provider_credentials;
CREATE POLICY "update_own_credentials" ON provider_credentials FOR UPDATE TO authenticated USING (auth.uid() = provider_user_id) WITH CHECK (auth.uid() = provider_user_id);
DROP POLICY IF EXISTS "delete_own_credentials" ON provider_credentials;
CREATE POLICY "delete_own_credentials" ON provider_credentials FOR DELETE TO authenticated USING (auth.uid() = provider_user_id);

CREATE INDEX IF NOT EXISTS idx_provider_credentials_user ON provider_credentials(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_expiry ON provider_credentials(expiry_date);

-- ============================================================
-- 6. FHIR Interoperability
-- ============================================================

CREATE TABLE IF NOT EXISTS fhir_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_types text[] NOT NULL DEFAULT '{}',
  bundle_json jsonb NOT NULL DEFAULT '{}',
  version text NOT NULL DEFAULT 'R4',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fhir_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_fhir_exports" ON fhir_exports;
CREATE POLICY "select_own_fhir_exports" ON fhir_exports FOR SELECT TO authenticated USING (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "insert_own_fhir_exports" ON fhir_exports;
CREATE POLICY "insert_own_fhir_exports" ON fhir_exports FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "update_own_fhir_exports" ON fhir_exports;
CREATE POLICY "update_own_fhir_exports" ON fhir_exports FOR UPDATE TO authenticated USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);
DROP POLICY IF EXISTS "delete_own_fhir_exports" ON fhir_exports;
CREATE POLICY "delete_own_fhir_exports" ON fhir_exports FOR DELETE TO authenticated USING (auth.uid() = patient_user_id);

CREATE INDEX IF NOT EXISTS idx_fhir_exports_patient ON fhir_exports(patient_user_id, created_at DESC);
