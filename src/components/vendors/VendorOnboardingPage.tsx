import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2, Plus, Loader2, CheckCircle, TestTube, Pill, Scan, Eye, EyeOff, Zap } from 'lucide-react';
import { toast } from 'sonner';

const VENDOR_TYPES = [
  { value: 'lab', label: 'Diagnostic Laboratory', icon: TestTube },
  { value: 'pharmacy', label: 'Pharmacy', icon: Pill },
  { value: 'radiology', label: 'Radiology / Imaging Center', icon: Scan },
] as const;

const LAB_SERVICES = ['CBC', 'Metabolic Panel', 'Lipid Panel', 'Urinalysis', 'Blood Culture', 'Thyroid Panel', 'Coagulation Studies', 'HIV/STI Testing', 'Genetic Testing', 'Microbiology'];
const PHARMACY_SERVICES = ['Prescription Dispensing', 'Compounding', 'Immunizations', 'Medication Therapy Management', 'Home Delivery', 'Controlled Substances', 'OTC', 'Specialty Pharmacy'];
const RADIOLOGY_SERVICES = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography', 'PET Scan', 'Nuclear Medicine', 'Fluoroscopy', 'Interventional Radiology'];
const COMMON_INSURANCES = ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Humana', 'Kaiser Permanente', 'Medicare', 'Medicaid', 'UnitedHealthcare', 'Tricare'];

export function VendorOnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [vendorType, setVendorType] = useState<string>('');
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: '', slug: '', address: '', city: '', state: '', zipCode: '', country: 'US',
    phone: '', email: '', website: '', description: '',
  });
  const [services, setServices] = useState<string[]>([]);
  const [insurances, setInsurances] = useState<string[]>([]);
  const [customService, setCustomService] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuthed(true);
      setCheckingSession(false);
    });
  }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const serviceOptions = vendorType === 'lab' ? LAB_SERVICES : vendorType === 'pharmacy' ? PHARMACY_SERVICES : vendorType === 'radiology' ? RADIOLOGY_SERVICES : [];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) throw error;
      setAuthed(true);
      toast.success('Signed in successfully');
    } catch (err: any) {
      console.error('Vendor sign in failed:', err);
      toast.error('Could not sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: { data: { name: authName || authEmail.split('@')[0], role: 'vendor_admin' } },
      });
      if (error) throw error;
      if (data.user && !data.session) {
        toast.info('Account created. Please check your email to confirm, then sign in.');
      } else if (data.session) {
        setAuthed(true);
        toast.success('Account created');
      }
    } catch (err: any) {
      console.error('Vendor sign up failed:', err);
      toast.error('Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorType) { toast.error('Please select a vendor type'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Your session has expired. Please sign in again.');
        setAuthed(false);
        return;
      }

      const slug = form.slug || generateSlug(form.name);
      const { data: vendor, error } = await supabase
        .from('vendors' as any)
        .insert({
          name: form.name, slug, type: vendorType,
          address: form.address || null, city: form.city || null, state: form.state || null,
          zip_code: form.zipCode || null, country: form.country,
          phone: form.phone || null, email: form.email || null, website: form.website || null,
          description: form.description || null,
          services, accepted_insurance: insurances, status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw error;

      await supabase.from('vendor_admins' as any).insert({
        vendor_id: (vendor as any).id, user_id: user.id, role: 'admin',
      });

      setSubmitted(true);
      toast.success('Vendor application submitted!');
    } catch (err: any) {
      console.error('Vendor application submit failed:', err);
      toast.error('Could not submit your application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-telemedx-hero)' }}>
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold">Application Submitted!</h2>
            <p className="text-sm text-muted-foreground">Your vendor application is under review. You'll be notified once verified.</p>
            <Button variant="outline" onClick={() => navigate('/telemed-x')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Telemed-X
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-telemedx-hero)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--gradient-telemedx-hero)' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => navigate('/telemed-x')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-telemedx)' }}>
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Facility Onboarding</h1>
              <p className="text-xs text-white/50">Register your lab, pharmacy, or imaging center</p>
            </div>
          </div>
        </div>

        {!authed && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 p-3 rounded-2xl" style={{ background: 'var(--gradient-telemedx)' }}>
                <Zap className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">Create Your Account</CardTitle>
              <CardDescription>Sign in or create an account to register your facility on Telemed-X</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signup">
                <TabsList className="grid grid-cols-2 w-full mb-4">
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                </TabsList>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Contact Person Name</Label>
                      <Input placeholder="John Smith" value={authName}
                        onChange={(e) => setAuthName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input type="email" placeholder="admin@citylab.com" value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
                          value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="login">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input type="email" placeholder="admin@citylab.com" value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                          value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {authed && (
          <form onSubmit={handleSubmit}>
            {/* Vendor Type */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Vendor Type *</CardTitle>
                <CardDescription>Select the type of facility you're registering</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {VENDOR_TYPES.map(vt => (
                    <div key={vt.value}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${vendorType === vt.value ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                      onClick={() => { setVendorType(vt.value); setServices([]); }}>
                      <vt.icon className={`h-8 w-8 mx-auto mb-2 ${vendorType === vt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-sm font-medium">{vt.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card className="mb-4">
              <CardHeader><CardTitle className="text-lg">Facility Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Facility Name *</Label>
                    <Input placeholder="e.g. CityLab Diagnostics" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Address</Label>
                    <Input placeholder="Street address" value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Website</Label>
                    <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            {vendorType && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-lg">Services Offered</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {serviceOptions.map(s => (
                      <Badge key={s} variant={services.includes(s) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add custom service" value={customService}
                      onChange={(e) => setCustomService(e.target.value)} className="flex-1" />
                    <Button type="button" variant="outline" size="icon"
                      onClick={() => {
                        if (customService.trim() && !services.includes(customService.trim())) {
                          setServices(prev => [...prev, customService.trim()]);
                          setCustomService('');
                        }
                      }}><Plus className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Insurance */}
            <Card className="mb-4">
              <CardHeader><CardTitle className="text-lg">Accepted Insurance</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {COMMON_INSURANCES.map(i => (
                    <Badge key={i} variant={insurances.includes(i) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setInsurances(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}>
                      {i}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader>
              <CardContent>
                <Textarea placeholder="Describe your facility, services, and capabilities..."
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
              </CardContent>
            </Card>

            <Button type="submit" disabled={loading} className="w-full py-6 text-base font-semibold rounded-xl"
              style={{ background: 'var(--gradient-telemedx)' }}>
              {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Building2 className="h-5 w-5 mr-2" />}
              Submit Vendor Application
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
