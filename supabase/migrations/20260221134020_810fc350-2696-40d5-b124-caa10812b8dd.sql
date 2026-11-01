
-- Hospitals table
CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'US',
  phone text,
  email text,
  website text,
  logo_url text,
  description text,
  accredited_specialties text[] DEFAULT '{}',
  accepted_insurance text[] DEFAULT '{}',
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'pending', -- pending, verified, suspended
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Hospital admins (users who manage a hospital on the platform)
CREATE TABLE public.hospital_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin', -- admin, manager
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, user_id)
);

ALTER TABLE public.hospital_admins ENABLE ROW LEVEL SECURITY;

-- Doctor-hospital affiliations
CREATE TABLE public.hospital_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  doctor_user_id uuid NOT NULL,
  doctor_name text NOT NULL,
  specialty text,
  license_number text,
  status text NOT NULL DEFAULT 'pending', -- pending, active, suspended
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, doctor_user_id)
);

ALTER TABLE public.hospital_doctors ENABLE ROW LEVEL SECURITY;

-- Helper function: is user a hospital admin?
CREATE OR REPLACE FUNCTION public.is_hospital_admin(_user_id uuid, _hospital_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_admins
    WHERE user_id = _user_id AND hospital_id = _hospital_id
  )
$$;

-- Helper: is user a super admin?
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- RLS: hospitals
-- Anyone authenticated can read verified hospitals (public profiles)
CREATE POLICY "Anyone can read verified hospitals"
  ON public.hospitals FOR SELECT
  USING (status = 'verified');

-- Super admins can read all hospitals
CREATE POLICY "Super admins can read all hospitals"
  ON public.hospitals FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Hospital admins can read own hospital
CREATE POLICY "Hospital admins can read own hospital"
  ON public.hospitals FOR SELECT
  USING (is_hospital_admin(auth.uid(), id));

-- Super admins can insert hospitals
CREATE POLICY "Super admins can insert hospitals"
  ON public.hospitals FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

-- Authenticated users can apply (insert pending hospitals)
CREATE POLICY "Users can apply for hospital onboarding"
  ON public.hospitals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND status = 'pending');

-- Super admins can update any hospital
CREATE POLICY "Super admins can update hospitals"
  ON public.hospitals FOR UPDATE
  USING (is_super_admin(auth.uid()));

-- Hospital admins can update own hospital (non-status fields)
CREATE POLICY "Hospital admins can update own hospital"
  ON public.hospitals FOR UPDATE
  USING (is_hospital_admin(auth.uid(), id));

-- RLS: hospital_admins
CREATE POLICY "Super admins can manage hospital admins"
  ON public.hospital_admins FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Hospital admins can read own hospital admins"
  ON public.hospital_admins FOR SELECT
  USING (is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Applicants can insert themselves as admin"
  ON public.hospital_admins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS: hospital_doctors
CREATE POLICY "Super admins can manage hospital doctors"
  ON public.hospital_doctors FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Hospital admins can manage own doctors"
  ON public.hospital_doctors FOR ALL
  USING (is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Doctors can read own affiliations"
  ON public.hospital_doctors FOR SELECT
  USING (auth.uid() = doctor_user_id);

CREATE POLICY "Anyone can read active doctors of verified hospitals"
  ON public.hospital_doctors FOR SELECT
  USING (
    status = 'active' AND EXISTS (
      SELECT 1 FROM public.hospitals h
      WHERE h.id = hospital_id AND h.status = 'verified'
    )
  );

-- Realtime for hospitals
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospitals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_doctors;

-- Updated_at triggers
CREATE TRIGGER update_hospitals_updated_at
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.update_telemedicine_updated_at();

CREATE TRIGGER update_hospital_doctors_updated_at
  BEFORE UPDATE ON public.hospital_doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_telemedicine_updated_at();
