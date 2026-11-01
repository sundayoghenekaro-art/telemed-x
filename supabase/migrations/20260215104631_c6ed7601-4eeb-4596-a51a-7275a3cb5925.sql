
-- Fix 1: Remove anonymous access policies and make authenticated policies PERMISSIVE
DROP POLICY "Anonymous users can read audit logs" ON allergy_override_audit_log;
DROP POLICY "Anonymous users can insert audit logs" ON allergy_override_audit_log;
DROP POLICY "Authenticated users can read audit logs" ON allergy_override_audit_log;
DROP POLICY "Authenticated users can insert audit logs" ON allergy_override_audit_log;

-- Recreate as PERMISSIVE for authenticated users only
CREATE POLICY "Authenticated users can read audit logs"
ON allergy_override_audit_log
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
ON allergy_override_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);
