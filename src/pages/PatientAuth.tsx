import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Eye, EyeOff, ArrowLeft, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface PatientAuthProps {
  onLogin: (userId: string, patientName: string, accountId: string, gender: string | null) => void;
}

export function PatientAuth({ onLogin }: PatientAuthProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

      const { data: account, error: accError } = await supabase
        .from('patient_accounts')
        .select('id, full_name, gender')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (accError || !account) {
        toast.error('No patient account found. Please sign up first.');
        await supabase.auth.signOut();
        return;
      }

      onLogin(data.user.id, account.full_name, account.id, account.gender || null);
    } catch (err: unknown) {
      console.error('Patient login failed:', err);
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
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.fullName, role: 'patient' } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Signup failed');

      const { data: account, error: accError } = await supabase
        .from('patient_accounts')
        .insert({
          user_id: data.user.id,
          full_name: form.fullName,
          email: form.email,
          phone: form.phone || null,
          date_of_birth: form.dateOfBirth || null,
          gender: form.gender || null,
          address: form.address || null,
          emergency_contact_name: form.emergencyName || null,
          emergency_contact_phone: form.emergencyPhone || null,
        })
        .select('id, full_name, gender')
        .maybeSingle();

      if (accError) throw accError;
      if (!account) throw new Error('Account profile could not be created. Please try again.');
      toast.success('Account created successfully!');
      onLogin(data.user.id, account.full_name, account.id, account.gender || null);
    } catch (err: unknown) {
      console.error('Patient registration failed:', err);
      toast.error('Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-telemedx-hero)' }}>
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl" style={{ background: 'var(--gradient-telemedx)' }}>
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Telemed-X</h1>
            <p className="text-sm text-white/60">Patient Portal</p>
          </div>
        </div>

        <Tabs
          defaultValue={searchParams.get('mode') === 'signup' ? 'signup' : 'login'}
          onValueChange={(value) => navigate(`/telemed-x/patient${value === 'signup' ? '?mode=signup' : ''}`, { replace: true })}
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Create Patient Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>Sign in to your patient account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <Input type="email" placeholder="you@example.com"
                      value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                        value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                        required className="pr-10" />
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
                <CardTitle className="text-xl">Create Patient Account</CardTitle>
                <CardDescription>Sign up to book telemedicine consultations</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Full Name *</Label>
                      <Input placeholder="Your full name" value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Email Address *</Label>
                      <Input type="email" placeholder="you@example.com" value={form.email}
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
                      <Label>Phone</Label>
                      <Input placeholder="+1 234 567 8900" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Address</Label>
                      <Input placeholder="Your address" value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency Contact Name</Label>
                      <Input placeholder="Name" value={form.emergencyName}
                        onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency Contact Phone</Label>
                      <Input placeholder="Phone" value={form.emergencyPhone}
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
          <div className="space-y-2 rounded-xl border border-white/15 bg-white/5 p-3 text-center">
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
            <p className="text-[11px] text-white/50">Development only · mock portal data, no real account created</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            className="gap-2 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => navigate('/telemed-x')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Telemed-X
          </Button>
          <p className="text-sm text-white/50">
            Are you a doctor?{' '}
            <button type="button" onClick={() => navigate('/telemed-x/doctor')} className="text-white/80 hover:underline font-medium">Doctor portal</button>
          </p>
        </div>
      </div>
    </div>
  );
}
