/*
  # Fix Telemedicine Sessions RLS Policies - Security Enhancement

  This migration addresses HIGH severity security vulnerabilities in telemedicine_sessions
  by removing overly permissive policies and adding proper admin controls.

  ## Changes Made

  ### 1. Drop Overly Permissive Policies
  Removes policies that allow ANY authenticated user to read and manage ALL sessions:
  - "Authenticated staff can read all sessions" - allowed ANY staff to view ALL sessions
  - "Authenticated staff can manage sessions" - allowed ANY staff to modify ALL sessions

  ### 2. Add Missing Admin Policies
  - Admins can read all sessions
  - Admins can create any session
  - Admins can update any session
  - Admins can delete any session

  ### 3. Existing Good Policies (Kept)
  - Doctors can read own sessions
  - Doctors can create sessions
  - Doctors can update own sessions
  - Patients can read own sessions

  ### 4. Security Impact
  - Prevents unauthorized staff from viewing sensitive patient-doctor sessions
  - Prevents session hijacking or modification by unauthorized users
  - Enforces principle of least privilege
  - Complies with HIPAA privacy requirements
  - Only session participants (doctor/patient) and admins can access sessions

  ### 5. Important Notes
  - Sessions contain sensitive medical information (diagnosis, notes, prescriptions)
  - Audit logging should be added separately for admin access
*/

-- Drop overly permissive policies that allow ANY authenticated user full access
DROP POLICY IF EXISTS "Authenticated staff can read all sessions" ON public.telemedicine_sessions;
DROP POLICY IF EXISTS "Authenticated staff can manage sessions" ON public.telemedicine_sessions;

-- Add admin-specific policies

CREATE POLICY "Admins can read all sessions"
  ON public.telemedicine_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create any session"
  ON public.telemedicine_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update any session"
  ON public.telemedicine_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete any session"
  ON public.telemedicine_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
