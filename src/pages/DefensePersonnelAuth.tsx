import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Loader2, Lock, AlertTriangle, Heart, Crosshair, Users } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DefensePersonnel = Database['public']['Tables']['defense_personnel']['Row'];

export interface DefenseUserAccount {
  id: string;
  user_id: string;
  personnel_id: string;
  email: string;
  full_name: string;
  account_type: 'personnel' | 'family';
  linked_personnel_id: string | null;
  family_member_id: string | null;
  status: string;
}

export function DefensePersonnelAuth({ onAuthenticated }: { onAuthenticated: (account: DefenseUserAccount, personnel: DefensePersonnel) => void }) {
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serviceNumber, setServiceNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundPersonnel, setFoundPersonnel] = useState<DefensePersonnel | null>(null);
  const [searching, setSearching] = useState(false);

  // Family signup
  const [familyServiceNumber, setFamilyServiceNumber] = useState('');
  const [familyFullName, setFamilyFullName] = useState('');
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyPassword, setFamilyPassword] = useState('');
  const [familyRelationship, setFamilyRelationship] = useState('spouse');
  const [linkedPersonnel, setLinkedPersonnel] = useState<DefensePersonnel | null>(null);
  const [familyDob, setFamilyDob] = useState('');
  const [familyBloodType, setFamilyBloodType] = useState('');

  useEffect(() => {
    if (tab !== 'family-signup') return;
    if (!familyServiceNumber.trim()) { setLinkedPersonnel(null); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('defense_personnel')
        .select('*')
        .eq('service_number', familyServiceNumber.trim())
        .maybeSingle();
      setLinkedPersonnel((data as DefensePersonnel) || null);
      setSearching(false);
    }, 600);
    return () => clearTimeout(t);
  }, [familyServiceNumber, tab]);

  const searchPersonnel = async () => {
    if (!serviceNumber.trim()) { toast.error('Enter your defense ID / service number'); return; }
    setSearching(true);
    const { data, error } = await supabase
      .from('defense_personnel')
      .select('*')
      .eq('service_number', serviceNumber.trim())
      .maybeSingle();
    setSearching(false);
    if (error || !data) {
      toast.error('No personnel found with that service number. Contact your medical facility to be registered first.');
      setFoundPersonnel(null);
      return;
    }
    setFoundPersonnel(data as DefensePersonnel);
    if (!fullName && (data as DefensePersonnel).full_name) setFullName((data as DefensePersonnel).full_name);
    toast.success('Personnel record found. Complete your registration.');
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !foundPersonnel) {
      toast.error('Search for your service number first, then fill in email and password');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      toast.error(error?.message || 'Could not create account');
      setLoading(false);
      return;
    }
    const { error: acctError } = await supabase.from('defense_user_accounts').insert({
      user_id: data.user.id,
      personnel_id: foundPersonnel.id,
      email,
      full_name: fullName || foundPersonnel.full_name,
      account_type: 'personnel',
      status: 'active',
    });
    if (acctError) {
      toast.error('Account created but profile link failed. Contact your administrator.');
      setLoading(false);
      return;
    }
    toast.success('Defense health account created');
    await loadAccount(data.user.id);
  };

  const handleFamilySignup = async () => {
    if (!familyEmail.trim() || !familyPassword.trim() || !linkedPersonnel || !familyFullName.trim()) {
      toast.error('Fill all required fields');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: familyEmail, password: familyPassword });
    if (error || !data.user) {
      toast.error(error?.message || 'Could not create account');
      setLoading(false);
      return;
    }
    // Create a family member record
    const { data: famData, error: famError } = await supabase.from('defense_family_members').insert({
      personnel_id: linkedPersonnel.id,
      full_name: familyFullName,
      relationship: familyRelationship,
      date_of_birth: familyDob || null,
      blood_type: familyBloodType || null,
    }).select().single();
    if (famError || !famData) {
      toast.error('Could not create family member record');
      setLoading(false);
      return;
    }
    const { error: acctError } = await supabase.from('defense_user_accounts').insert({
      user_id: data.user.id,
      personnel_id: linkedPersonnel.id,
      email: familyEmail,
      full_name: familyFullName,
      account_type: 'family',
      linked_personnel_id: linkedPersonnel.id,
      family_member_id: famData.id,
      status: 'active',
    });
    if (acctError) {
      toast.error('Account created but profile link failed.');
      setLoading(false);
      return;
    }
    toast.success('Family member account created');
    await loadAccount(data.user.id);
  };

  const handleSignin = async () => {
    if (!email.trim() || !password.trim()) { toast.error('Enter email and password'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error('Invalid credentials'); setLoading(false); return; }
    await loadAccount(data.user.id);
  };

  const loadAccount = async (userId: string) => {
    const { data: acctData } = await supabase
      .from('defense_user_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (!acctData) {
      toast.error('No defense personnel account found. This may be a medical staff account — use Medical Staff Access instead.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    const account = acctData as DefenseUserAccount;
    const personnelId = account.personnel_id || account.linked_personnel_id;
    if (!personnelId) { toast.error('Account not properly linked'); setLoading(false); return; }
    const { data: pData } = await supabase
      .from('defense_personnel')
      .select('*')
      .eq('id', personnelId)
      .maybeSingle();
    if (!pData) { toast.error('Linked personnel record not found'); setLoading(false); return; }
    onAuthenticated(account, pData as DefensePersonnel);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-500/20 mb-3">
            <Crosshair className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-sidebar-foreground">Defense Personnel Portal</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">For Service Members & Their Families</p>
        </div>

        <Card className="border-sidebar-border bg-card">
          <CardHeader>
            <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-blue-400" /> Personnel & Family Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="signin" className="text-xs">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs">Personnel</TabsTrigger>
                <TabsTrigger value="family-signup" className="text-xs">Family</TabsTrigger>
              </TabsList>

              {/* SIGN IN */}
              <TabsContent value="signin" className="space-y-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSignin()} />
                </div>
                <Button onClick={handleSignin} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                  Sign In
                </Button>
              </TabsContent>

              {/* PERSONNEL SIGNUP */}
              <TabsContent value="signup" className="space-y-3">
                <div>
                  <Label>Defense ID / Service Number *</Label>
                  <div className="flex gap-2">
                    <Input value={serviceNumber} onChange={e => setServiceNumber(e.target.value)} placeholder="e.g. ARM-001234" />
                    <Button size="sm" variant="outline" onClick={searchPersonnel} disabled={searching}>
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
                    </Button>
                  </div>
                </div>
                {foundPersonnel && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
                    <p className="font-medium text-blue-400">{foundPersonnel.rank || ''} {foundPersonnel.full_name}</p>
                    <p className="text-xs text-muted-foreground">{foundPersonnel.service_number} • {foundPersonnel.branch} • {foundPersonnel.unit || 'N/A'}</p>
                    <p className="text-xs text-green-500 mt-1">Record verified — complete your registration below.</p>
                  </div>
                )}
                <div>
                  <Label>Full Name *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button onClick={handleSignup} disabled={loading || !foundPersonnel} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crosshair className="h-4 w-4 mr-2" />}
                  Create Personnel Account
                </Button>
                {!foundPersonnel && (
                  <p className="text-xs text-muted-foreground text-center">Search for your service number first to verify your identity.</p>
                )}
              </TabsContent>

              {/* FAMILY SIGNUP */}
              <TabsContent value="family-signup" className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                <div>
                  <Label>Service Member's Defense ID *</Label>
                  <Input value={familyServiceNumber} onChange={e => setFamilyServiceNumber(e.target.value)} placeholder="Enter the service member's ID" />
                </div>
                {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
                {linkedPersonnel && !searching && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                    <p className="font-medium text-green-500">{linkedPersonnel.rank || ''} {linkedPersonnel.full_name}</p>
                    <p className="text-xs text-muted-foreground">{linkedPersonnel.service_number} • {linkedPersonnel.branch}</p>
                    <p className="text-xs text-green-500 mt-1">Service member verified.</p>
                  </div>
                )}
                {familyServiceNumber && !linkedPersonnel && !searching && (
                  <p className="text-xs text-destructive">No service member found with that ID. Ask them to register first.</p>
                )}
                <div>
                  <Label>Your Full Name *</Label>
                  <Input value={familyFullName} onChange={e => setFamilyFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <div>
                  <Label>Relationship *</Label>
                  <Select value={familyRelationship} onValueChange={setFamilyRelationship}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" value={familyDob} onChange={e => setFamilyDob(e.target.value)} />
                  </div>
                  <div>
                    <Label>Blood Type</Label>
                    <Select value={familyBloodType} onValueChange={setFamilyBloodType}>
                      <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={familyEmail} onChange={e => setFamilyEmail(e.target.value)} placeholder="your@email.com" />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input type="password" value={familyPassword} onChange={e => setFamilyPassword(e.target.value)} />
                </div>
                <Button onClick={handleFamilySignup} disabled={loading || !linkedPersonnel} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                  Create Family Account
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-sidebar-foreground/40">
          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Authorized Personnel & Families</span>
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> Trika Defense Health</span>
        </div>
      </div>
    </div>
  );
}
