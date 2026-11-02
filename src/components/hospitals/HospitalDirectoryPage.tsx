import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2, MapPin, Phone, Mail, Globe, Search, Stethoscope, Shield, ArrowLeft, Zap, CheckCircle,
} from 'lucide-react';

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
  supported_languages: string[] | null;
  logo_url: string | null;
}

interface HospitalDoctor {
  id: string;
  doctor_name: string;
  specialty: string | null;
  status: string;
}

export function HospitalDirectoryPage() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [insuranceFilter, setInsuranceFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    const fetchHospitals = async () => {
      const { data } = await supabase
        .from('hospitals')
        .select('*')
        .eq('status', 'verified')
        .order('name');
      if (data) setHospitals(data as unknown as Hospital[]);
      setLoading(false);
    };
    fetchHospitals();
  }, []);

  const fetchDoctors = async (hospitalId: string) => {
    setLoadingDoctors(true);
    const { data } = await supabase
      .from('hospital_doctors')
      .select('id, doctor_name, specialty, status')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active');
    if (data) setDoctors(data as unknown as HospitalDoctor[]);
    setLoadingDoctors(false);
  };

  const openHospital = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    fetchDoctors(hospital.id);
  };

  const filtered = hospitals.filter(h => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      h.name.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q) ||
      h.accredited_specialties?.some(s => s.toLowerCase().includes(q));
    const matchesInsurance = !insuranceFilter ||
      h.accepted_insurance?.some(i => i.toLowerCase().includes(insuranceFilter.toLowerCase()));
    const matchesState = !stateFilter || h.state === stateFilter;
    const matchesSpecialty = !specialtyFilter ||
      h.accredited_specialties?.some(s => s.toLowerCase().includes(specialtyFilter.toLowerCase()));
    const matchesLanguage = !languageFilter ||
      (h.supported_languages || []).some(l => l.toLowerCase() === languageFilter.toLowerCase());
    return matchesSearch && matchesInsurance && matchesState && matchesSpecialty && matchesLanguage;
  });

  // Collect unique values for filter dropdowns
  const allStates = [...new Set(hospitals.map(h => h.state).filter((s): s is string => !!s))].sort();
  const allSpecialties = [...new Set(hospitals.flatMap(h => h.accredited_specialties || []))].sort();
  const allLanguages = [...new Set(hospitals.flatMap(h => h.supported_languages || []))].sort();
  const allInsurances = [...new Set(hospitals.flatMap(h => h.accepted_insurance || []))].sort();

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--gradient-telemedx-hero)' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-50" />
        <div className="absolute -left-32 top-10 h-72 w-72 animate-aurora rounded-full bg-sky-400/15 blur-[110px]" />
        <div className="absolute -right-24 top-1/3 h-80 w-80 animate-aurora rounded-full bg-teal-400/15 blur-[120px] [animation-delay:-9s]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-aurora rounded-full bg-emerald-400/10 blur-[120px] [animation-delay:-15s]" />
      </div>

      {/* Header */}
      <header className="glass-dark animate-header-in sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => navigate('/telemed-x')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--gradient-telemedx)' }}>
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold text-white sm:text-base">Hospital Directory</h1>
                <p className="hidden truncate text-xs text-white/50 sm:block">Browse verified healthcare institutions</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:h-10 sm:px-4"
            onClick={() => navigate('/telemed-x/hospital-onboarding')}>
            <Building2 className="mr-1.5 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Register Your Hospital</span>
            <span className="sm:hidden">Register</span>
          </Button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Search & Filters */}
        <div className="glass-dark animate-rise grid grid-cols-1 gap-3 rounded-2xl p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input placeholder="Search hospitals, cities, or specialties..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="h-10 border-white/15 bg-white/10 pl-10 text-white transition placeholder:text-white/40 focus:border-[#5eead4]/60 focus:bg-white/15" />
          </div>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            <Input placeholder="Insurance..."
              value={insuranceFilter} onChange={(e) => setInsuranceFilter(e.target.value)}
              className="h-10 border-white/15 bg-white/10 pl-10 text-white transition placeholder:text-white/40 focus:border-[#5eead4]/60 focus:bg-white/15" />
          </div>
          <div>
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}
              className="w-full h-10 rounded-md bg-white/10 border border-white/15 text-white px-3 text-sm transition hover:bg-white/15 focus:border-[#5eead4]/60">
              <option value="" className="bg-slate-900">All Locations</option>
              {allStates.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
            </select>
          </div>
          <div>
            <select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full h-10 rounded-md bg-white/10 border border-white/15 text-white px-3 text-sm transition hover:bg-white/15 focus:border-[#5eead4]/60">
              <option value="" className="bg-slate-900">All Specialties</option>
              {allSpecialties.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
            </select>
          </div>
          <div>
            <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full h-10 rounded-md bg-white/10 border border-white/15 text-white px-3 text-sm transition hover:bg-white/15 focus:border-[#5eead4]/60">
              <option value="" className="bg-slate-900">All Languages</option>
              {allLanguages.map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
            </select>
          </div>
        </div>

        <p className="text-sm text-white/50">{filtered.length} verified hospital{filtered.length !== 1 ? 's' : ''}</p>

        {/* Hospital Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-dark animate-rise space-y-3 rounded-2xl py-20 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Building2 className="h-7 w-7 text-white/40" />
            </span>
            <p className="text-white/60">No hospitals match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((hospital, index) => (
              <Card key={hospital.id}
                className="tx-hover animate-rise group cursor-pointer border-white/10 bg-white/[0.06] backdrop-blur-sm hover:border-[#5eead4]/35 hover:bg-white/10"
                style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                onClick={() => openHospital(hospital)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-white/10 transition group-hover:bg-primary/25">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{hospital.name}</h3>
                      {hospital.city && (
                        <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{hospital.city}{hospital.state ? `, ${hospital.state}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {hospital.accredited_specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hospital.accredited_specialties.slice(0, 4).map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px] bg-white/10 text-white/70 border-0">{s}</Badge>
                      ))}
                      {hospital.accredited_specialties.length > 4 && (
                        <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/70 border-0">
                          +{hospital.accredited_specialties.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {(hospital.supported_languages || []).length > 0 && (
                    <p className="text-xs text-white/40">
                      <Globe className="h-3 w-3 inline mr-1" />
                      {(hospital.supported_languages || []).join(', ')}
                    </p>
                  )}

                  {hospital.accepted_insurance?.length > 0 && (
                    <p className="text-xs text-white/40">
                      <Shield className="h-3 w-3 inline mr-1" />
                      {hospital.accepted_insurance.slice(0, 3).join(', ')}
                      {hospital.accepted_insurance.length > 3 ? ` +${hospital.accepted_insurance.length - 3}` : ''}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Hospital Detail Dialog */}
      <Dialog open={!!selectedHospital} onOpenChange={() => setSelectedHospital(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-white/70 bg-white/90 backdrop-blur-2xl shadow-float">
          {selectedHospital && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedHospital.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />Verified Institution
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {selectedHospital.description && (
                  <p className="text-sm text-muted-foreground">{selectedHospital.description}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedHospital.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{[selectedHospital.address, selectedHospital.city, selectedHospital.state, selectedHospital.zip_code].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {selectedHospital.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />{selectedHospital.phone}
                    </div>
                  )}
                  {selectedHospital.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />{selectedHospital.email}
                    </div>
                  )}
                  {selectedHospital.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={selectedHospital.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {selectedHospital.website}
                      </a>
                    </div>
                  )}
                </div>

                {selectedHospital.accredited_specialties?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Specialties</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedHospital.accredited_specialties.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedHospital.supported_languages || []).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Consultation Languages</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedHospital.supported_languages || []).map(l => (
                        <Badge key={l} variant="outline" className="text-xs">{l}</Badge>
                      ))}
                    </div>
                  </div>
                )}

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

                {/* Affiliated Doctors */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Affiliated Doctors</p>
                  {loadingDoctors ? (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  ) : doctors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No doctors listed yet</p>
                  ) : (
                    <div className="space-y-2">
                      {doctors.map(d => (
                        <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border/70 bg-white/60 p-3 transition hover:border-primary/30 hover:bg-white/80">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Stethoscope className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{d.doctor_name}</p>
                            <p className="text-xs text-muted-foreground">{d.specialty || 'General Practice'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
