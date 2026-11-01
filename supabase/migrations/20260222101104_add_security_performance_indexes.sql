/*
  # Add Security and Performance Indexes

  This migration adds missing indexes to improve query performance and security.
  Indexes on frequently queried columns prevent slow queries that could lead to
  denial of service and improve overall application performance.

  ## Indexes Added

  ### telemedicine_sessions Table
  - doctor_user_id: Frequently filtered when doctors view their sessions
  - patient_user_id: Frequently filtered when patients view their sessions  
  - status: Frequently filtered to show active/scheduled sessions
  - scheduled_at: Used for chronological ordering and date range queries

  ### patient_accounts Table
  - email: Used for lookups during login and user searches
  - user_id: Already has unique constraint but adding explicit index

  ### external_doctors Table
  - email: Used for lookups and validation
  - status: Filtered to show only approved doctors

  ### user_roles Table
  - Composite index on (user_id, role): Frequently used in RLS policies

  ### invoices Table
  - patient_id: Filtered when viewing patient-specific invoices
  - status: Filtered to show pending/paid invoices
  - issue_date: Used for date range queries and reporting

  ### insurance_claims Table
  - invoice_id: Foreign key lookups
  - status: Filtered to show pending/approved claims

  ### session_messages Table
  - session_id: Foreign key lookups for chat messages
  - created_at: Chronological ordering

  ### referrals Table
  - patient_upid: Filtered when viewing patient referrals
  - referring_doctor_user_id: Filtered when doctors view their referrals
  - vendor_id: Filtered when vendors view referrals
  - status: Filtered by referral status

  ## Performance Impact
  - Significantly faster filtered queries
  - Reduced database load
  - Better RLS policy performance
  - Improved user experience with faster page loads

  ## Security Impact
  - Prevents slow query DoS attacks
  - Faster RLS policy evaluation
  - Reduced risk of timeout-based enumeration attacks
*/

-- Telemedicine Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_doctor_user_id 
  ON public.telemedicine_sessions(doctor_user_id);

CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_patient_user_id 
  ON public.telemedicine_sessions(patient_user_id);

CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_status 
  ON public.telemedicine_sessions(status);

CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_scheduled_at 
  ON public.telemedicine_sessions(scheduled_at DESC);

-- Patient Accounts Indexes
CREATE INDEX IF NOT EXISTS idx_patient_accounts_email 
  ON public.patient_accounts(email);

CREATE INDEX IF NOT EXISTS idx_patient_accounts_user_id 
  ON public.patient_accounts(user_id);

-- External Doctors Indexes
CREATE INDEX IF NOT EXISTS idx_external_doctors_email 
  ON public.external_doctors(email);

CREATE INDEX IF NOT EXISTS idx_external_doctors_status 
  ON public.external_doctors(status);

-- User Roles Composite Index (for RLS policies)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
  ON public.user_roles(user_id, role);

-- Invoices Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id 
  ON public.invoices(patient_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status 
  ON public.invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_issue_date 
  ON public.invoices(issue_date DESC);

-- Invoice Items Index
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id 
  ON public.invoice_items(invoice_id);

-- Payments Index
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id 
  ON public.payments(invoice_id);

-- Insurance Claims Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_claims_invoice_id 
  ON public.insurance_claims(invoice_id);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_status 
  ON public.insurance_claims(status);

-- Session Messages Indexes
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id 
  ON public.session_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_session_messages_created_at 
  ON public.session_messages(created_at DESC);

-- Referrals Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_patient_upid 
  ON public.referrals(patient_upid);

CREATE INDEX IF NOT EXISTS idx_referrals_referring_doctor_user_id 
  ON public.referrals(referring_doctor_user_id);

CREATE INDEX IF NOT EXISTS idx_referrals_vendor_id 
  ON public.referrals(vendor_id);

CREATE INDEX IF NOT EXISTS idx_referrals_status 
  ON public.referrals(status);

-- Profiles Index
CREATE INDEX IF NOT EXISTS idx_profiles_email 
  ON public.profiles(email);

-- Anonymous Sessions Index
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_real_user_id 
  ON public.anonymous_sessions(real_user_id);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_session_id 
  ON public.anonymous_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_expires_at 
  ON public.anonymous_sessions(expires_at) 
  WHERE expires_at IS NOT NULL;

-- Radiology Reports Indexes
CREATE INDEX IF NOT EXISTS idx_radiology_reports_patient_upid 
  ON public.radiology_reports(patient_upid);

CREATE INDEX IF NOT EXISTS idx_radiology_reports_status 
  ON public.radiology_reports(status);

CREATE INDEX IF NOT EXISTS idx_radiology_reports_created_at 
  ON public.radiology_reports(created_at DESC);

-- Patient Vitals Index
CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient_user_id 
  ON public.patient_vitals(patient_user_id);

CREATE INDEX IF NOT EXISTS idx_patient_vitals_recorded_at 
  ON public.patient_vitals(recorded_at DESC);
