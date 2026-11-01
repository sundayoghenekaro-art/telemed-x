import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2, MapPin, Phone, Mail, Globe, Search, Shield, ArrowLeft, TestTube, Pill, Scan, CheckCircle,
} from 'lucide-react';

interface Vendor {
  id: string; name: string; slug: string; type: string;
  address: string | null; city: string | null; state: string | null;
  phone: string | null; email: string | null; website: string | null;
  description: string | null; services: string[]; accepted_insurance: string[];
  logo_url: string | null;
}

const typeIcon = (type: string) => {
  switch (type) { case 'lab': return TestTube; case 'pharmacy': return Pill; case 'radiology': return Scan; default: return Building2; }
};
const typeLabel = (type: string) => {
  switch (type) { case 'lab': return 'Laboratory'; case 'pharmacy': return 'Pharmacy'; case 'radiology': return 'Imaging Center'; default: return type; }
};

export function VendorDirectoryPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Vendor | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('vendors' as any).select('*').eq('status', 'verified').order('name');
      if (data) setVendors(data as unknown as Vendor[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = vendors.filter(v => {
    const matchType = typeFilter === 'all' || v.type === typeFilter;
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.city?.toLowerCase().includes(search.toLowerCase()) ||
      v.services?.some(s => s.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-telemedx-hero)' }}>
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/telemed-x')}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-telemedx)' }}>
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Vendor Network</h1>
                <p className="text-xs text-white/50">Labs, Pharmacies & Imaging Centers</p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => navigate('/telemed-x/vendor-onboarding')}>
            <Building2 className="h-4 w-4 mr-2" />Register Your Facility
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input placeholder="Search vendors, services, or locations..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40" />
          </div>
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="all" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="lab" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
              <TestTube className="h-3 w-3 mr-1" />Labs
            </TabsTrigger>
            <TabsTrigger value="pharmacy" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
              <Pill className="h-3 w-3 mr-1" />Pharmacies
            </TabsTrigger>
            <TabsTrigger value="radiology" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
              <Scan className="h-3 w-3 mr-1" />Imaging
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-white/50">{filtered.length} verified vendor{filtered.length !== 1 ? 's' : ''}</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-12 w-12 mx-auto text-white/20 mb-4" />
            <p className="text-white/50">No vendors match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(v => {
              const Icon = typeIcon(v.type);
              return (
                <Card key={v.id}
                  className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => setSelected(v)}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">{v.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/70 border-0">{typeLabel(v.type)}</Badge>
                          {v.city && <span className="text-xs text-white/50 flex items-center gap-1"><MapPin className="h-3 w-3" />{v.city}{v.state ? `, ${v.state}` : ''}</span>}
                        </div>
                      </div>
                    </div>
                    {v.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.services.slice(0, 3).map(s => (
                          <Badge key={s} variant="secondary" className="text-[10px] bg-white/10 text-white/70 border-0">{s}</Badge>
                        ))}
                        {v.services.length > 3 && <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/70 border-0">+{v.services.length - 3}</Badge>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
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
                      <DialogTitle>{selected.name}</DialogTitle>
                      <DialogDescription className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />{typeLabel(selected.type)} · Verified
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {selected.address && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />{[selected.address, selected.city, selected.state].filter(Boolean).join(', ')}</div>}
                    {selected.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{selected.phone}</div>}
                    {selected.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{selected.email}</div>}
                    {selected.website && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{selected.website}</a></div>}
                  </div>
                  {selected.services?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Services</p>
                      <div className="flex flex-wrap gap-1.5">{selected.services.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                    </div>
                  )}
                  {selected.accepted_insurance?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Accepted Insurance</p>
                      <div className="flex flex-wrap gap-1.5">{selected.accepted_insurance.map(i => <Badge key={i} variant="outline" className="text-xs">{i}</Badge>)}</div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
