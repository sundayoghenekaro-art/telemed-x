/*
# Fix over-broad RLS policies and revoke anon EXECUTE on SECURITY DEFINER functions

## Problems fixed
1. defense_medical_staff SELECT policy used USING(true) TO authenticated — any signed-in
   user (patient, external doctor, vendor) could read ALL military medical staff records.
   Fixed: scope to is_defense_medical_staff(auth.uid()) so only defense staff can see
   other defense staff.
2. defense_facilities UPDATE policy used USING(true) TO authenticated with no WITH CHECK —
   any signed-in user could modify any facility's name, type, branch, region, or status.
   Fixed: scope to is_defense_medical_staff(auth.uid()) with matching WITH CHECK.
3. allergy_override_audit_log SELECT used USING(true) TO authenticated — any signed-in
   user could read all allergy override audit logs (pharmacist compliance data).
   Fixed: restrict SELECT to pharmacists and admins via has_role() check.
4. Six SECURITY DEFINER helper functions (has_role, is_super_admin, is_hospital_admin,
   is_vendor_admin, is_channel_member, is_defense_medical_staff) were executable by the
   anon role. These functions run as their owner (which bypasses RLS) and are used
   internally by RLS policies. They should not be directly callable by unauthenticated
   users. Fixed: REVOKE EXECUTE FROM anon on all six.

## What is NOT changed
- profiles SELECT USING(true) TO authenticated: this is a conscious design choice for
  the internal staff messaging system — staff need to look up colleagues by name/email
  to send messages. Narrowing it would break messaging. Left as-is.
- The UPDATE policies missing explicit WITH CHECK on user-owned tables (patient_accounts,
  patient_wallets, etc.): Postgres reuses USING when WITH CHECK is omitted, so these are
  safe for ownership-scoped policies (auth.uid() = user_id). No change needed.
- defense_facilities INSERT and UPDATE policies now require is_defense_medical_staff(),
  which means only defense staff can add/edit facilities. The public SELECT (for signup
  dropdown) remains TO anon, authenticated with status = 'active'.

## Security
- defense_medical_staff SELECT: now requires is_defense_medical_staff(auth.uid()) — only
  verified defense medical staff can see the staff directory.
- defense_facilities UPDATE: now requires is_defense_medical_staff(auth.uid()) — only
  defense staff can modify facilities.
- allergy_override_audit_log SELECT: now requires pharmacist or admin role.
- SECURITY DEFINER functions: anon can no longer call them directly via /rest/v1/rpc/.
  authenticated role retains EXECUTE (needed for RLS policy evaluation).
*/

-- 1. Fix defense_medical_staff SELECT policy
DROP POLICY IF EXISTS "select_defense_staff" ON defense_medical_staff;
CREATE POLICY "select_defense_staff"
  ON defense_medical_staff FOR SELECT
  TO authenticated
  USING (is_defense_medical_staff(auth.uid()));

-- 2. Fix defense_facilities UPDATE policy
DROP POLICY IF EXISTS "update_defense_facilities" ON defense_facilities;
CREATE POLICY "update_defense_facilities"
  ON defense_facilities FOR UPDATE
  TO authenticated
  USING (is_defense_medical_staff(auth.uid()))
  WITH CHECK (is_defense_medical_staff(auth.uid()));

-- 3. Fix allergy_override_audit_log SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON allergy_override_audit_log;
CREATE POLICY "Pharmacists and admins can read audit logs"
  ON allergy_override_audit_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'pharmacist'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 4. Revoke EXECUTE from anon on all SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION is_hospital_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION is_vendor_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION is_channel_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION is_defense_medical_staff(uuid) FROM anon;
