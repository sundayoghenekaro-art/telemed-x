import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeartPulse, Eye, EyeOff, ArrowLeft, Zap, ShieldCheck, Banknote, Stethoscope, MailCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TelemedXAuthScene } from '@/components/telemedx/TelemedXAuthScene';

interface PatientAuthProps {
  onLogin: (userId: string, patientName: string, accountId: string, gender: string | null) => void;
}

interface PatientProfile {
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

type AuthUser = { id: string; email?: string; user_metadata?: unknown };

// Sign-up only returns a session when email confirmation is disabled. Without one
// the profile insert runs as anon and RLS rejects it, so the draft is parked in
// user metadata and filed the first time the account signs in.
function readPatientProfile(meta: unknown, fallbackEmail: string): PatientProfile | null {
  const stored = (meta as { patient_profile?: PatientProfile } | null)?.patient_profile;
  if (!stored?.full_name) return null;
  return { ...stored, email: stored.email || fallbackEmail };
}

async function ensurePatientAccount(user: AuthUser) {
  const { data: existing } = await supabase
    .from('patient_accounts')
    .select('id, full_name, gender')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) return { account: existing, error: null };

  const profile = readPatientProfile(user.user_metadata, user.email ?? '');
  if (!profile) return { account: null, error: null };

  const { data: created, error } = await supabase
    .from('patient_accounts')
    .insert({ user_id: user.id, ...profile })
    .select('id, full_name, gender')
    .maybeSingle();
  return { account: created, error };
}

export function PatientAuth({ onLogin }: PatientAuthProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    fullName: '', phone: '', dateOfBirth: '', gender: '',
    address: '', emergencyName: '', emergencyPhone: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;

      const { account, error: accError } = await ensurePatientAccount(data.user);

      if (accError) throw accError;
      if (!account) {
        toast.error('No patient profile found for this account. Please sign up again.');
        await supabase.auth.signOut();
        return;
      }

      onLogin(data.user.id, account.full_name, account.id, account.gender || null);
    } catch (err: unknown) {
      console.error('Patient login failed:', err);
      toast.error(err instanceof Error && err.message.length < 120
        ? err.message
        : 'Could not sign in. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const profile: PatientProfile = {
      full_name: form.fullName,
      email: form.email,
      phone: form.phone || null,
      date_of_birth: form.dateOfBirth || null,
      gender: form.gender || null,
      address: form.address || null,
      emergency_contact_name: form.emergencyName || null,
      emergency_contact_phone: form.emergencyPhone || null,
    };

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.fullName, role: 'patient', patient_profile: profile } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign-up did not return an account');

      if (data.user.identities?.length === 0) {
        setLoginEmail(form.email);
        setTab('login');
        toast.error('An account with this email already exists. Sign in to continue.');
        return;
      }

      if (!data.session) {
        setAwaitingEmail(form.email);
        toast.info('Account created. Confirm your email, then sign in to finish.');
        return;
      }

      const { account, error: accError } = await ensurePatientAccount(data.user);
      if (accError) throw accError;
      if (!account) throw new Error('Account profile could not be created. Please try again.');

      toast.success('Account created successfully!');
      onLogin(data.user.id, account.full_name, account.id, account.gender || null);
    } catch (err: unknown) {
      console.error('Patient registration failed:', err);
      const message = err instanceof Error ? err.message : '';
      if (/rate limit/i.test(message)) {
        toast.error('Sign-up emails are rate limited right now. Please try again later.');
      } else if (/already registered|already exists/i.test(message)) {
        setLoginEmail(form.email);
        setTab('login');
        toast.error('An account with this email already exists. Sign in instead.');
      } else {
        toast.error(message && message.length < 120
          ? message
          : 'Could not create your account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TelemedXAuthScene
      icon={HeartPulse}
      tone="teal"
      title="Telemed-X"
      tagline="Patient portal — consultations, records and care in one place"
      trust={[
        { icon: ShieldCheck, label: 'Encrypted health records' },
        { icon: Banknote, label: 'Naira billing' },
        { icon: Stethoscope, label: 'Licensed physicians' },
      ]}
      footer={
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            className="gap-2 text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => navigate('/telemed-x')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Telemed-X
          </Button>
          <p className="text-sm text-slate-400">
            Are you a doctor?{' '}
            <button type="button" onClick={() => navigate('/telemed-x/doctor')} className="font-medium text-[#5eead4] hover:underline">Doctor portal</button>
          </p>
        </div>
      }
    >
      {awaitingEmail ? (
        <Card className="border-white/60 bg-white/85 shadow-float backdrop-blur-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MailCheck className="h-5 w-5 text-teal-600" />
              Confirm your email
            </CardTitle>
            <CardDescription>
              We sent a confirmation link to{' '}
              <span className="font-medium text-foreground">{awaitingEmail}</span>. Open it, then sign in —
              your patient profile is created automatically on first sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => {
                setLoginEmail(awaitingEmail);
                setAwaitingEmail(null);
                setTab('login');
              }}
            >
              Go to sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No email? Check your spam folder or ask your administrator to review email delivery.
            </p>
          </CardContent>
        </Card>
      ) : (
      <>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as 'login' | 'signup');
          navigate(`/telemed-x/patient${value === 'signup' ? '?mode=signup' : ''}`, { replace: true });
        }}
      >
        <TabsList className="grid w-full grid-cols-2 rounded-xl border border-white/10 bg-white/[0.07] p-1 backdrop-blur-xl">
          <TabsTrigger value="login" className="rounded-lg text-slate-300 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            Sign In
          </TabsTrigger>
          <TabsTrigger value="signup" className="rounded-lg text-slate-300 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            Create Patient Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card className="border-white/60 bg-white/85 shadow-float backdrop-blur-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your patient account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email address</Label>
                  <Input type="email" placeholder="you@example.com" className="bg-white/70"
                    value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                      value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                      required className="bg-white/70 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card className="border-white/60 bg-white/85 shadow-float backdrop-blur-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Create Patient Account</CardTitle>
              <CardDescription>Sign up to book telemedicine consultations</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Full Name *</Label>
                    <Input placeholder="Your full name" value={form.fullName} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Email Address *</Label>
                    <Input type="email" placeholder="you@example.com" value={form.email} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
                        value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required className="bg-white/70 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password *</Label>
                    <Input type="password" placeholder="Re-enter password" className="bg-white/70"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input placeholder="+234 800 000 0000" value={form.phone} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.dateOfBirth} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger className="bg-white/70"><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Address</Label>
                    <Input placeholder="Your address" value={form.address} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Name</Label>
                    <Input placeholder="Name" value={form.emergencyName} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Phone</Label>
                    <Input placeholder="Phone" value={form.emergencyPhone} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
                  </div>
                </div>
                <Alert>
                  <AlertDescription className="text-sm text-muted-foreground">
                    By creating an account you agree to receive telemedicine services from licensed physicians through this platform.
                  </AlertDescription>
                </Alert>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {import.meta.env.DEV && (
        <div className="mt-4 space-y-2 rounded-xl border border-white/12 bg-white/[0.05] p-3 text-center">
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2"
            onClick={() =>
              onLogin(
                '11111111-1111-4111-8111-111111111111',
                'Ada Nwankwo',
                '22222222-2222-4222-8222-222222222222',
                'female',
              )
            }
          >
            <Zap className="h-4 w-4" /> Enter Demo Patient Portal
          </Button>
          <p className="text-[11px] text-slate-400">Development only · mock portal data, no real account created</p>
        </div>
      )}
      </>
      )}
    </TelemedXAuthScene>
  );
}
