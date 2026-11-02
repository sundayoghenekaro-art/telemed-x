import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stethoscope, CheckCircle2, Clock, XCircle, Eye, EyeOff, ArrowLeft, ShieldCheck, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { TelemedXAuthScene } from '@/components/telemedx/TelemedXAuthScene';

const SPECIALTIES = [
  'General Practice', 'Internal Medicine', 'Cardiology', 'Neurology',
  'Orthopedics', 'Pediatrics', 'Psychiatry', 'Dermatology',
  'Oncology', 'Gynecology', 'Urology', 'Ophthalmology',
  'ENT', 'Gastroenterology', 'Pulmonology', 'Endocrinology',
  'Rheumatology', 'Nephrology', 'Hematology', 'Infectious Disease',
];

type AuthMode = 'login' | 'signup' | 'status';

interface ApplicationStatus {
  status: 'pending' | 'approved' | 'rejected';
  full_name: string;
  rejection_reason?: string;
  awaitingEmailConfirmation?: boolean;
}

interface ApplicationPayload {
  full_name: string;
  email: string;
  phone: string | null;
  specialty: string;
  license_number: string;
  license_state: string;
  institution: string | null;
  years_experience: number | null;
  bio: string | null;
}

// Applications are kept in the auth user's metadata until a session exists.
// Signup only returns a session when email confirmation is disabled, and the
// external_doctors insert requires an authenticated caller.
function readApplicationMeta(meta: unknown, fallbackEmail: string): ApplicationPayload | null {
  const application = (meta as { application?: Partial<ApplicationPayload> } | null)?.application;
  if (
    !application?.full_name ||
    !application.specialty ||
    !application.license_number ||
    !application.license_state
  ) {
    return null;
  }
  return {
    full_name: application.full_name,
    email: application.email || fallbackEmail,
    phone: application.phone ?? null,
    specialty: application.specialty,
    license_number: application.license_number,
    license_state: application.license_state,
    institution: application.institution ?? null,
    years_experience: typeof application.years_experience === 'number' ? application.years_experience : null,
    bio: application.bio ?? null,
  };
}

interface ExternalDoctorAuthProps {
  onApprovedLogin: (userId: string, doctorName: string) => void;
}

