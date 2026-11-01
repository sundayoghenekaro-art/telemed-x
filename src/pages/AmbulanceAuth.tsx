import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ambulance, Eye, EyeOff, ArrowLeft, Loader2, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export function AmbulanceAuth({ onLogin }: { onLogin: (userId: string, account: any) => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    phone: '', role: 'paramedic', organizationName: '',
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
        .from('ambulance_accounts')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (accError || !account) {
        toast.error('No ambulance crew account found. Please sign up first.');
        await supabase.auth.signOut();
        return;
      }
      if (account.status !== 'active') {
        toast.error('Your ambulance account is suspended. Contact your dispatcher.');
        await supabase.auth.signOut();
        return;
      }

      onLogin(data.user.id, account);
    } catch {
      toast.error('Could not sign in. Please check your credentials.');
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
        options: { data: { name: form.fullName, role: 'ambulance_crew' } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Signup failed');

      const { error: accError } = await supabase
        .from('ambulance_accounts')
        .insert({
          user_id: data.user.id,
          full_name: form.fullName,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          organization_name: form.organizationName || null,
          status: 'active',
        });
      if (accError) throw accError;

      toast.success('Ambulance account created! You are now on duty.');
      onLogin(data.user.id, { full_name: form.fullName, role: form.role });
    } catch (err: any) {
      toast.error(err.message || 'Could not create your ambulance account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, hsl(222 47% 11%), hsl(220 60% 25%), hsl(0 72% 45%))' }}>
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur">
            <Ambulance className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Telemed-X Ambulance</h1>
            <p className="text-sm text-white/60">Emergency Response &amp; Virtual Care Network</p>
          </div>
        </div>

        <Tabs defaultValue={searchParams.get('mode') === 'signup' ? 'signup' : 'login'}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Join Ambulance Crew</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>Sign in to the ambulance dispatch console</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <Input type="email" placeholder="you@ambulance.ng"
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
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</> : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card className="border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Join Ambulance Crew</CardTitle>
                <CardDescription>Register as an emergency response crew member</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Full Name *</Label>
                      <Input placeholder="Your full name" value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" placeholder="you@ambulance.ng" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input placeholder="+234 800 000 0000" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paramedic">Paramedic</SelectItem>
                          <SelectItem value="dispatcher">Dispatcher</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Organization</Label>
                      <Input placeholder="Ambulance service name" value={form.organizationName}
                        onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
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
                  </div>
                  <Alert>
                    <AlertDescription className="text-sm text-muted-foreground">
                      By joining you agree to respond to emergency dispatch requests through the Telemed-X network.
                    </AlertDescription>
                  </Alert>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account…</> : 'Create Ambulance Account'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col items-center gap-2">
          <Button variant="ghost" className="gap-2 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => navigate('/telemed-x')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Telemed-X
          </Button>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Emergency Dispatch</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Nearest Facility Routing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
