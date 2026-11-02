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
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--gradient-telemedx-hero)' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-50" />
        <div className="absolute -left-32 top-10 h-72 w-72 animate-aurora rounded-full bg-teal-400/15 blur-[110px]" />
        <div className="absolute -right-24 top-1/3 h-80 w-80 animate-aurora rounded-full bg-sky-400/15 blur-[120px] [animation-delay:-9s]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-aurora rounded-full bg-emerald-400/10 blur-[120px] [animation-delay:-15s]" />
      </div>

      <header className="glass-dark animate-header-in sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => navigate('/telemed-x')}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--gradient-telemedx)' }}>
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold text-white sm:text-base">Vendor Network</h1>
                <p className="hidden truncate text-xs text-white/50 sm:block">Labs, Pharmacies &amp; Imaging Centers</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:h-10 sm:px-4"
            onClick={() => navigate('/telemed-x/vendor-onboarding')}>
            <Building2 className="mr-1.5 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Register Your Facility</span>
            <span className="sm:hidden">Register</span>
          </Button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="glass-dark animate-rise flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input placeholder="Search vendors, services, or locations..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="h-10 border-white/15 bg-white/10 pl-10 text-white transition placeholder:text-white/40 focus:border-[#5eead4]/60 focus:bg-white/15" />
          </div>
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="border-white/15 bg-white/10 backdrop-blur">
            <TabsTrigger value="all" className="text-white/70 transition data-[state=active]:bg-white/20 data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="lab" className="text-white/70 transition data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <TestTube className="mr-1 h-3 w-3" />Labs
            </TabsTrigger>
            <TabsTrigger value="pharmacy" className="text-white/70 transition data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Pill className="mr-1 h-3 w-3" />Pharmacies
            </TabsTrigger>
            <TabsTrigger value="radiology" className="text-white/70 transition data-[state=active]:bg-white/20 data-[state=active]:text-white">
              <Scan className="mr-1 h-3 w-3" />Imaging
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-white/50">{filtered.length} verified vendor{filtered.length !== 1 ? 's' : ''}</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-dark animate-rise space-y-3 rounded-2xl py-20 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Building2 className="h-7 w-7 text-white/40" />
            </span>
            <p className="text-white/60">No vendors match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v, index) => {
              const Icon = typeIcon(v.type);
              return (
                <Card key={v.id}
                  className="tx-hover animate-rise group cursor-pointer border-white/10 bg-white/[0.06] backdrop-blur-sm hover:border-[#5eead4]/35 hover:bg-white/10"
                  style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                  onClick={() => setSelected(v)}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-white/10 transition group-hover:bg-primary/25">
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
        <DialogContent className="max-w-lg border-white/70 bg-white/90 shadow-float backdrop-blur-2xl">
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
