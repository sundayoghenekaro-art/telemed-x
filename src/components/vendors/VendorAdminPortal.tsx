import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2, CheckCircle, Clock, Loader2, TestTube, Pill, Scan, FileText, Upload, Eye, Bell,
  ClipboardList, Users, ArrowRight, Package, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { TelemedXShell } from '@/components/telemedx/TelemedXShell';

interface Vendor {
  id: string; name: string; type: string; status: string;
}

interface Referral {
  id: string; referral_number: string; type: string;
  patient_name: string; patient_upid: string; referring_doctor: string;
  status: string; priority: string; clinical_notes: string | null;
  items: any[]; created_at: string; accepted_at: string | null;
  patient_user_id: string | null;
}

interface Result {
  id: string; title: string; content: string | null; status: string;
  created_at: string; referral_id: string;
}

const typeIcon = (type: string) => {
  switch (type) { case 'lab': return TestTube; case 'pharmacy': return Pill; case 'radiology': return Scan; default: return Building2; }
};
const priorityColor = (p: string) => {
  switch (p) { case 'stat': return 'text-red-600 bg-red-500/10 border-red-500/30'; case 'urgent': return 'text-amber-600 bg-amber-500/10 border-amber-500/30'; default: return ''; }
};

export function VendorAdminPortal() {
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [selectedRef, setSelectedRef] = useState<Referral | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch vendor for current user
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: adminRec } = await supabase
        .from('vendor_admins' as any).select('vendor_id').eq('user_id', user.id).maybeSingle();
      if (!adminRec) { setLoading(false); return; }

      const { data: v } = await supabase
        .from('vendors' as any).select('*').eq('id', (adminRec as any).vendor_id).single();
      if (v) setVendor(v as unknown as Vendor);
      setLoading(false);
    };
    init();
  }, []);

  // Fetch referrals assigned to this vendor
  const fetchReferrals = async () => {
    if (!vendor) return;
    const { data } = await supabase
      .from('referrals' as any).select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });
    if (data) setReferrals(data as unknown as Referral[]);
  };

  useEffect(() => {
    if (!vendor) return;
    fetchReferrals();
    const ch = supabase.channel('vendor-referrals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals', filter: `vendor_id=eq.${vendor.id}` }, () => fetchReferrals())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vendor]);

  const acceptReferral = async (ref: Referral) => {
    setActionLoading(true);
    try {
      await supabase.from('referrals' as any)
        .update({ status: 'accepted', accepted_at: new Date().toISOString() } as any)
        .eq('id', ref.id);

      // Notify patient
      if (ref.patient_user_id) {
        await supabase.from('patient_notifications').insert({
          patient_user_id: ref.patient_user_id,
          title: 'Referral Accepted',
          message: `${vendor?.name} has accepted your ${ref.type} referral (${ref.referral_number}). You'll be notified when results are ready.`,
          type: 'referral_update',
          referral_id: ref.id,
        });
      }
      toast.success('Referral accepted');
      setSelectedRef(null);
      fetchReferrals();
    } catch { toast.error('Failed to accept'); }
    finally { setActionLoading(false); }
  };

  const markInProgress = async (ref: Referral) => {
    setActionLoading(true);
    try {
      await supabase.from('referrals' as any)
        .update({ status: 'in_progress' } as any)
        .eq('id', ref.id);
      toast.success('Marked in progress');
      fetchReferrals();
    } catch { toast.error('Failed'); }
    finally { setActionLoading(false); }
  };

  const openReferralDetail = async (ref: Referral) => {
    setSelectedRef(ref);
    setLoadingResults(true);
    const { data } = await supabase
      .from('referral_results' as any).select('*').eq('referral_id', ref.id).order('created_at', { ascending: false });
    if (data) setResults(data as unknown as Result[]);
    setLoadingResults(false);
  };

  const uploadResult = async () => {
    if (!selectedRef || !vendor || !uploadTitle.trim()) { toast.error('Title is required'); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('referral_results' as any).insert({
        referral_id: selectedRef.id,
        vendor_id: vendor.id,
        title: uploadTitle.trim(),
        content: uploadContent.trim() || null,
        uploaded_by: user?.email || 'Vendor Staff',
        status: 'pending',
        result_type: 'report',
      });
      toast.success('Result uploaded — pending validation');
      setUploadOpen(false);
      setUploadTitle('');
      setUploadContent('');
      // Refresh results
      const { data } = await supabase
        .from('referral_results' as any).select('*').eq('referral_id', selectedRef.id).order('created_at', { ascending: false });
      if (data) setResults(data as unknown as Result[]);
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const validateAndRelease = async (result: Result) => {
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      await supabase.from('referral_results' as any)
        .update({ status: 'released', validated_by: user?.email, validated_at: now, released_at: now } as any)
        .eq('id', result.id);

      // Notify patient
      if (selectedRef?.patient_user_id) {
        await supabase.from('patient_notifications').insert({
          patient_user_id: selectedRef.patient_user_id,
          title: 'Results Ready',
          message: `Your results for referral ${selectedRef.referral_number} are now available. Tap to view.`,
          type: 'result_ready',
          referral_id: selectedRef.id,
        });
      }

      // Mark referral completed if all results released
      await supabase.from('referrals' as any)
        .update({ status: 'completed', completed_at: now } as any)
        .eq('id', selectedRef?.id);

      toast.success('Result validated and released to patient');
      // Refresh
      const { data } = await supabase
        .from('referral_results' as any).select('*').eq('referral_id', selectedRef?.id).order('created_at', { ascending: false });
      if (data) setResults(data as unknown as Result[]);
      fetchReferrals();
    } catch { toast.error('Failed'); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <TelemedXShell portal="Partner portal" icon={Building2} accent="sky" maxWidth="max-w-6xl">
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TelemedXShell>
    );
  }

  if (!vendor) {
    return (
      <TelemedXShell portal="Partner portal" icon={Building2} accent="sky" maxWidth="max-w-6xl">
        <div className="glass-panel animate-rise flex flex-col items-center justify-center space-y-4 rounded-2xl py-20">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-border/60">
            <Building2 className="h-7 w-7 text-muted-foreground" />
          </span>
          <p className="text-muted-foreground">You're not registered as a vendor admin.</p>
          <Button variant="outline" onClick={() => window.location.href = '/telemed-x/vendor-onboarding'}>
            Register Your Facility
          </Button>
        </div>
      </TelemedXShell>
    );
  }

  const pending = referrals.filter(r => r.status === 'accepted' || r.status === 'pending');
  const inProgress = referrals.filter(r => r.status === 'in_progress');
  const completed = referrals.filter(r => r.status === 'completed');
  const Icon = typeIcon(vendor.type);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/10"><Clock className="h-3 w-3 mr-1" />New</Badge>;
      case 'accepted': return <Badge variant="outline" className="text-blue-600 border-blue-500/30 bg-blue-500/10">Accepted</Badge>;
      case 'in_progress': return <Badge variant="outline" className="text-purple-600 border-purple-500/30 bg-purple-500/10">In Progress</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <TelemedXShell
      portal="Partner portal"
      icon={Icon}
      accent="sky"
      subtitle={`${vendor.name} · ${vendor.type}`}
      maxWidth="max-w-6xl"
      actions={
        <>
          <Badge variant="outline" className="gap-1 border-white/70 bg-white/60"><ClipboardList className="h-3 w-3" />{pending.length} Incoming</Badge>
          <Badge variant="outline" className="gap-1 border-white/70 bg-white/60"><Package className="h-3 w-3" />{inProgress.length} Active</Badge>
        </>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Incoming', count: pending.length, icon: Bell, color: 'text-yellow-600' },
            { label: 'In Progress', count: inProgress.length, icon: Package, color: 'text-purple-600' },
            { label: 'Completed', count: completed.length, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Total', count: referrals.length, icon: FileText, color: 'text-primary' },
          ].map((s, index) => (
            <Card key={s.label} className="tx-hover animate-rise rounded-2xl" style={{ animationDelay: `${index * 45}ms` }}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 ring-1 ring-border/60">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </span>
                <div>
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      {/* Referral Tabs */}
      <Tabs defaultValue="incoming">
        <TabsList className="rounded-xl border border-white/70 bg-white/60 p-1 shadow-sm">
          <TabsTrigger value="incoming" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Incoming ({pending.length})</TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Active ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        {(['incoming', 'active', 'completed'] as const).map(tab => {
          const list = tab === 'incoming' ? pending : tab === 'active' ? inProgress : completed;
          return (
            <TabsContent key={tab} value={tab}>
              <ScrollArea className="h-[55vh]">
                {list.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No {tab} referrals</p>
                ) : (
                  <div className="space-y-2">
                    {list.map(ref => (
                      <Card key={ref.id} className="tx-hover cursor-pointer rounded-2xl hover:border-primary/30 hover:bg-white/70"
                        onClick={() => openReferralDetail(ref)}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{ref.referral_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {ref.patient_name} · Dr. {ref.referring_doctor} · {format(parseISO(ref.created_at), 'MMM d')}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(ref.items as any[]).slice(0, 3).map((item: any, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">{item.name || item}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {ref.priority !== 'routine' && (
                              <Badge variant="outline" className={priorityColor(ref.priority)}>
                                {ref.priority === 'stat' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {ref.priority.toUpperCase()}
                              </Badge>
                            )}
                            {statusBadge(ref.status)}
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Referral Detail Dialog */}
      <Dialog open={!!selectedRef} onOpenChange={() => setSelectedRef(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedRef && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRef.referral_number}</DialogTitle>
                <DialogDescription>
                  Patient: {selectedRef.patient_name} · Referring: Dr. {selectedRef.referring_doctor}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="flex items-center gap-2">
                  {statusBadge(selectedRef.status)}
                  {selectedRef.priority !== 'routine' && (
                    <Badge variant="outline" className={priorityColor(selectedRef.priority)}>
                      {selectedRef.priority.toUpperCase()}
                    </Badge>
                  )}
                </div>

                {selectedRef.clinical_notes && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Clinical Notes</p>
                    <p className="text-sm">{selectedRef.clinical_notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Ordered Items</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedRef.items as any[]).map((item: any, i: number) => (
                      <Badge key={i} variant="secondary">{item.name || item}</Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {selectedRef.status === 'pending' && (
                  <Button onClick={() => acceptReferral(selectedRef)} disabled={actionLoading} className="w-full">
                    {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                    Accept Referral
                  </Button>
                )}

                {selectedRef.status === 'accepted' && (
                  <Button onClick={() => markInProgress(selectedRef)} disabled={actionLoading} className="w-full">
                    <Package className="h-4 w-4 mr-1" />Mark In Progress
                  </Button>
                )}

                {(selectedRef.status === 'in_progress' || selectedRef.status === 'accepted') && (
                  <Button variant="outline" onClick={() => setUploadOpen(true)} className="w-full">
                    <Upload className="h-4 w-4 mr-1" />Upload Result
                  </Button>
                )}

                {/* Results list */}
                {loadingResults ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : results.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Results ({results.length})</p>
                    {results.map(r => (
                      <div key={r.id} className="rounded-lg border p-3 mb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{r.title}</p>
                            {r.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.content}</p>}
                            <p className="text-[10px] text-muted-foreground mt-1">{format(parseISO(r.created_at), 'MMM d, h:mm a')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.status === 'pending' ? (
                              <Button size="sm" onClick={() => validateAndRelease(r)} disabled={actionLoading}>
                                <CheckCircle className="h-3 w-3 mr-1" />Release
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10">
                                <CheckCircle className="h-3 w-3 mr-1" />Released
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Result Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Result</DialogTitle>
            <DialogDescription>For referral {selectedRef?.referral_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="e.g. CBC Report, X-Ray Findings..." value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Content / Findings</Label>
              <Textarea placeholder="Enter results, findings, or report text..." value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)} rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={uploadResult} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TelemedXShell>
  );
}
