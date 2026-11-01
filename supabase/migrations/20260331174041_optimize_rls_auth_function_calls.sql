/*
  # Optimize RLS Policies - Auth Function Initialization

  1. Performance Optimization
    - Replace direct auth.uid() calls with (select auth.uid()) in RLS policies
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale
  
  2. Security
    - Maintains same security posture
    - Only changes implementation for better performance
  
  3. Affected Tables
    - All tables with RLS policies using auth.uid() or auth.jwt()
*/

-- Channel Members Policies
DROP POLICY IF EXISTS "Members can see co-members" ON public.channel_members;
CREATE POLICY "Members can see co-members" ON public.channel_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
      AND cm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert memberships" ON public.channel_members;
CREATE POLICY "Users can insert memberships" ON public.channel_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()) OR channel_id IN (
    SELECT channel_id FROM public.channel_members WHERE user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can read own memberships" ON public.channel_members;
CREATE POLICY "Users can read own memberships" ON public.channel_members
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own membership" ON public.channel_members;
CREATE POLICY "Users can update own membership" ON public.channel_members
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Radiology Reports Policies
DROP POLICY IF EXISTS "Clinical staff can read radiology reports" ON public.radiology_reports;
CREATE POLICY "Clinical staff can read radiology reports" ON public.radiology_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('physician', 'radiologist', 'nurse', 'admin')
    )
  );

DROP POLICY IF EXISTS "Radiologists can insert radiology reports" ON public.radiology_reports;
CREATE POLICY "Radiologists can insert radiology reports" ON public.radiology_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'radiologist'
    )
  );

DROP POLICY IF EXISTS "Radiologists can update radiology reports" ON public.radiology_reports;
CREATE POLICY "Radiologists can update radiology reports" ON public.radiology_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'radiologist'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'radiologist'
    )
  );

-- Staff Messages Policies
DROP POLICY IF EXISTS "Members can read messages" ON public.staff_messages;
CREATE POLICY "Members can read messages" ON public.staff_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_id = staff_messages.channel_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can send messages" ON public.staff_messages;
CREATE POLICY "Members can send messages" ON public.staff_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_id = staff_messages.channel_id
      AND user_id = (select auth.uid())
    )
  );

-- Critical Finding Notifications Policies
DROP POLICY IF EXISTS "Clinical staff can read critical notifications" ON public.critical_finding_notifications;
CREATE POLICY "Clinical staff can read critical notifications" ON public.critical_finding_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('physician', 'radiologist', 'nurse', 'admin')
    )
  );

DROP POLICY IF EXISTS "Clinical staff can update critical notifications" ON public.critical_finding_notifications;
CREATE POLICY "Clinical staff can update critical notifications" ON public.critical_finding_notifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('physician', 'radiologist', 'nurse', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role IN ('physician', 'radiologist', 'nurse', 'admin')
    )
  );

DROP POLICY IF EXISTS "Radiologists can insert critical notifications" ON public.critical_finding_notifications;
CREATE POLICY "Radiologists can insert critical notifications" ON public.critical_finding_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'radiologist'
    )
  );