import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Zap, Plus, X, Loader2, CheckCircle, Eye, EyeOff, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { TelemedXShell } from '@/components/telemedx/TelemedXShell';

const COMMON_SPECIALTIES = [
  'Cardiology', 'Dermatology', 'Emergency Medicine', 'Endocrinology',
  'Gastroenterology', 'General Surgery', 'Internal Medicine', 'Neurology',
  'Obstetrics & Gynecology', 'Oncology', 'Ophthalmology', 'Orthopedics',
  'Pediatrics', 'Psychiatry', 'Pulmonology', 'Radiology', 'Urology',
];

const COMMON_INSURANCES = [
  'Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Humana', 'Kaiser Permanente',
  'Medicare', 'Medicaid', 'UnitedHealthcare', 'Tricare',
];

const COMMON_LANGUAGES = [
  'English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French',
  'Spanish', 'Portuguese', 'Arabic', 'Mandarin',
];

export function HospitalOnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<'login' | 'signup'>('signup');
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id ?? null);
      if (session?.user.email) setAuthForm((current) => ({ ...current, email: session.user.email ?? '' }));
      setCheckingSession(false);
    });
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });
      if (error) throw error;
      setUserId(data.user.id);
      toast.success('Signed in. Complete your hospital application below.');
    } catch (err: unknown) {
      console.error('Hospital applicant sign-in failed:', err);
      toast.error('Could not sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: {
          data: { name: authForm.fullName || authForm.email.split('@')[0], role: 'hospital_admin' },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign-up did not return an account');

      if (data.user.identities?.length === 0) {
        setLoginForm({ ...loginForm, email: authForm.email });
        setTab('login');
        toast.error('An account with this email already exists. Sign in instead.');
        return;
      }

      if (!data.session) {
        setAwaitingEmail(authForm.email);
        toast.info('Account created. Confirm your email, then sign in to apply.');
        return;
      }

      setUserId(data.user.id);
      toast.success('Account created. Complete your hospital application below.');
    } catch (err: unknown) {
      console.error('Hospital applicant registration failed:', err);
      const message = err instanceof Error ? err.message : '';
      if (/rate limit/i.test(message)) {
        toast.error('Sign-up emails are rate limited right now. Please try again later.');
      } else if (/already registered|already exists/i.test(message)) {
        setLoginForm({ ...loginForm, email: authForm.email });
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

  const [form, setForm] = useState({
    name: '', slug: '', address: '', city: '', state: '', zipCode: '', country: 'US',
    phone: '', email: '', website: '', description: '',
  });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [insurances, setInsurances] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [customInsurance, setCustomInsurance] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        toast.error('Your session expired. Sign in again to submit.');
        return;
      }

      const slug = form.slug || generateSlug(form.name);

      const { data: hospital, error } = await supabase
        .from('hospitals')
        .insert({
          name: form.name,
          slug,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip_code: form.zipCode || null,
          country: form.country,
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
          description: form.description || null,
          accredited_specialties: specialties,
          accepted_insurance: insurances,
          supported_languages: languages,
          status: 'pending',
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      // Auto-add submitter as hospital admin
      const { error: adminError } = await supabase.from('hospital_admins').insert({
        hospital_id: hospital.id,
        user_id: user.id,
        role: 'admin',
      } as any);
      if (adminError) throw adminError;

      setSubmitted(true);
      toast.success('Hospital application submitted for review!');
    } catch (err: any) {
      console.error('Hospital application submit failed:', err);
      const message = err?.message ?? '';
      toast.error(message && message.length < 120
        ? message
        : 'Could not submit your application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <TelemedXShell portal="Hospital onboarding" icon={Building2} subtitle="Apply to join the Telemed-X network" accent="teal" maxWidth="max-w-3xl">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="glass-panel animate-rise w-full max-w-md text-center">
            <CardContent className="space-y-4 pb-8 pt-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold">Application Submitted!</h2>
              <p className="text-sm text-muted-foreground">
                Your hospital onboarding application has been submitted for review by our platform administrators.
                You'll be notified once it's been verified.
              </p>
              <Button variant="outline" onClick={() => navigate('/telemed-x')} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Telemed-X
              </Button>
            </CardContent>
          </Card>
        </div>
      </TelemedXShell>
    );
  }

  if (checkingSession) {
    return (
      <TelemedXShell portal="Hospital onboarding" icon={Building2} accent="teal" maxWidth="max-w-3xl">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </TelemedXShell>
    );
  }

  if (!userId) {
    return (
      <TelemedXShell portal="Hospital onboarding" icon={Building2} subtitle="Apply to join the Telemed-X network" accent="teal" maxWidth="max-w-3xl">
        <div className="mx-auto w-full max-w-md animate-rise">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Create your applicant account</CardTitle>
              <CardDescription>
                Sign in or create an account to submit your hospital application and manage it later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {awaitingEmail ? (
                <div className="space-y-3 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <MailCheck className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We sent a confirmation link to{' '}
                    <span className="font-medium text-foreground">{awaitingEmail}</span>. Open it, then
                    sign in to complete your application.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setLoginForm({ ...loginForm, email: awaitingEmail });
                      setAwaitingEmail(null);
                      setTab('login');
                    }}
                  >
                    Go to sign in
                  </Button>
                </div>
              ) : (
                <Tabs value={tab} onValueChange={(value) => setTab(value as 'login' | 'signup')}>
                  <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="signup">Create Account</TabsTrigger>
                    <TabsTrigger value="login">Sign In</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          placeholder="Your full name"
                          value={authForm.fullName}
                          onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Work Email *</Label>
                        <Input
                          type="email"
                          placeholder="admin@hospital.org"
                          value={authForm.email}
                          onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Password *</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min. 8 characters"
                            value={authForm.password}
                            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                            required
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account…</> : 'Create Account & Continue'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="login">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="admin@hospital.org"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            required
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</> : 'Sign In & Continue'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Button variant="ghost" className="w-full" onClick={() => navigate('/telemed-x')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Telemed-X
          </Button>
        </div>
      </TelemedXShell>
    );
  }

  return (
    <TelemedXShell portal="Hospital onboarding" icon={Building2} subtitle="Apply to join the Telemed-X network" accent="teal" maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="animate-rise">
          {/* Basic Info */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Hospital Information</CardTitle>
              <CardDescription>Provide your institution's details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Hospital Name *</Label>
                  <Input placeholder="e.g. City General Hospital" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>URL Slug</Label>
                  <Input placeholder="city-general-hospital" value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Used in URLs: /hospitals/{form.slug || 'your-hospital'}</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address</Label>
                  <Input placeholder="Street address" value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input placeholder="City" value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input placeholder="State" value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input placeholder="ZIP" value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input placeholder="US" value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="+1 234 567 8900" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="admin@hospital.org" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Website</Label>
                  <Input placeholder="https://www.hospital.org" value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Accredited Specialties</CardTitle>
              <CardDescription>Select the departments and specialties your hospital offers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {COMMON_SPECIALTIES.map((s) => (
                  <Badge key={s} variant={specialties.includes(s) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSpecialties(prev =>
                      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                    )}>
                    {s}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add custom specialty" value={customSpecialty}
                  onChange={(e) => setCustomSpecialty(e.target.value)} className="flex-1" />
                <Button type="button" variant="outline" size="icon"
                  onClick={() => {
                    if (customSpecialty.trim() && !specialties.includes(customSpecialty.trim())) {
                      setSpecialties(prev => [...prev, customSpecialty.trim()]);
                      setCustomSpecialty('');
                    }
                  }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {specialties.filter(s => !COMMON_SPECIALTIES.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {specialties.filter(s => !COMMON_SPECIALTIES.includes(s)).map(s => (
                    <Badge key={s} className="gap-1">
                      {s}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSpecialties(prev => prev.filter(x => x !== s))} />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insurance */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Accepted Insurance Providers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {COMMON_INSURANCES.map((i) => (
                  <Badge key={i} variant={insurances.includes(i) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setInsurances(prev =>
                      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                    )}>
                    {i}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add custom insurance provider" value={customInsurance}
                  onChange={(e) => setCustomInsurance(e.target.value)} className="flex-1" />
                <Button type="button" variant="outline" size="icon"
                  onClick={() => {
                    if (customInsurance.trim() && !insurances.includes(customInsurance.trim())) {
                      setInsurances(prev => [...prev, customInsurance.trim()]);
                      setCustomInsurance('');
                    }
                  }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Consultation Languages */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Consultation Languages</CardTitle>
              <CardDescription>Select the languages your medical staff can consult in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {COMMON_LANGUAGES.map((l) => (
                  <Badge key={l} variant={languages.includes(l) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setLanguages(prev =>
                      prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]
                    )}>
                    {l}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add another language" value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)} className="flex-1" />
                <Button type="button" variant="outline" size="icon"
                  onClick={() => {
                    if (customLanguage.trim() && !languages.includes(customLanguage.trim())) {
                      setLanguages(prev => [...prev, customLanguage.trim()]);
                      setCustomLanguage('');
                    }
                  }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {languages.filter(l => !COMMON_LANGUAGES.includes(l)).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {languages.filter(l => !COMMON_LANGUAGES.includes(l)).map(l => (
                    <Badge key={l} className="gap-1">
                      {l}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setLanguages(prev => prev.filter(x => x !== l))} />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Tell us about your hospital, its mission, and services..."
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4} />
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} className="w-full py-6 text-base font-semibold rounded-xl"
            style={{ background: 'var(--gradient-telemedx)' }}>
            {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Building2 className="h-5 w-5 mr-2" />}
            Submit Application for Review
          </Button>
        </form>
    </TelemedXShell>
  );
}
