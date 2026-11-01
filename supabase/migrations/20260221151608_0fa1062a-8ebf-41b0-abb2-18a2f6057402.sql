
-- Patient Wallet table
CREATE TABLE public.patient_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can read own wallet"
  ON public.patient_wallets FOR SELECT
  USING (auth.uid() = patient_user_id);

CREATE POLICY "Patients can insert own wallet"
  ON public.patient_wallets FOR INSERT
  WITH CHECK (auth.uid() = patient_user_id);

CREATE POLICY "Patients can update own wallet"
  ON public.patient_wallets FOR UPDATE
  USING (auth.uid() = patient_user_id);

-- Wallet Transactions table
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.patient_wallets(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'credit', -- 'credit' or 'debit'
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'top_up', -- top_up, consultation, invoice, referral, medication, refund
  description text,
  reference_id text, -- invoice_id, session_id, referral_id, etc.
  payment_method text, -- stripe, manual, wallet
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'completed', -- pending, completed, failed, reversed
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can read own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = patient_user_id);

CREATE POLICY "Patients can insert own transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = patient_user_id);

-- Trigger to update wallet updated_at
CREATE TRIGGER update_wallet_updated_at
  BEFORE UPDATE ON public.patient_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_telemedicine_updated_at();

-- Enable realtime for wallet balance updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
