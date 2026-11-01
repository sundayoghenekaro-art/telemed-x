/*
  # Add Missing Foreign Key Indexes for Performance

  1. Performance Improvements
    - Add covering indexes for all foreign keys that were missing them
    - This resolves suboptimal query performance warnings
  
  2. Affected Tables
    - channel_members: Add index on user_id
    - consent_audit_log: Add index on consent_request_id
    - consent_requests: Add index on session_id
    - external_doctors: Add index on user_id
    - mood_assessments: Add index on session_id
    - patient_notifications: Add index on referral_id
    - referral_results: Add indexes on referral_id and vendor_id
    - referrals: Add index on hospital_id
    - staff_channels: Add index on created_by
    - staff_messages: Add indexes on channel_id and sender_id
    - telemedicine_prescriptions: Add indexes on patient_account_id and session_id
    - telemedicine_sessions: Add index on patient_account_id
    - vendor_staff: Add index on vendor_id
    - vendors: Add index on affiliated_hospital_id
    - wallet_transactions: Add index on wallet_id
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_log_consent_request_id ON public.consent_audit_log(consent_request_id);
CREATE INDEX IF NOT EXISTS idx_consent_requests_session_id ON public.consent_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_external_doctors_user_id ON public.external_doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_assessments_session_id ON public.mood_assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_patient_notifications_referral_id ON public.patient_notifications(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_results_referral_id ON public.referral_results(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_results_vendor_id ON public.referral_results(vendor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_hospital_id ON public.referrals(hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_channels_created_by ON public.staff_channels(created_by);
CREATE INDEX IF NOT EXISTS idx_staff_messages_channel_id ON public.staff_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_sender_id ON public.staff_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_prescriptions_patient_account_id ON public.telemedicine_prescriptions(patient_account_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_prescriptions_session_id ON public.telemedicine_prescriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_patient_account_id ON public.telemedicine_sessions(patient_account_id);
CREATE INDEX IF NOT EXISTS idx_vendor_staff_vendor_id ON public.vendor_staff(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_affiliated_hospital_id ON public.vendors(affiliated_hospital_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);