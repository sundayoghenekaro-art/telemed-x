import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Loader2, Lock, AlertTriangle, Heart, Crosshair } from 'lucide-react';

interface DefenseFacility {
  id: string;
  name: string;
  type: string;
  branch: string;
  region: string | null;
  command_level: string | null;
  parent_facility_id: string | null;
  status: string;
}

interface DefenseStaffProfile {
  id: string;
  user_id: string;
  facility_id: string;
  full_name: string;
  rank: string | null;
  role: string;
  specialty: string | null;
  security_clearance: string;
  deployment_status: string;
  status: string;
}

export function DefenseHealthAuth({ onAuthenticated }: { onAuthenticated: (staff: DefenseStaffProfile, facility: DefenseFacility) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rank, setRank] = useState('');
  const [role, setRole] = useState('field_medic');
  const [facilityId, setFacilityId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState<DefenseFacility[]>([]);

  useEffect(() => { fetchFacilities(); }, []);

  const fetchFacilities = async () => {
    const { data } = await supabase.from('defense_facilities').select('*').eq('status', 'active').order('name');
    if (data) setFacilities(data as DefenseFacility[]);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { toast.error('Enter email and password'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Invalid credentials');
      setLoading(false);
      return;
    }
    await loadStaffProfile(data.user.id);
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !fullName.trim() || !facilityId) {
      toast.error('Fill in all required fields');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      console.error('Defense auth signup failed:', error);
      toast.error('Could not create an account. Please try again.');
      setLoading(false);
      return;
    }
    const { error: staffError } = await supabase.from('defense_medical_staff').insert({
      user_id: data.user.id,
      facility_id: facilityId,
      full_name: fullName,
      rank: rank || null,
      role,
      specialty: specialty || null,
      security_clearance: 'restricted',
      deployment_status: 'active',
      status: 'active',
    });
    if (staffError) {
      toast.error('Account created but staff profile failed. Contact your administrator.');
      setLoading(false);
      return;
    }
    toast.success('Defense health account created');
    await loadStaffProfile(data.user.id);
  };

  const loadStaffProfile = async (userId: string) => {
    const { data: staffData } = await supabase
      .from('defense_medical_staff')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (!staffData) {
      toast.error('No defense medical staff profile found. Contact your administrator.');
      setLoading(false);
      return;
    }
    const staff = staffData as DefenseStaffProfile;
    const { data: facilityData } = await supabase
      .from('defense_facilities')
      .select('*')
      .eq('id', staff.facility_id)
      .maybeSingle();
    if (!facilityData) {
      toast.error('Your facility could not be found');
      setLoading(false);
      return;
    }
    onAuthenticated(staff, facilityData as DefenseFacility);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/20 mb-3">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-sidebar-foreground">Defense Health Network</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Secure Military Medical Command System</p>
        </div>

        <Card className="border-sidebar-border bg-card">
          <CardHeader>
            <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Secure Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-3">
                <div>
                  <Label>Military Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@defense.mil" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                </div>
                <Button onClick={handleLogin} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                  Secure Login
                </Button>
              </TabsContent>

              <TabsContent value="register" className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Rank and name" />
                </div>
                <div>
                  <Label>Military Email *</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@defense.mil" />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Assigned Facility *</Label>
                  <Select value={facilityId} onValueChange={setFacilityId}>
                    <SelectTrigger><SelectValue placeholder="Select your facility" /></SelectTrigger>
                    <SelectContent>
                      {facilities.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name} ({f.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Rank</Label>
                    <Input value={rank} onChange={e => setRank(e.target.value)} placeholder="e.g. Major" />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="command_surgeon">Command Surgeon</SelectItem>
                        <SelectItem value="specialist">Specialist</SelectItem>
                        <SelectItem value="field_medic">Field Medic</SelectItem>
                        <SelectItem value="nurse">Nurse</SelectItem>
                        <SelectItem value="medical_officer">Medical Officer</SelectItem>
                        <SelectItem value="administrator">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Specialty</Label>
                  <Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. Trauma Surgery" />
                </div>
                <Button onClick={handleSignup} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                  Register
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-sidebar-foreground/40">
          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Authorized Personnel Only</span>
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> Trika Defense Health</span>
        </div>
      </div>
    </div>
  );
}
