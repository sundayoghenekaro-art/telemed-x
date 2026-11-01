/*
# Revoke anon/PUBLIC EXECUTE on SECURITY DEFINER helpers

## Problem
Migration 20261022082241 revoked EXECUTE on the RLS helper functions from `anon`,
but PostgreSQL grants EXECUTE on new functions to PUBLIC by default. `anon` inherits
that grant through PUBLIC, so the revoke had no effect. Verified against the live
project: POST /rest/v1/rpc/has_role returned HTTP 200 to an unauthenticated caller.

## Fix
Revoke EXECUTE from PUBLIC and anon on every SECURITY DEFINER function in `public`,
then grant it explicitly to `authenticated` (needed because RLS policies are evaluated
as the querying user) and `service_role`.

## Safety
- Idempotent: REVOKE/GRANT are safe to re-run.
- No application code calls these helpers via /rest/v1/rpc — they exist only for RLS.
- Policies still evaluate correctly for signed-in users.
*/

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn.signature);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END
$$;
