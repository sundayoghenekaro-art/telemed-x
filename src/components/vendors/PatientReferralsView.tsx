import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  TestTube, Pill, Scan, Building2, MapPin, CheckCircle, Clock, Loader2, FileText, ArrowRight, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Referral {
  id: string; referral_number: string; type: string;
  patient_name: string; referring_doctor: string;
  status: string; priority: string; clinical_notes: string | null;
  items: any[]; vendor_id: string | null;
  created_at: string; insurance_provider: string | null;
}

interface Vendor {
  id: string; name: string; type: string; city: string | null; state: string | null;
  services: string[]; accepted_insurance: string[];
}

interface Result {
  id: string; title: string; content: string | null; status: string; created_at: string;
}

const typeIcon = (type: string) => {
  switch (type) { case 'lab': return TestTube; case 'pharmacy': return Pill; case 'radiology': return Scan; default: return Building2; }
};
const priorityColor = (p: string) => {
  switch (p) { case 'stat': return 'text-red-600 bg-red-500/10 border-red-500/30'; case 'urgent': return 'text-amber-600 bg-amber-500/10 border-amber-500/30'; default: return ''; }
};

export function PatientReferralsView() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [choosingVendor, setChoosingVendor] = useState(false);

  const fetchReferrals = async () => {
    const { data } = await supabase.from('referrals' as any).select('*').order('created_at', { ascending: false });
    if (data) setReferrals(data as unknown as Referral[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchReferrals();
    const ch = supabase.channel('patient-referrals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => fetchReferrals())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openReferral = async (ref: Referral) => {
    setSelectedReferral(ref);
    if (ref.status === 'pending' && !ref.vendor_id) {
      setLoadingVendors(true);
      const { data } = await supabase.from('vendors' as any).select('*').eq('type', ref.type).eq('status', 'verified');
      if (data) setVendors(data as unknown as Vendor[]);
      setLoadingVendors(false);
      setChoosingVendor(true);
    } else {
      setChoosingVendor(false);
      setLoadingResults(true);
      const { data } = await supabase.from('referral_results' as any).select('*').eq('referral_id', ref.id).eq('status', 'released');
      if (data) setResults(data as unknown as Result[]);
      setLoadingResults(false);
    }
  };

  const chooseVendor = async (vendor: Vendor) => {
    if (!selectedReferral) return;
    try {
      const { error } = await supabase.from('referrals' as any)
        .update({ vendor_id: vendor.id, patient_chosen_at: new Date().toISOString() } as any)
        .eq('id', selectedReferral.id);
      if (error) throw error;
      toast.success(`You chose ${vendor.name}. They'll be notified.`);
      setSelectedReferral(null);
      fetchReferrals();
    } catch {
      toast.error('Failed to select vendor');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/10"><Clock className="h-3 w-3 mr-1" />Choose Vendor</Badge>;
      case 'accepted': return <Badge variant="outline" className="text-blue-600 border-blue-500/30 bg-blue-500/10">Accepted</Badge>;
      case 'in_progress': return <Badge variant="outline" className="text-purple-600 border-purple-500/30 bg-purple-500/10">In Progress</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />My Referrals
        </h2>
        <Badge variant="outline">{referrals.length} total</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : referrals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No referrals yet. Your doctor will create referrals for you.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {referrals.map(ref => {
            const Icon = typeIcon(ref.type);
            return (
              <Card key={ref.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openReferral(ref)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{ref.referral_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {ref.referring_doctor} · {format(parseISO(ref.created_at), 'MMM d')}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(ref.items as any[]).slice(0, 3).map((item: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{item.name || item}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ref.priority !== 'routine' && <Badge variant="outline" className={priorityColor(ref.priority)}>{ref.priority.toUpperCase()}</Badge>}
                    {statusBadge(ref.status)}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedReferral} onOpenChange={() => setSelectedReferral(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedReferral && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReferral.referral_number}</DialogTitle>
                <DialogDescription>From {selectedReferral.referring_doctor}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {selectedReferral.clinical_notes && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Clinical Notes</p>
                    <p className="text-sm">{selectedReferral.clinical_notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Items</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedReferral.items as any[]).map((item: any, i: number) => (
                      <Badge key={i} variant="secondary">{item.name || item}</Badge>
                    ))}
                  </div>
                </div>

                {choosingVendor && (
                  <div>
                    <p className="text-sm font-medium mb-3">Choose a vendor:</p>
                    {loadingVendors ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : vendors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No verified vendors available for this type yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {vendors.map(v => (
                          <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-primary" />
                              <div>
                                <p className="text-sm font-medium">{v.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {v.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 inline" />{v.city}{v.state ? `, ${v.state}` : ''}</span>}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" onClick={() => chooseVendor(v)}>Select</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!choosingVendor && results.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Results</p>
                    {results.map(r => (
                      <div key={r.id} className="rounded-lg border p-3 mb-2">
                        <p className="text-sm font-medium">{r.title}</p>
                        {r.content && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.content}</p>}
                        <p className="text-[10px] text-muted-foreground mt-2">{format(parseISO(r.created_at), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
