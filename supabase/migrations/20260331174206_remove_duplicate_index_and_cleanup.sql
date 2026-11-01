/*
  # Remove Duplicate Index and Performance Cleanup

  1. Index Cleanup
    - Remove duplicate index on biometric_credentials
    - Keep the more descriptive index name
  
  2. Notes
    - biometric_credentials_credential_id_key is a unique constraint index
    - idx_biometric_credentials_credential_id is a duplicate
    - We'll keep the constraint and remove the manual index
*/

-- Remove duplicate index (keeping the unique constraint index)
DROP INDEX IF EXISTS public.idx_biometric_credentials_credential_id;