import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Shield, Plus, Loader2, Award, FileCheck, Calendar, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface Credential {
  id: string;
  provider_user_id: string;
  credential_type: string;
  credential_name: string;
  issuing_authority: string | null;
  license_number: string | null;
  state: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  status: string;
  verified: boolean;
  verified_by: string | null;
  created_at: string;
}

interface ExternalDoctor {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  specialty: string | null;
  license_number: string | null;
  license_state: string | null;
  status: string;
}

const CREDENTIAL_TYPES = [
  { value: 'license', label: 'Medical License' },
  { value: 'certification', label: 'Board Certification' },
  { value: 'degree', label: 'Medical Degree' },
  { value: 'dea', label: 'DEA Registration' },
  { value: 'malpractice', label: 'Malpractice Insurance' },
];

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  active: { color: 'text-green-600 bg-green-500/10 border-green-500/30', icon: CheckCircle2 },
  expiring: { color: 'text-amber-600 bg-amber-500/10 border-amber-500/30', icon: AlertTriangle },
  expired: { color: 'text-red-600 bg-red-500/10 border-red-500/30', icon: XCircle },
  revoked: { color: 'text-red-600 bg-red-500/10 border-red-500/30', icon: XCircle },
};

export function ProviderCredentialsPage({ clinicianUserId }: { clinicianUserId: string }) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [doctors, setDoctors] = useState<ExternalDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mine');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  // Form
  const [credType, setCredType] = useState('license');
  const [credName, setCredName] = useState('');
  const [authority, setAuthority] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [state, setState] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [credRes, docRes] = await Promise.all([
      supabase.from('provider_credentials').select('*').order('created_at', { ascending: false }),
      supabase.from('external_doctors').select('id, user_id, full_name, email, specialty, license_number, license_state, status'),
    ]);
    if (credRes.data) setCredentials(credRes.data as Credential[]);
    if (docRes.data) setDoctors(docRes.data as ExternalDoctor[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!credName.trim()) { toast.error('Credential name is required'); return; }
    setSaving(true);

    let expiryStatus = 'active';
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry < 0) expiryStatus = 'expired';
      else if (daysUntilExpiry < 90) expiryStatus = 'expiring';
    }

    const { error } = await supabase.from('provider_credentials').insert({
      provider_user_id: clinicianUserId,
      credential_type: credType,
      credential_name: credName,
      issuing_authority: authority || null,
      license_number: licenseNum || null,
      state: state || null,
      issued_date: issuedDate || null,
      expiry_date: expiryDate || null,
      status: expiryStatus,
    });
    if (error) {
      toast.error('Could not add credential');
    } else {
      toast.success('Credential added');
      setShowAdd(false);
      setCredName(''); setAuthority(''); setLicenseNum(''); setState(''); setIssuedDate(''); setExpiryDate('');
      fetchAll();
    }
    setSaving(false);
  };

  const verifyCredential = async (credId: string) => {
    setVerifying(credId);
    const { error } = await supabase.from('provider_credentials').update({
      verified: true,
      verified_by: clinicianUserId,
    }).eq('id', credId);
    if (error) toast.error('Could not verify credential');
    else { toast.success('Credential verified'); fetchAll(); }
    setVerifying(null);
  };

  const myCredentials = credentials.filter(c => c.provider_user_id === clinicianUserId);
  const allCredentials = credentials;

  const renderCredential = (cred: Credential) => {
    const config = STATUS_CONFIG[cred.status] || STATUS_CONFIG.active;
    const StatusIcon = config.icon;
    return (
      <Card key={cred.id}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{cred.credential_name}</p>
                <Badge variant="outline" className={`text-xs ${config.color}`}>
                  <StatusIcon className="h-3 w-3 mr-1" /> {cred.status}
                </Badge>
                {cred.verified ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-500/30 bg-green-500/10">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    <FileCheck className="h-3 w-3 mr-1" /> Unverified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {CREDENTIAL_TYPES.find(t => t.value === cred.credential_type)?.label || cred.credential_type}
                {cred.issuing_authority && ` • ${cred.issuing_authority}`}
              </p>
              {cred.license_number && (
                <p className="text-xs text-muted-foreground">License #: {cred.license_number}{cred.state && ` (${cred.state})`}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                {cred.issued_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Issued {format(parseISO(cred.issued_date), 'MMM d, yyyy')}
                  </span>
                )}
                {cred.expiry_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Expires {format(parseISO(cred.expiry_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
            {tab === 'all' && !cred.verified && (
              <Button size="sm" variant="outline" onClick={() => verifyCredential(cred.id)} disabled={verifying === cred.id}>
                {verifying === cred.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                Verify
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Provider Credentials
          </h2>
          <p className="text-sm text-muted-foreground">Manage licenses, certifications, and credential verification</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Credential</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Credential</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <Label>Type</Label>
                <Select value={credType} onValueChange={setCredType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CREDENTIAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Name *</Label><Input value={credName} onChange={e => setCredName(e.target.value)} placeholder="e.g. State Medical License" /></div>
              <div><Label>Issuing Authority</Label><Input value={authority} onChange={e => setAuthority(e.target.value)} placeholder="e.g. Medical Board of California" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>License Number</Label><Input value={licenseNum} onChange={e => setLicenseNum(e.target.value)} /></div>
                <div><Label>State</Label><Input value={state} onChange={e => setState(e.target.value)} placeholder="CA" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Issued Date</Label><Input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></div>
              </div>
              <Button onClick={handleAdd} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add Credential
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mine" className="flex items-center gap-1"><Award className="h-4 w-4" /> My Credentials</TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-1"><Shield className="h-4 w-4" /> All Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-3 mt-4">
          {myCredentials.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                <Shield className="h-12 w-12 mx-auto opacity-50" />
                <p className="font-medium">No credentials on file</p>
                <p className="text-sm">Add your medical licenses and certifications to build your verified profile</p>
              </CardContent>
            </Card>
          ) : (
            myCredentials.map(renderCredential)
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {/* Registered external doctors */}
          {doctors.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Registered Practitioners</h3>
              {doctors.map(doc => {
                const docCreds = allCredentials.filter(c => c.provider_user_id === doc.user_id);
                return (
                  <Card key={doc.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{doc.full_name}</p>
                          <p className="text-xs text-muted-foreground">{doc.specialty || 'General'} • {doc.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{doc.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {docCreds.length > 0 ? (
                          docCreds.map(c => (
                            <Badge key={c.id} variant="outline" className={`text-[10px] ${STATUS_CONFIG[c.status]?.color || ''}`}>
                              {c.credential_name} {c.verified && '✓'}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No credentials submitted</span>
                        )}
                      </div>
                      {doc.license_number && (
                        <p className="text-xs text-muted-foreground mt-1">
                          License: {doc.license_number} {doc.license_state && `(${doc.license_state})`}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* All credentials */}
          <div className="space-y-2 pt-2">
            <h3 className="font-semibold text-sm">All Credential Records</h3>
            {allCredentials.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No credential records in the system yet.</p>
            ) : (
              allCredentials.map(renderCredential)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