export function ExternalDoctorAuth({ onApprovedLogin }: ExternalDoctorAuthProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [appStatus, setAppStatus] = useState<ApplicationStatus | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    fullName: '', phone: '', specialty: '',
    licenseNumber: '', licenseState: '', institution: '',
    yearsExperience: '', bio: '',
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

      const { data: doctorData } = await supabase
        .from('external_doctors')
        .select('status, full_name, rejection_reason')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!doctorData) {
        // The application may still be sitting in user metadata: signup cannot
        // write the row when email confirmation delays the session.
        const pendingApplication = readApplicationMeta(
          data.user.user_metadata,
          data.user.email ?? loginEmail,
        );
        if (pendingApplication) {
          const { error: insertError } = await supabase
            .from('external_doctors')
            .insert({ ...pendingApplication, user_id: data.user.id, status: 'pending' });
          if (!insertError) {
            setAppStatus({ status: 'pending', full_name: pendingApplication.full_name });
            setMode('status');
            await supabase.auth.signOut();
            return;
          }
          console.error('Doctor application insert failed on sign-in:', insertError);
        }
        toast.error('No practitioner application found for this account.');
        await supabase.auth.signOut();
        return;
      }

      if (doctorData.status === 'pending' || doctorData.status === 'rejected') {
        setAppStatus(doctorData as ApplicationStatus);
        setMode('status');
        await supabase.auth.signOut();
        return;
      }

      // Approved
      onApprovedLogin(data.user.id, doctorData.full_name);
    } catch (err: unknown) {
      console.error('Doctor login failed:', err);
      toast.error('Could not sign in. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.specialty) {
      toast.error('Select your specialty');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const application: ApplicationPayload = {
      full_name: form.fullName,
      email: form.email,
      phone: form.phone || null,
      specialty: form.specialty,
      license_number: form.licenseNumber,
      license_state: form.licenseState,
      institution: form.institution || null,
      years_experience: form.yearsExperience ? parseInt(form.yearsExperience) : null,
      bio: form.bio || null,
    };

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.fullName, role: 'external_doctor', application } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Signup failed — please try again.');

      // Supabase returns an empty identity list when the email is already taken.
      if (data.user.identities?.length === 0) {
        setLoginEmail(form.email);
        setMode('login');
        toast.error('An account with this email already exists. Sign in to check its status.');
        return;
      }

      // Email confirmation pending: no session yet, so the application is held
      // in metadata and written on first sign-in.
      if (!data.session) {
        setLoginEmail(form.email);
        setAppStatus({ status: 'pending', full_name: form.fullName, awaitingEmailConfirmation: true });
        setMode('status');
        toast.success('Application saved. Confirm your email, then sign in to submit it.');
        return;
      }

      const { error: profileError } = await supabase.from('external_doctors').insert({
        ...application,
        user_id: data.user.id,
        status: 'pending',
      });

      await supabase.auth.signOut();

      if (profileError) {
        console.error('Doctor profile insert failed:', profileError);
        setLoginEmail(form.email);
        setAppStatus({ status: 'pending', full_name: form.fullName, awaitingEmailConfirmation: true });
        setMode('status');
        toast.error('We could not file your application yet. Confirm your email and sign in to finish.');
        return;
      }

      setAppStatus({ status: 'pending', full_name: form.fullName });
      setMode('status');
      toast.success('Application submitted! You will be notified once reviewed.');
    } catch (err: unknown) {
      console.error('Doctor registration failed:', err);
      const message = err instanceof Error ? err.message : '';
      if (/already registered|already been registered/i.test(message)) {
        setLoginEmail(form.email);
        setMode('login');
        toast.error('An account with this email already exists. Sign in to check its status.');
      } else {
        toast.error(message && message.length < 120 ? message : 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'status' && appStatus) {
    return (
      <TelemedXAuthScene
        icon={Stethoscope}
        tone="sky"
        width="max-w-lg"
        title="Telemed-X"
        tagline="Doctor portal — application review"
        trust={[
          { icon: ShieldCheck, label: 'Verified practitioners only' },
          { icon: Clock, label: 'Reviewed in 1–2 business days' },
        ]}
      >
        <StatusCard status={appStatus} onBack={() => setMode('login')} />
      </TelemedXAuthScene>
    );
  }

  return (
    <TelemedXAuthScene
      icon={Stethoscope}
      tone="sky"
      width="max-w-2xl"
      title="Telemed-X"
      tagline="Doctor portal — consult patients remotely"
      trust={[
        { icon: ShieldCheck, label: 'Credential review' },
        { icon: Banknote, label: 'Naira payouts' },
        { icon: Clock, label: 'Flexible sessions' },
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
            Are you a patient?{' '}
            <button type="button" onClick={() => navigate('/telemed-x/patient?mode=signup')} className="font-medium text-[#5eead4] hover:underline">Create a patient account</button>
          </p>
        </div>
      }
    >
      <Tabs value={mode === 'login' ? 'login' : 'signup'} onValueChange={(v) => setMode(v as AuthMode)}>
        <TabsList className="grid w-full grid-cols-2 rounded-xl border border-white/10 bg-white/[0.07] p-1 backdrop-blur-xl">
          <TabsTrigger value="login" className="rounded-lg text-slate-300 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            Sign In
          </TabsTrigger>
          <TabsTrigger value="signup" className="rounded-lg text-slate-300 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            Join as Practitioner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card className="border-white/60 bg-white/85 shadow-float backdrop-blur-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your approved doctor account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email address</Label>
                  <Input id="login-email" type="email" placeholder="doctor@example.com" className="bg-white/70"
                    value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input id="login-password" type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••" value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)} required className="bg-white/70 pr-10" />
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
              <CardTitle className="text-xl">Join Telemed-X as a Practitioner</CardTitle>
              <CardDescription>Offer virtual care to patients through a reviewed professional profile</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Full Name *</Label>
                    <Input placeholder="Dr. Jane Smith" value={form.fullName} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Email Address *</Label>
                    <Input type="email" placeholder="doctor@clinic.com" value={form.email} className="bg-white/70"
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
                    <Label>Phone Number</Label>
                    <Input placeholder="+234 800 000 0000" value={form.phone} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialty *</Label>
                    <Select value={form.specialty} onValueChange={(v) => setForm({ ...form, specialty: v })}>
                      <SelectTrigger className="bg-white/70"><SelectValue placeholder="Select specialty" /></SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Medical License Number *</Label>
                    <Input placeholder="MD-12345" value={form.licenseNumber} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>License State/Country *</Label>
                    <Input placeholder="e.g. Lagos, Nigeria" value={form.licenseState} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, licenseState: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Institution</Label>
                    <Input placeholder="Hospital / Clinic name" value={form.institution} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, institution: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input type="number" min="0" max="60" placeholder="e.g. 10" value={form.yearsExperience} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Brief Bio / Statement</Label>
                    <Textarea placeholder="Describe your experience and why you'd like to provide telemedicine consultations..."
                      rows={3} value={form.bio} className="bg-white/70"
                      onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                  </div>
                </div>
                <Alert>
                  <AlertDescription className="text-sm text-muted-foreground">
                    Your application will be reviewed by a hospital administrator before you can start consulting. This typically takes 1–2 business days.
                  </AlertDescription>
                </Alert>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Submitting application...' : 'Submit Application'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TelemedXAuthScene>
  );
}

function StatusCard({ status, onBack }: { status: ApplicationStatus; onBack: () => void }) {
  return (
    <Card className="border-white/60 bg-white/85 text-center shadow-float backdrop-blur-2xl">
      <CardContent className="pt-10 pb-8 space-y-4">
        {status.status === 'pending' && (
          status.awaitingEmailConfirmation ? (
            <>
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-info/10">
                  <Clock className="h-12 w-12 text-info" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Confirm your email</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Thanks, <strong>{status.full_name}</strong>! Your application is saved. Open the confirmation link we
                sent to your inbox, then sign in to submit it for review.
              </p>
              <Badge variant="outline">Awaiting email confirmation</Badge>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-muted">
                  <Clock className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Application Under Review</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Thank you, <strong>{status.full_name}</strong>! Your application has been submitted and is pending review by our administrator.
              </p>
              <Badge variant="outline">Pending Review</Badge>
            </>
          )
        )}
        {status.status === 'rejected' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-destructive/10">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <h2 className="text-xl font-bold">Application Not Approved</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              We're sorry, your application was not approved at this time.
            </p>
            {status.rejection_reason && (
              <Alert className="text-left">
                <AlertDescription className="text-sm">
                  <strong>Reason:</strong> {status.rejection_reason}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
        {status.status === 'approved' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary/10">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-bold">Application Approved!</h2>
            <p className="text-muted-foreground">
              Welcome, <strong>{status.full_name}</strong>! Your account is now active.
            </p>
          </>
        )}
        <Button variant="outline" onClick={onBack} className="mt-4">Back to Sign In</Button>
      </CardContent>
    </Card>
  );
}
