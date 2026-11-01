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
    <div className="min-h-screen" style={{ background: 'var(--gradient-telemedx-hero)' }}>
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/telemed-x')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-telemedx)' }}>
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Hospital Directory</h1>
                <p className="text-xs text-white/50">Browse verified healthcare institutions</p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => navigate('/telemed-x/hospital-onboarding')}>
            <Building2 className="h-4 w-4 mr-2" />
            Register Your Hospital
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input placeholder="Search hospitals, cities, or specialties..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40" />
          </div>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            <Input placeholder="Insurance..."
              value={insuranceFilter} onChange={(e) => setInsuranceFilter(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40" />
          </div>
          <div>
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}
              className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3 text-sm">
              <option value="" className="bg-slate-900">All Locations</option>
              {allStates.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
            </select>
          </div>
          <div>
            <select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3 text-sm">
              <option value="" className="bg-slate-900">All Specialties</option>
              {allSpecialties.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
            </select>
          </div>
          <div>
            <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3 text-sm">
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
          <div className="text-center py-20">
            <Building2 className="h-12 w-12 mx-auto text-white/20 mb-4" />
            <p className="text-white/50">No hospitals match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(hospital => (
              <Card key={hospital.id}
                className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => openHospital(hospital)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
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
                        <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border">
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
