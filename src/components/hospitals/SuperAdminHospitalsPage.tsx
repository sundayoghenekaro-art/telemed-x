import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2, CheckCircle, XCircle, Clock, MapPin, Phone, Mail, Globe, Shield, Loader2, Search, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Hospital {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  accredited_specialties: string[];
  accepted_insurance: string[];
  status: string;
  created_at: string;
  verified_at: string | null;
}

export function SuperAdminHospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchHospitals = async () => {
    const { data } = await supabase
      .from('hospitals')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setHospitals(data as unknown as Hospital[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchHospitals();
    const channel = supabase
      .channel('hospitals-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => fetchHospitals())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVerify = async (hospital: Hospital) => {
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('hospitals')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        } as any)
        .eq('id', hospital.id);
      if (error) throw error;
      toast.success(`${hospital.name} has been verified and is now live!`);
      setSelectedHospital(null);
      fetchHospitals();
    } catch {
      toast.error('Failed to verify hospital');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (hospital: Hospital) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({ status: 'suspended' } as any)
        .eq('id', hospital.id);
      if (error) throw error;
      toast.success(`${hospital.name} has been suspended`);
      setSelectedHospital(null);
      fetchHospitals();
    } catch {
      toast.error('Failed to suspend hospital');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.city?.toLowerCase().includes(search.toLowerCase()) ||
    h.state?.toLowerCase().includes(search.toLowerCase())
  );

  const pending = filtered.filter(h => h.status === 'pending');
  const verified = filtered.filter(h => h.status === 'verified');
  const suspended = filtered.filter(h => h.status === 'suspended');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/10"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'verified': return <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'suspended': return <Badge variant="outline" className="text-red-600 border-red-500/30 bg-red-500/10"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const HospitalRow = ({ hospital }: { hospital: Hospital }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => setSelectedHospital(hospital)}>
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{hospital.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {hospital.city && hospital.state && (
              <><MapPin className="h-3 w-3" />{hospital.city}, {hospital.state}</>
            )}
            {!hospital.city && 'No location provided'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {format(parseISO(hospital.created_at), 'MMM d, yyyy')}
        </span>
        {statusBadge(hospital.status)}
        <Eye className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Hospital Management
          </h1>
          <p className="text-muted-foreground text-sm">Review, verify, and manage onboarded hospitals</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{pending.length} Pending</Badge>
          <Badge variant="outline" className="gap-1 text-green-600"><CheckCircle className="h-3 w-3" />{verified.length} Verified</Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search hospitals by name, city, or state..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({verified.length})</TabsTrigger>
          <TabsTrigger value="suspended">Suspended ({suspended.length})</TabsTrigger>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
        </TabsList>

        {(['pending', 'verified', 'suspended', 'all'] as const).map(tab => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {(tab === 'all' ? filtered : tab === 'pending' ? pending : tab === 'verified' ? verified : suspended)
                    .map(h => <HospitalRow key={h.id} hospital={h} />)}
                  {(tab === 'all' ? filtered : tab === 'pending' ? pending : tab === 'verified' ? verified : suspended).length === 0 && (
                    <p className="text-center text-muted-foreground py-12">No hospitals found</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedHospital} onOpenChange={() => setSelectedHospital(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedHospital && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedHospital.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      /{selectedHospital.slug} · Applied {format(parseISO(selectedHospital.created_at), 'MMM d, yyyy')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {statusBadge(selectedHospital.status)}

                {/* Location */}
                {(selectedHospital.address || selectedHospital.city) && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Location</p>
                    <p className="text-sm flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {[selectedHospital.address, selectedHospital.city, selectedHospital.state, selectedHospital.zip_code].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedHospital.phone && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Phone</p>
                      <p className="text-sm font-medium mt-1">{selectedHospital.phone}</p>
                    </div>
                  )}
                  {selectedHospital.email && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Email</p>
                      <p className="text-sm font-medium mt-1">{selectedHospital.email}</p>
                    </div>
                  )}
                  {selectedHospital.website && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" />Website</p>
                      <p className="text-sm font-medium mt-1 truncate">{selectedHospital.website}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedHospital.description && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedHospital.description}</p>
                  </div>
                )}

                {/* Specialties */}
                {selectedHospital.accredited_specialties?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Accredited Specialties</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedHospital.accredited_specialties.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insurance */}
                {selectedHospital.accepted_insurance?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Accepted Insurance</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedHospital.accepted_insurance.map(i => (
                        <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2 mt-4">
                {selectedHospital.status === 'pending' && (
                  <>
                    <Button variant="outline" className="text-destructive border-destructive/30"
                      onClick={() => handleSuspend(selectedHospital)} disabled={actionLoading}>
                      <XCircle className="h-4 w-4 mr-1" />Reject
                    </Button>
                    <Button onClick={() => handleVerify(selectedHospital)} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Verify Hospital
                    </Button>
                  </>
                )}
                {selectedHospital.status === 'verified' && (
                  <Button variant="outline" className="text-destructive border-destructive/30"
                    onClick={() => handleSuspend(selectedHospital)} disabled={actionLoading}>
                    <XCircle className="h-4 w-4 mr-1" />Suspend
                  </Button>
                )}
                {selectedHospital.status === 'suspended' && (
                  <Button onClick={() => handleVerify(selectedHospital)} disabled={actionLoading}>
                    <CheckCircle className="h-4 w-4 mr-1" />Re-verify
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
