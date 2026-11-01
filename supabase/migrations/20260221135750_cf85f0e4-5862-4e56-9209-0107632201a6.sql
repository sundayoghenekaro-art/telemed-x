
-- Vendors table (labs, pharmacies, radiology centers)
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('lab', 'pharmacy', 'radiology')),
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  services TEXT[] DEFAULT '{}',
  accepted_insurance TEXT[] DEFAULT '{}',
  operating_hours JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'suspended')),
  affiliated_hospital_id UUID REFERENCES public.hospitals(id),
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Vendor admins
CREATE TABLE public.vendor_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);

ALTER TABLE public.vendor_admins ENABLE ROW LEVEL SECURITY;

-- Vendor staff
CREATE TABLE public.vendor_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id UUID,
  staff_name TEXT NOT NULL,
  role TEXT DEFAULT 'technician',
  license_number TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_staff ENABLE ROW LEVEL SECURITY;

-- Referrals (doctor creates, patient picks vendor)
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('lab', 'pharmacy', 'radiology')),
  patient_upid TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_user_id UUID,
  referring_doctor TEXT NOT NULL,
  referring_doctor_user_id UUID NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id),
  vendor_id UUID REFERENCES public.vendors(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
  clinical_notes TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  diagnosis_codes TEXT[] DEFAULT '{}',
  insurance_provider TEXT,
  policy_number TEXT,
  patient_chosen_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referral results (vendor uploads)
CREATE TABLE public.referral_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  uploaded_by TEXT NOT NULL,
  result_type TEXT NOT NULL DEFAULT 'report',
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'released')),
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_results ENABLE ROW LEVEL SECURITY;

-- Patient notifications for referral updates
CREATE TABLE public.patient_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  referral_id UUID REFERENCES public.referrals(id),
  type TEXT NOT NULL CHECK (type IN ('referral_created', 'result_ready', 'vendor_accepted', 'status_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: is_vendor_admin
CREATE OR REPLACE FUNCTION public.is_vendor_admin(_user_id UUID, _vendor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendor_admins
    WHERE user_id = _user_id AND vendor_id = _vendor_id
  )
$$;

-- RLS: vendors
CREATE POLICY "Anyone can read verified vendors" ON public.vendors
  FOR SELECT USING (status = 'verified');
CREATE POLICY "Vendor admins can read own vendor" ON public.vendors
  FOR SELECT USING (is_vendor_admin(auth.uid(), id));
CREATE POLICY "Vendor admins can update own vendor" ON public.vendors
  FOR UPDATE USING (is_vendor_admin(auth.uid(), id));
CREATE POLICY "Users can apply for vendor onboarding" ON public.vendors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND status = 'pending');
CREATE POLICY "Super admins can read all vendors" ON public.vendors
  FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update vendors" ON public.vendors
  FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Hospital admins can add affiliated vendors" ON public.vendors
  FOR INSERT WITH CHECK (
    affiliated_hospital_id IS NOT NULL
    AND is_hospital_admin(auth.uid(), affiliated_hospital_id)
  );

-- RLS: vendor_admins
CREATE POLICY "Applicants can insert themselves" ON public.vendor_admins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Vendor admins can read own" ON public.vendor_admins
  FOR SELECT USING (is_vendor_admin(auth.uid(), vendor_id));
CREATE POLICY "Super admins can manage" ON public.vendor_admins
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- RLS: vendor_staff
CREATE POLICY "Vendor admins can manage staff" ON public.vendor_staff
  FOR ALL USING (is_vendor_admin(auth.uid(), vendor_id)) WITH CHECK (is_vendor_admin(auth.uid(), vendor_id));
CREATE POLICY "Super admins can manage vendor staff" ON public.vendor_staff
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Active staff of verified vendors are public" ON public.vendor_staff
  FOR SELECT USING (
    status = 'active' AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = vendor_staff.vendor_id AND v.status = 'verified'
    )
  );

-- RLS: referrals
CREATE POLICY "Doctors can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referring_doctor_user_id);
CREATE POLICY "Doctors can read own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referring_doctor_user_id);
CREATE POLICY "Patients can read own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = patient_user_id);
CREATE POLICY "Patients can update own pending referrals" ON public.referrals
  FOR UPDATE USING (auth.uid() = patient_user_id AND status = 'pending');
CREATE POLICY "Vendor admins can read assigned referrals" ON public.referrals
  FOR SELECT USING (vendor_id IS NOT NULL AND is_vendor_admin(auth.uid(), vendor_id));
CREATE POLICY "Vendor admins can update assigned referrals" ON public.referrals
  FOR UPDATE USING (vendor_id IS NOT NULL AND is_vendor_admin(auth.uid(), vendor_id));
CREATE POLICY "Super admins can read all referrals" ON public.referrals
  FOR SELECT USING (is_super_admin(auth.uid()));

-- RLS: referral_results
CREATE POLICY "Vendor admins can insert results" ON public.referral_results
  FOR INSERT WITH CHECK (is_vendor_admin(auth.uid(), vendor_id));
CREATE POLICY "Vendor admins can read own results" ON public.referral_results
  FOR SELECT USING (is_vendor_admin(auth.uid(), vendor_id));
CREATE POLICY "Vendor admins can update own results" ON public.referral_results
  FOR UPDATE USING (is_vendor_admin(auth.uid(), vendor_id));
CREATE POLICY "Referring doctors can read results" ON public.referral_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.referrals r WHERE r.id = referral_results.referral_id AND r.referring_doctor_user_id = auth.uid())
  );
CREATE POLICY "Patients can read released results" ON public.referral_results
  FOR SELECT USING (
    status = 'released' AND EXISTS (
      SELECT 1 FROM public.referrals r WHERE r.id = referral_results.referral_id AND r.patient_user_id = auth.uid()
    )
  );

-- RLS: patient_notifications
CREATE POLICY "Patients can read own notifications" ON public.patient_notifications
  FOR SELECT USING (auth.uid() = patient_user_id);
CREATE POLICY "Patients can update own notifications" ON public.patient_notifications
  FOR UPDATE USING (auth.uid() = patient_user_id);
CREATE POLICY "System can insert notifications" ON public.patient_notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_notifications;

-- Updated_at triggers
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();
CREATE TRIGGER update_vendor_staff_updated_at BEFORE UPDATE ON public.vendor_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();
