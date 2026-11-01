/*
  # Fix Billing Table RLS Policies - Security Enhancement

  This migration addresses CRITICAL security vulnerabilities in billing-related tables
  by implementing proper role-based access control.

  ## Changes Made

  ### 1. Drop Overly Permissive Policies
  Removes all existing policies that allow ANY authenticated user to access ALL billing data

  ### 2. Implement Role-Based Access Control

  #### Invoices Table (patient_id is TEXT)
  - Billing/Admin staff can manage all invoices  
  - Patients can view their own invoices only

  #### Invoice Items Table
  - Billing/Admin staff can manage all invoice items
  - Patients can view their own invoice items
  
  #### Payments Table
  - Billing/Admin staff can manage all payments
  - Patients can view their own payments
  
  #### Insurance Claims Table (uses invoice_id relation)
  - Billing/Admin staff can manage all claims
  - Patients can view claims linked to their invoices

  ### 3. Security Impact
  - Prevents unauthorized access to financial data
  - Enforces principle of least privilege
  - Prevents invoice/payment fraud
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;

DROP POLICY IF EXISTS "Authenticated users can read invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can insert invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can update invoice items" ON public.invoice_items;

DROP POLICY IF EXISTS "Authenticated users can read payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;

DROP POLICY IF EXISTS "Authenticated users can read insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Authenticated users can insert insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Authenticated users can update insurance claims" ON public.insurance_claims;

-- INVOICES TABLE POLICIES

CREATE POLICY "Billing staff can manage all invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'billing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'billing')
    )
  );

CREATE POLICY "Patients can view own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id::text FROM public.patient_accounts
      WHERE user_id = auth.uid()
    )
  );

-- INVOICE ITEMS TABLE POLICIES

CREATE POLICY "Billing staff can manage all invoice items"
  ON public.invoice_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'billing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'billing')
    )
  );

CREATE POLICY "Patients can view own invoice items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE patient_id IN (
        SELECT id::text FROM public.patient_accounts
        WHERE user_id = auth.uid()
      )
    )
  );

-- PAYMENTS TABLE POLICIES

CREATE POLICY "Billing staff can manage all payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'billing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'billing')
    )
  );

CREATE POLICY "Patients can view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE patient_id IN (
        SELECT id::text FROM public.patient_accounts
        WHERE user_id = auth.uid()
      )
    )
  );

-- INSURANCE CLAIMS TABLE POLICIES

CREATE POLICY "Billing staff can manage all insurance claims"
  ON public.insurance_claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'billing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'billing')
    )
  );

CREATE POLICY "Patients can view own insurance claims"
  ON public.insurance_claims FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE patient_id IN (
        SELECT id::text FROM public.patient_accounts
        WHERE user_id = auth.uid()
      )
    )
  );
