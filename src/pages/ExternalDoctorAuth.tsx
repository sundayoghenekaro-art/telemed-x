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
import { Stethoscope, CheckCircle2, Clock, XCircle, Eye, EyeOff, ArrowLeft, Zap } from 'lucide-react';
import { toast } from 'sonner';

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
        toast.error('No external doctor profile found for this account.');
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
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    let signedUpUserId: string | null = null;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.fullName, role: 'external_doctor' } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Signup failed — please try again.');

      signedUpUserId = data.user.id;

      const { error: profileError } = await supabase.from('external_doctors').insert({
        user_id: data.user.id,
        full_name: form.fullName,
        email: form.email,
        phone: form.phone || null,
        specialty: form.specialty,
        license_number: form.licenseNumber,
        license_state: form.licenseState,
        institution: form.institution || null,
        years_experience: form.yearsExperience ? parseInt(form.yearsExperience) : null,
        bio: form.bio || null,
        status: 'pending',
      });

      if (profileError) {
        // Insert failed — sign out the orphan auth account and surface the error
        await supabase.auth.signOut();
        console.error('Doctor profile insert failed:', profileError);
        throw new Error('We could not complete your application. Please try again.');
      }

      // Insert succeeded — now safe to sign out
      await supabase.auth.signOut();
      setAppStatus({ status: 'pending', full_name: form.fullName });
      setMode('status');
      toast.success('Application submitted! You will be notified once reviewed.');
    } catch (err: unknown) {
      // If signup created an auth user but insert failed and we haven't signed out yet, do so
      if (signedUpUserId) {
        await supabase.auth.signOut().catch(() => {});
      }
      console.error('Doctor registration failed:', err);
      toast.error(err instanceof Error && err.message.startsWith('We could not') ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'status' && appStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-telemedx-hero)' }}>
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center flex flex-col items-center gap-3">
            <div className="p-3 rounded-2xl" style={{ background: 'var(--gradient-telemedx)' }}>
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Telemed-X</h1>
              <p className="text-sm text-white/60">Doctor Portal</p>
            </div>
          </div>
          <StatusCard status={appStatus} onBack={() => setMode('login')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-telemedx-hero)' }}>
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl" style={{ background: 'var(--gradient-telemedx)' }}>
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Telemed-X</h1>
            <p className="text-sm text-white/60">Doctor Portal</p>
          </div>
        </div>

        <Tabs value={mode === 'login' ? 'login' : 'signup'} onValueChange={(v) => setMode(v as AuthMode)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Join as Practitioner</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>Sign in to your approved doctor account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email address</Label>
                    <Input id="login-email" type="email" placeholder="doctor@example.com"
                      value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input id="login-password" type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••" value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)} required className="pr-10" />
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
            <Card className="border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Join Telemed-X as a Practitioner</CardTitle>
                <CardDescription>Offer virtual care to patients through a reviewed professional profile</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Full Name *</Label>
                      <Input placeholder="Dr. Jane Smith" value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Email Address *</Label>
                      <Input type="email" placeholder="doctor@clinic.com" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
                          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                          required className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password *</Label>
                      <Input type="password" placeholder="Re-enter password"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input placeholder="+1 234 567 8900" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Specialty *</Label>
                      <Select value={form.specialty} onValueChange={(v) => setForm({ ...form, specialty: v })}>
                        <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                        <SelectContent>
                          {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Medical License Number *</Label>
                      <Input placeholder="MD-12345" value={form.licenseNumber}
                        onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>License State/Country *</Label>
                      <Input placeholder="e.g. California, UK" value={form.licenseState}
                        onChange={(e) => setForm({ ...form, licenseState: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Institution</Label>
                      <Input placeholder="Hospital / Clinic name" value={form.institution}
                        onChange={(e) => setForm({ ...form, institution: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Years of Experience</Label>
                      <Input type="number" min="0" max="60" placeholder="e.g. 10" value={form.yearsExperience}
                        onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Brief Bio / Statement</Label>
                      <Textarea placeholder="Describe your experience and why you'd like to provide telemedicine consultations..."
                        rows={3} value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                    </div>
                  </div>
                  <Alert>
                    <AlertDescription className="text-sm text-muted-foreground">
                      Your application will be reviewed by a hospital administrator before you can start consulting. This typically takes 1–2 business days.
                    </AlertDescription>
                  </Alert>
                  <Button type="submit" className="w-full" disabled={loading || !form.specialty}>
                    {loading ? 'Submitting application...' : 'Submit Application'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            className="gap-2 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => navigate('/telemed-x')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Telemed-X
          </Button>
          <p className="text-sm text-white/50">
            Are you a patient?{' '}
            <button type="button" onClick={() => navigate('/telemed-x/patient?mode=signup')} className="text-white/80 hover:underline font-medium">Create a patient account</button>
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ status, onBack }: { status: ApplicationStatus; onBack: () => void }) {
  return (
    <Card className="border-border/50 shadow-xl text-center">
      <CardContent className="pt-10 pb-8 space-y-4">
        {status.status === 'pending' && (
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
