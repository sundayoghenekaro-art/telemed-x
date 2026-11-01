/*
# Tighten patient and staff profile reads

## Purpose
Prevents any signed-in account from browsing every patient's medical-account
contact and demographic information, and prevents ordinary accounts from listing
all staff profiles. Owners can still read their own records, while authorized
clinical and administrative roles retain the directory access required by the app.

## Modified Policies
- `patient_accounts`: replace the broad authenticated read policy with an own-record
  policy plus a staff-role policy.
- `profiles`: replace the unrestricted messaging read policy with own-profile access
  plus a staff-role directory policy.

## Security
- RLS remains enabled on both tables.
- No columns, rows, or stored data are deleted.
- Access is controlled with the existing `has_role(auth.uid(), app_role)` helper.
*/

DROP POLICY IF EXISTS "Authenticated staff can read patient accounts" ON patient_accounts;

DROP POLICY IF EXISTS "Staff can read patient accounts" ON patient_accounts;
CREATE POLICY "Staff can read patient accounts" ON patient_accounts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'physician'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'pharmacist'::app_role)
    OR has_role(auth.uid(), 'lab_technician'::app_role)
    OR has_role(auth.uid(), 'radiologist'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
    OR has_role(auth.uid(), 'billing'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated users can read profiles for messaging" ON profiles;

DROP POLICY IF EXISTS "Staff can read profiles" ON profiles;
CREATE POLICY "Staff can read profiles" ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'physician'::app_role)
    OR has_role(auth.uid(), 'nurse'::app_role)
    OR has_role(auth.uid(), 'pharmacist'::app_role)
    OR has_role(auth.uid(), 'lab_technician'::app_role)
    OR has_role(auth.uid(), 'radiologist'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
    OR has_role(auth.uid(), 'billing'::app_role)
  );
