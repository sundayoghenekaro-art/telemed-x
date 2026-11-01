import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2, CheckCircle, XCircle, Clock, MapPin, Phone, Mail, Globe, Shield, Loader2, Search, Eye, TestTube, Pill, Scan,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Vendor {
  id: string; name: string; slug: string; type: string;
  address: string | null; city: string | null; state: string | null;
  phone: string | null; email: string | null; website: string | null;
  description: string | null; services: string[]; accepted_insurance: string[];
  status: string; created_at: string; verified_at: string | null;
}

const typeIcon = (type: string) => {
  switch (type) { case 'lab': return TestTube; case 'pharmacy': return Pill; case 'radiology': return Scan; default: return Building2; }
};
const typeLabel = (type: string) => {
  switch (type) { case 'lab': return 'Laboratory'; case 'pharmacy': return 'Pharmacy'; case 'radiology': return 'Imaging'; default: return type; }
};

export function SuperAdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVendors = async () => {
    const { data } = await supabase.from('vendors' as any).select('*').order('created_at', { ascending: false });
    if (data) setVendors(data as unknown as Vendor[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchVendors();
    const ch = supabase.channel('vendors-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => fetchVendors())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleVerify = async (v: Vendor) => {
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('vendors' as any).update({ status: 'verified', verified_at: new Date().toISOString(), verified_by: user?.id } as any).eq('id', v.id);
      toast.success(`${v.name} verified!`);
      setSelected(null);
      fetchVendors();
    } catch { toast.error('Failed'); } finally { setActionLoading(false); }
  };

  const handleSuspend = async (v: Vendor) => {
    setActionLoading(true);
    try {
      await supabase.from('vendors' as any).update({ status: 'suspended' } as any).eq('id', v.id);
      toast.success(`${v.name} suspended`);
      setSelected(null);
      fetchVendors();
    } catch { toast.error('Failed'); } finally { setActionLoading(false); }
  };

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.city?.toLowerCase().includes(search.toLowerCase()) ||
    v.type.includes(search.toLowerCase())
  );

  const pending = filtered.filter(v => v.status === 'pending');
  const verified = filtered.filter(v => v.status === 'verified');
  const suspended = filtered.filter(v => v.status === 'suspended');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/10"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'verified': return <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'suspended': return <Badge variant="outline" className="text-red-600 border-red-500/30 bg-red-500/10"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const VendorRow = ({ vendor }: { vendor: Vendor }) => {
    const Icon = typeIcon(vendor.type);
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => setSelected(vendor)}>
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{vendor.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{typeLabel(vendor.type)}</Badge>
              {vendor.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{vendor.city}{vendor.state ? `, ${vendor.state}` : ''}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">{format(parseISO(vendor.created_at), 'MMM d, yyyy')}</span>
          {statusBadge(vendor.status)}
          <Eye className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />Vendor Management
          </h1>
          <p className="text-muted-foreground text-sm">Review and manage labs, pharmacies, and imaging centers</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{pending.length} Pending</Badge>
          <Badge variant="outline" className="gap-1 text-green-600"><CheckCircle className="h-3 w-3" />{verified.length} Verified</Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {(tab === 'all' ? filtered : tab === 'pending' ? pending : tab === 'verified' ? verified : suspended)
                    .map(v => <VendorRow key={v.id} vendor={v} />)}
                  {(tab === 'all' ? filtered : tab === 'pending' ? pending : tab === 'verified' ? verified : suspended).length === 0 && (
                    <p className="text-center text-muted-foreground py-12">No vendors found</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (() => {
            const Icon = typeIcon(selected.type);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selected.name}</DialogTitle>
                      <DialogDescription>{typeLabel(selected.type)} · Applied {format(parseISO(selected.created_at), 'MMM d, yyyy')}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {statusBadge(selected.status)}
                  {selected.description && <div className="rounded-lg border p-3"><p className="text-xs font-medium text-muted-foreground mb-1">Description</p><p className="text-sm">{selected.description}</p></div>}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selected.phone && <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Phone</p><p className="text-sm font-medium mt-1">{selected.phone}</p></div>}
                    {selected.email && <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Email</p><p className="text-sm font-medium mt-1">{selected.email}</p></div>}
                    {selected.website && <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" />Website</p><p className="text-sm font-medium mt-1 truncate">{selected.website}</p></div>}
                  </div>
                  {selected.services?.length > 0 && (
                    <div><p className="text-xs font-medium text-muted-foreground mb-2">Services</p><div className="flex flex-wrap gap-1.5">{selected.services.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div></div>
                  )}
                  {selected.accepted_insurance?.length > 0 && (
                    <div><p className="text-xs font-medium text-muted-foreground mb-2">Insurance</p><div className="flex flex-wrap gap-1.5">{selected.accepted_insurance.map(i => <Badge key={i} variant="outline" className="text-xs">{i}</Badge>)}</div></div>
                  )}
                </div>
                <DialogFooter className="flex gap-2 mt-4">
                  {selected.status === 'pending' && (
                    <>
                      <Button variant="outline" className="text-destructive border-destructive/30" onClick={() => handleSuspend(selected)} disabled={actionLoading}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                      <Button onClick={() => handleVerify(selected)} disabled={actionLoading}>{actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}Verify</Button>
                    </>
                  )}
                  {selected.status === 'verified' && <Button variant="outline" className="text-destructive border-destructive/30" onClick={() => handleSuspend(selected)} disabled={actionLoading}><XCircle className="h-4 w-4 mr-1" />Suspend</Button>}
                  {selected.status === 'suspended' && <Button onClick={() => handleVerify(selected)} disabled={actionLoading}><CheckCircle className="h-4 w-4 mr-1" />Re-verify</Button>}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
