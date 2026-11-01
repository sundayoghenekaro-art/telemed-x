import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  Shield, LogOut, Loader2, Plus, Heart, AlertTriangle, Crosshair, Building2,
  Users, Radio, Ambulance, FileText, MapPin, Activity, ChevronRight, Search,
  Plane, Truck, Anchor, User, Clock, CheckCircle2, XCircle,
} from 'lucide-react';

interface DefenseFacility {
  id: string;
  name: string;
  type: string;
  branch: string;
  region: string | null;
  command_level: string | null;
  parent_facility_id: string | null;
  status: string;
}

interface DefenseStaffProfile {
  id: string;
  user_id: string;
  facility_id: string;
  full_name: string;
  rank: string | null;
  role: string;
  specialty: string | null;
  security_clearance: string;
  deployment_status: string;
}

interface DefensePersonnel {
  id: string;
  service_number: string;
  full_name: string;
  rank: string | null;
  branch: string;
  unit: string | null;
  deployment_status: string;
  security_clearance: string;
  facility_id: string | null;
  blood_type: string | null;
  allergies: string | null;
  date_of_birth: string | null;
}

interface FamilyMember {
  id: string;
  personnel_id: string;
  full_name: string;
  relationship: string;
  date_of_birth: string | null;
  blood_type: string | null;
  allergies: string | null;
  notes: string | null;
}

interface MedicalRecord {
  id: string;
  personnel_id: string;
  facility_id: string | null;
  record_type: string;
  diagnosis: string | null;
  treatment: string | null;
  medications: string | null;
  notes: string | null;
  classification: string;
  is_field_record: boolean;
  field_location: string | null;
  record_date: string;
}

interface FieldConsultation {
  id: string;
  personnel_id: string;
  requesting_facility_id: string;
  supporting_facility_id: string | null;
  chief_complaint: string;
  consultation_type: string;
  status: string;
  priority: string;
  field_location: string | null;
  field_conditions: string | null;
  specialist_notes: string | null;
  recommendations: string | null;
  created_at: string;
}

interface TriageReferral {
  id: string;
  personnel_id: string;
  from_facility_id: string;
  to_facility_id: string;
  reason: string;
  clinical_summary: string | null;
  urgency: string;
  transport_mode: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const FACILITY_TYPE_ICON: Record<string, typeof Building2> = {
  tertiary: Building2,
  secondary: Building2,
  primary: Crosshair,
};

const BRANCH_ICON: Record<string, typeof Shield> = {
  army: Shield,
  navy: Anchor,
  airforce: Plane,
  joint: Shield,
};

const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
  immediate: { color: 'text-red-600 bg-red-500/10 border-red-500/30', label: 'IMMEDIATE' },
  priority: { color: 'text-amber-600 bg-amber-500/10 border-amber-500/30', label: 'PRIORITY' },
  routine: { color: 'text-blue-600 bg-blue-500/10 border-blue-500/30', label: 'ROUTINE' },
  emergency: { color: 'text-red-600 bg-red-500/10 border-red-500/30', label: 'EMERGENCY' },
  urgent: { color: 'text-amber-600 bg-amber-500/10 border-amber-500/30', label: 'URGENT' },
};

const TRANSPORT_ICON: Record<string, typeof Truck> = {
  ground: Truck,
  air: Plane,
  sea: Anchor,
  self: User,
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  unclassified: 'text-green-600 bg-green-500/10 border-green-500/30',
  restricted: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
  confidential: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  secret: 'text-red-600 bg-red-500/10 border-red-500/30',
};

const DEPLOYMENT_COLORS: Record<string, string> = {
  active: 'text-green-600 bg-green-500/10 border-green-500/30',
  deployed: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  reserve: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
  retired: 'text-muted-foreground bg-muted',
  wia: 'text-red-600 bg-red-500/10 border-red-500/30',
  kia: 'text-red-900 bg-red-900/10 border-red-900/30',
};

export function DefenseHealthPortal({
  staff,
  facility,
  onLogout,
}: {
  staff: DefenseStaffProfile;
  facility: DefenseFacility;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState('command');
  const [loading, setLoading] = useState(true);

  // Data
  const [facilities, setFacilities] = useState<DefenseFacility[]>([]);
  const [personnel, setPersonnel] = useState<DefensePersonnel[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [consultations, setConsultations] = useState<FieldConsultation[]>([]);
  const [referrals, setTriageReferrals] = useState<TriageReferral[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<DefensePersonnel | null>(null);

  // Dialogs
  const [showAddPersonnel, setShowAddPersonnel] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showNewConsult, setShowNewConsult] = useState(false);
  const [showNewReferral, setShowNewReferral] = useState(false);
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [showLinkFamily, setShowLinkFamily] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [facRes, persRes, consRes, refRes] = await Promise.all([
      supabase.from('defense_facilities').select('*').order('name'),
      supabase.from('defense_personnel').select('*').order('full_name'),
      supabase.from('defense_field_consultations').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('defense_triage_referrals').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (facRes.data) setFacilities(facRes.data as DefenseFacility[]);
    if (persRes.data) setPersonnel(persRes.data as DefensePersonnel[]);
    if (consRes.data) setConsultations(consRes.data as FieldConsultation[]);
    if (refRes.data) setTriageReferrals(refRes.data as TriageReferral[]);
    setLoading(false);
  };

  const fetchPersonnelRecords = async (personnelId: string) => {
    const { data } = await supabase
      .from('defense_medical_records')
      .select('*')
      .eq('personnel_id', personnelId)
      .order('record_date', { ascending: false });
    if (data) setRecords(data as MedicalRecord[]);
  };

  const fetchFamilyMembers = async (personnelId: string) => {
    const { data } = await supabase
      .from('defense_family_members')
      .select('*')
      .eq('personnel_id', personnelId)
      .order('full_name');
    if (data) setFamilyMembers(data as FamilyMember[]);
  };

  const openPersonnel = (p: DefensePersonnel) => {
    setSelectedPersonnel(p);
    fetchPersonnelRecords(p.id);
    fetchFamilyMembers(p.id);
    setTab('records');
  };

  // Stats
  const activeConsultations = consultations.filter(c => c.status === 'pending' || c.status === 'active');
  const pendingReferrals = referrals.filter(r => r.status === 'pending');
  const deployedPersonnel = personnel.filter(p => p.deployment_status === 'deployed');
  const wiaPersonnel = personnel.filter(p => p.deployment_status === 'wia');
  const tertiaryFacilities = facilities.filter(f => f.type === 'tertiary');
  const secondaryFacilities = facilities.filter(f => f.type === 'secondary');
  const primaryFacilities = facilities.filter(f => f.type === 'primary');

  const filteredPersonnel = personnel.filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.service_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.unit?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const facilityName = (id: string | null) => facilities.find(f => f.id === id)?.name || 'Unknown';
  const personnelName = (id: string) => personnel.find(p => p.id === id)?.full_name || 'Unknown';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-20 border-b border-sidebar-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">Defense Health Network</p>
              <p className="text-xs text-sidebar-foreground/60">
                {facility.name} • {staff.rank || ''} {staff.full_name} • {staff.role.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sidebar-foreground border-sidebar-foreground/30 text-xs">
              Clearance: {staff.security_clearance}
            </Badge>
            <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-6">
            <TabsTrigger value="command" className="flex items-center gap-1 text-xs sm:text-sm"><Activity className="h-4 w-4" /> Command</TabsTrigger>
            <TabsTrigger value="facilities" className="flex items-center gap-1 text-xs sm:text-sm"><Building2 className="h-4 w-4" /> Facilities</TabsTrigger>
            <TabsTrigger value="personnel" className="flex items-center gap-1 text-xs sm:text-sm"><Users className="h-4 w-4" /> Personnel</TabsTrigger>
            <TabsTrigger value="consult" className="flex items-center gap-1 text-xs sm:text-sm"><Radio className="h-4 w-4" /> Field Consult</TabsTrigger>
            <TabsTrigger value="triage" className="flex items-center gap-1 text-xs sm:text-sm"><Ambulance className="h-4 w-4" /> Triage</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* COMMAND DASHBOARD */}
              <TabsContent value="command" className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Command Overview
                </h2>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Facilities</span>
                      </div>
                      <p className="text-2xl font-bold">{facilities.length}</p>
                      <p className="text-xs text-muted-foreground">{tertiaryFacilities.length} tertiary • {secondaryFacilities.length} secondary • {primaryFacilities.length} primary</p>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-amber-600" />
                        <span className="text-xs text-muted-foreground">Deployed</span>
                      </div>
                      <p className="text-2xl font-bold">{deployedPersonnel.length}</p>
                      <p className="text-xs text-muted-foreground">{personnel.length} total personnel</p>
                    </CardContent>
                  </Card>
                  <Card className={activeConsultations.length > 0 ? 'border-destructive/30' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Radio className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Active Consults</span>
                      </div>
                      <p className="text-2xl font-bold">{activeConsultations.length}</p>
                      <p className="text-xs text-muted-foreground">{consultations.length} total</p>
                    </CardContent>
                  </Card>
                  <Card className={pendingReferrals.length > 0 ? 'border-destructive/30' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Ambulance className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Pending Transfers</span>
                      </div>
                      <p className="text-2xl font-bold">{pendingReferrals.length}</p>
                      <p className="text-xs text-muted-foreground">{referrals.length} total referrals</p>
                    </CardContent>
                  </Card>
                </div>

                {/* WIA Alert */}
                {wiaPersonnel.length > 0 && (
                  <Card className="border-destructive/40 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" /> Wounded in Action ({wiaPersonnel.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {wiaPersonnel.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-destructive/20">
                          <div>
                            <p className="font-medium text-sm">{p.rank || ''} {p.full_name}</p>
                            <p className="text-xs text-muted-foreground">{p.service_number} • {p.branch} • {p.unit || 'N/A'}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openPersonnel(p)}>
                            View Record <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Active Consultations */}
                {activeConsultations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Radio className="h-5 w-5 text-primary" /> Active Field Consultations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {activeConsultations.slice(0, 5).map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">{personnelName(c.personnel_id)}</p>
                            <p className="text-xs text-muted-foreground">{c.chief_complaint}</p>
                            <p className="text-xs text-muted-foreground">
                              From {facilityName(c.requesting_facility_id)} • {c.consultation_type}
                              {c.field_location && ` • ${c.field_location}`}
                            </p>
                          </div>
                          <Badge variant="outline" className={URGENCY_CONFIG[c.priority]?.color}>
                            {URGENCY_CONFIG[c.priority]?.label || c.priority}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Pending Referrals */}
                {pendingReferrals.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Ambulance className="h-5 w-5 text-primary" /> Pending Inter-Facility Transfers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {pendingReferrals.slice(0, 5).map(r => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">{personnelName(r.personnel_id)}</p>
                            <p className="text-xs text-muted-foreground">{r.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              {facilityName(r.from_facility_id)} → {facilityName(r.to_facility_id)} • {r.transport_mode}
                            </p>
                          </div>
                          <Badge variant="outline" className={URGENCY_CONFIG[r.urgency]?.color}>
                            {URGENCY_CONFIG[r.urgency]?.label || r.urgency}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* FACILITIES */}
              <TabsContent value="facilities" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" /> Facility Network
                  </h2>
                  <AddFacilityDialog onSaved={fetchAll} />
                </div>

                {/* Tertiary */}
                {tertiaryFacilities.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-primary flex items-center gap-1">
                      <Building2 className="h-4 w-4" /> Tertiary Command Hospitals
                    </h3>
                    {tertiaryFacilities.map(f => <FacilityCard key={f.id} facility={f} facilities={facilities} />)}
                  </div>
                )}

                {/* Secondary */}
                {secondaryFacilities.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-accent-foreground flex items-center gap-1">
                      <Building2 className="h-4 w-4" /> Secondary Regional Hospitals
                    </h3>
                    {secondaryFacilities.map(f => <FacilityCard key={f.id} facility={f} facilities={facilities} />)}
                  </div>
                )}

                {/* Primary */}
                {primaryFacilities.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                      <Crosshair className="h-4 w-4" /> Primary Field Clinics
                    </h3>
                    {primaryFacilities.map(f => <FacilityCard key={f.id} facility={f} facilities={facilities} />)}
                  </div>
                )}

                {facilities.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                      <Building2 className="h-12 w-12 mx-auto opacity-50" />
                      <p className="font-medium">No facilities registered</p>
                      <p className="text-sm">Add your first military medical facility to start building the network</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* PERSONNEL */}
              <TabsContent value="personnel" className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Personnel Records
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, service #, unit..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <AddPersonnelDialog
                      facilityId={facility.id}
                      staffId={staff.id}
                      onSaved={fetchAll}
                    />
                  </div>
                </div>

                {filteredPersonnel.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                      <Users className="h-12 w-12 mx-auto opacity-50" />
                      <p className="font-medium">{personnel.length === 0 ? 'No personnel registered' : 'No matches found'}</p>
                      <p className="text-sm">{personnel.length === 0 ? 'Register service members to manage their health records' : 'Try a different search term'}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredPersonnel.map(p => {
                      const BranchIcon = BRANCH_ICON[p.branch] || Shield;
                      return (
                        <Card key={p.id} className="hover:border-primary/30 transition-all cursor-pointer" onClick={() => openPersonnel(p)}>
                          <CardContent className="pt-3 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <BranchIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{p.rank || ''} {p.full_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{p.service_number} • {p.branch} • {p.unit || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {p.blood_type && <Badge variant="outline" className="text-xs">{p.blood_type}</Badge>}
                              <Badge variant="outline" className={`text-xs ${DEPLOYMENT_COLORS[p.deployment_status] || ''}`}>
                                {p.deployment_status.toUpperCase()}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* PERSONNEL RECORDS (shown when a personnel is selected) */}
              {selectedPersonnel && tab === 'records' && (
                <TabsContent value="records" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedPersonnel(null); setTab('personnel'); }} className="mb-2">
                        ← Back to Personnel
                      </Button>
                      <h2 className="text-xl font-bold">
                        {selectedPersonnel.rank || ''} {selectedPersonnel.full_name}
                      </h2>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedPersonnel.service_number} • {selectedPersonnel.branch} • {selectedPersonnel.unit || 'N/A'}
                      </p>
                    </div>
                    <AddRecordDialog
                      personnelId={selectedPersonnel.id}
                      facilityId={facility.id}
                      staffId={staff.id}
                      onSaved={() => fetchPersonnelRecords(selectedPersonnel.id)}
                    />
                    <LinkFamilyDialog
                      personnelId={selectedPersonnel.id}
                      staffId={staff.id}
                      onSaved={() => fetchFamilyMembers(selectedPersonnel.id)}
                    />
                  </div>

                  {/* Personnel info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedPersonnel.blood_type && (
                      <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Blood Type</p><p className="font-bold">{selectedPersonnel.blood_type}</p></CardContent></Card>
                    )}
                    {selectedPersonnel.allergies && (
                      <Card className="border-destructive/30"><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Allergies</p><p className="font-bold text-destructive text-sm">{selectedPersonnel.allergies}</p></CardContent></Card>
                    )}
                    <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Clearance</p><p className="font-bold capitalize">{selectedPersonnel.security_clearance}</p></CardContent></Card>
                    <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={DEPLOYMENT_COLORS[selectedPersonnel.deployment_status]}>{selectedPersonnel.deployment_status.toUpperCase()}</Badge></CardContent></Card>
                  </div>

                  {/* Medical Records */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Medical History</h3>
                    {records.length === 0 ? (
                      <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No medical records on file</CardContent></Card>
                    ) : (
                      records.map(rec => (
                        <Card key={rec.id} className={rec.is_field_record ? 'border-amber-500/30' : ''}>
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs capitalize">{rec.record_type.replace('_', ' ')}</Badge>
                                {rec.is_field_record && (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30 bg-amber-500/10">
                                    <MapPin className="h-3 w-3 mr-1" /> Field Record
                                  </Badge>
                                )}
                                <Badge variant="outline" className={`text-xs ${CLASSIFICATION_COLORS[rec.classification] || ''}`}>
                                  {rec.classification}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">{format(parseISO(rec.record_date), 'MMM d, yyyy')}</span>
                            </div>
                            {rec.diagnosis && <p className="text-sm font-medium">{rec.diagnosis}</p>}
                            {rec.treatment && <p className="text-xs text-muted-foreground mt-1">Treatment: {rec.treatment}</p>}
                            {rec.medications && <p className="text-xs text-muted-foreground">Medications: {rec.medications}</p>}
                            {rec.notes && <p className="text-xs text-muted-foreground">Notes: {rec.notes}</p>}
                            {rec.field_location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {rec.field_location}</p>}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                  {/* Family Members */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Linked Family Members</h3>
                    {familyMembers.length === 0 ? (
                      <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">No family members linked yet. Use "Link Family" to add a spouse, child, or dependent.</CardContent></Card>
                    ) : (
                      familyMembers.map(fam => (
                        <Card key={fam.id}>
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10"><Heart className="h-4 w-4 text-primary" /></div>
                                <div>
                                  <p className="font-medium text-sm">{fam.full_name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{fam.relationship}{fam.date_of_birth && ` • DOB: ${format(parseISO(fam.date_of_birth), 'MMM d, yyyy')}`}</p>
                                  {fam.allergies && <p className="text-xs text-destructive mt-0.5">Allergies: {fam.allergies}</p>}
                                  {fam.blood_type && <p className="text-xs text-muted-foreground mt-0.5">Blood: {fam.blood_type}</p>}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">Linked</Badge>
                            </div>
                            {fam.notes && <p className="text-xs text-muted-foreground mt-2">{fam.notes}</p>}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              )}

              {/* FIELD CONSULTATIONS */}
              <TabsContent value="consult" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Radio className="h-5 w-5 text-primary" /> Field Consultations
                  </h2>
                  <NewConsultDialog
                    facilityId={facility.id}
                    staffId={staff.id}
                    facilities={facilities}
                    personnel={personnel}
                    onSaved={fetchAll}
                  />
                </div>

                {consultations.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                      <Radio className="h-12 w-12 mx-auto opacity-50" />
                      <p className="font-medium">No consultations yet</p>
                      <p className="text-sm">Initiate a field consultation to connect field medics with hospital specialists</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {consultations.map(c => (
                      <Card key={c.id} className={c.status === 'active' || c.status === 'pending' ? 'border-primary/30' : ''}>
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <p className="font-medium text-sm">{personnelName(c.personnel_id)}</p>
                              <p className="text-xs text-muted-foreground">{c.chief_complaint}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {facilityName(c.requesting_facility_id)}
                                {c.supporting_facility_id && ` → ${facilityName(c.supporting_facility_id)}`}
                                {' • '}{c.consultation_type}
                              </p>
                              {c.field_location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" /> {c.field_location}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className={URGENCY_CONFIG[c.priority]?.color}>
                                {URGENCY_CONFIG[c.priority]?.label || c.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-xs capitalize">{c.status}</Badge>
                            </div>
                          </div>
                          {c.specialist_notes && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground">Specialist Notes</p>
                              <p className="text-sm">{c.specialist_notes}</p>
                            </div>
                          )}
                          {c.recommendations && (
                            <p className="text-xs text-muted-foreground mt-1">Recommendations: {c.recommendations}</p>
                          )}
                          {(c.status === 'pending' || c.status === 'active') && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const notes = prompt('Enter specialist notes:');
                                  if (!notes) return;
                                  await supabase.from('defense_field_consultations').update({
                                    status: 'completed',
                                    specialist_notes: notes,
                                    supporting_staff_id: staff.id,
                                    supporting_facility_id: facility.id,
                                    updated_at: new Date().toISOString(),
                                  }).eq('id', c.id);
                                  toast.success('Consultation completed');
                                  fetchAll();
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Respond & Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  await supabase.from('defense_field_consultations').update({ status: 'cancelled' }).eq('id', c.id);
                                  toast.info('Consultation cancelled');
                                  fetchAll();
                                }}
                              >
                                <XCircle className="h-3 w-3 mr-1" /> Cancel
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* INTER-FACILITY TRIAGE */}
              <TabsContent value="triage" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Ambulance className="h-5 w-5 text-primary" /> Inter-Facility Triage
                  </h2>
                  <NewReferralDialog
                    facilityId={facility.id}
                    staffId={staff.id}
                    facilities={facilities}
                    personnel={personnel}
                    onSaved={fetchAll}
                  />
                </div>

                {referrals.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                      <Ambulance className="h-12 w-12 mx-auto opacity-50" />
                      <p className="font-medium">No triage referrals</p>
                      <p className="text-sm">Create an inter-facility transfer to route patients between military medical facilities</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {referrals.map(r => {
                      const TransportIcon = TRANSPORT_ICON[r.transport_mode] || Truck;
                      return (
                        <Card key={r.id} className={r.status === 'pending' ? 'border-amber-500/30' : ''}>
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <p className="font-medium text-sm">{personnelName(r.personnel_id)}</p>
                                <p className="text-xs text-muted-foreground">{r.reason}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{facilityName(r.from_facility_id)}</span>
                                  <TransportIcon className="h-3 w-3" />
                                  <span>{facilityName(r.to_facility_id)}</span>
                                </div>
                                {r.clinical_summary && <p className="text-xs text-muted-foreground mt-1">{r.clinical_summary}</p>}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className={URGENCY_CONFIG[r.urgency]?.color}>
                                  {URGENCY_CONFIG[r.urgency]?.label || r.urgency}
                                </Badge>
                                <Badge variant="secondary" className="text-xs capitalize">{r.status.replace('_', ' ')}</Badge>
                              </div>
                            </div>
                            {r.status === 'pending' && (
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await supabase.from('defense_triage_referrals').update({
                                      status: 'accepted',
                                      accepted_by: staff.id,
                                      accepted_at: new Date().toISOString(),
                                    }).eq('id', r.id);
                                    toast.success('Transfer accepted');
                                    fetchAll();
                                  }}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Accept Transfer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    await supabase.from('defense_triage_referrals').update({ status: 'rejected' }).eq('id', r.id);
                                    toast.info('Transfer rejected');
                                    fetchAll();
                                  }}
                                >
                                  <XCircle className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                            {r.status === 'accepted' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={async () => {
                                  await supabase.from('defense_triage_referrals').update({ status: 'in_transit' }).eq('id', r.id);
                                  toast.success('Marked as in transit');
                                  fetchAll();
                                }}
                              >
                                <Truck className="h-3 w-3 mr-1" /> Mark In Transit
                              </Button>
                            )}
                            {r.status === 'in_transit' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={async () => {
                                  await supabase.from('defense_triage_referrals').update({ status: 'arrived' }).eq('id', r.id);
                                  toast.success('Patient arrival confirmed');
                                  fetchAll();
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm Arrival
                              </Button>
                            )}
                            {r.status === 'arrived' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={async () => {
                                  await supabase.from('defense_triage_referrals').update({ status: 'completed' }).eq('id', r.id);
                                  toast.success('Transfer completed');
                                  fetchAll();
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Complete Transfer
                              </Button>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {format(parseISO(r.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function FacilityCard({ facility, facilities }: { facility: DefenseFacility; facilities: DefenseFacility[] }) {
  const Icon = FACILITY_TYPE_ICON[facility.type] || Building2;
  const BranchIcon = BRANCH_ICON[facility.branch] || Shield;
  const parent = facilities.find(f => f.id === facility.parent_facility_id);
  return (
    <Card>
      <CardContent className="pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{facility.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BranchIcon className="h-3 w-3" /> {facility.branch} • {facility.type}
              {facility.region && ` • ${facility.region}`}
              {parent && ` • reports to ${parent.name}`}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs capitalize">{facility.status}</Badge>
      </CardContent>
    </Card>
  );
}

function AddFacilityDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('primary');
  const [branch, setBranch] = useState('joint');
  const [region, setRegion] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [facilities, setFacilities] = useState<DefenseFacility[]>([]);

  useEffect(() => {
    if (open) {
      supabase.from('defense_facilities').select('*').order('name').then(({ data }) => {
        if (data) setFacilities(data as DefenseFacility[]);
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Facility name is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('defense_facilities').insert({
      name,
      type,
      branch,
      region: region || null,
      parent_facility_id: parentId || null,
      status: 'active',
    });
    if (error) { toast.error('Could not add facility'); setSaving(false); return; }
    toast.success('Facility added');
    setOpen(false);
    setName(''); setRegion(''); setParentId('');
    onSaved();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Facility</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Military Medical Facility</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Field Hospital Alpha" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tertiary">Tertiary (Command Hospital)</SelectItem>
                  <SelectItem value="secondary">Secondary (Regional)</SelectItem>
                  <SelectItem value="primary">Primary (Field Clinic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Branch</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="joint">Joint</SelectItem>
                  <SelectItem value="army">Army</SelectItem>
                  <SelectItem value="navy">Navy</SelectItem>
                  <SelectItem value="airforce">Air Force</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Region</Label><Input value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. Northern Command" /></div>
          <div><Label>Reports To (Parent Facility)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.type})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add Facility
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddPersonnelDialog({ facilityId, onSaved }: { facilityId: string; staffId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [serviceNumber, setServiceNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [rank, setRank] = useState('');
  const [branch, setBranch] = useState('army');
  const [unit, setUnit] = useState('');
  const [deploymentStatus, setDeploymentStatus] = useState('active');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!serviceNumber.trim() || !fullName.trim()) { toast.error('Service number and name are required'); return; }
    setSaving(true);
    const { error } = await supabase.from('defense_personnel').insert({
      service_number: serviceNumber,
      full_name: fullName,
      rank: rank || null,
      branch,
      unit: unit || null,
      deployment_status: deploymentStatus,
      security_clearance: 'restricted',
      facility_id: facilityId,
      blood_type: bloodType || null,
      allergies: allergies || null,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'Service number already exists' : 'Could not add personnel');
      setSaving(false);
      return;
    }
    toast.success('Personnel registered');
    setOpen(false);
    setServiceNumber(''); setFullName(''); setRank(''); setUnit(''); setBloodType(''); setAllergies('');
    onSaved();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Register Personnel</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Register Military Personnel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Service Number *</Label><Input value={serviceNumber} onChange={e => setServiceNumber(e.target.value)} placeholder="e.g. ARM-001234" /></div>
            <div><Label>Rank</Label><Input value={rank} onChange={e => setRank(e.target.value)} placeholder="e.g. Sergeant" /></div>
          </div>
          <div><Label>Full Name *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Last, First MI" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Branch</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="army">Army</SelectItem>
                  <SelectItem value="navy">Navy</SelectItem>
                  <SelectItem value="airforce">Air Force</SelectItem>
                  <SelectItem value="joint">Joint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Unit</Label><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. 3rd Battalion" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Deployment Status</Label>
              <Select value={deploymentStatus} onValueChange={setDeploymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="reserve">Reserve</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="wia">Wounded in Action</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Blood Type</Label>
              <Select value={bloodType} onValueChange={setBloodType}>
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
          <div><Label>Allergies</Label><Input value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Penicillin" /></div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Register
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddRecordDialog({ personnelId, facilityId, staffId, onSaved }: { personnelId: string; facilityId: string; staffId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [recordType, setRecordType] = useState('encounter');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [medications, setMedications] = useState('');
  const [notes, setNotes] = useState('');
  const [classification, setClassification] = useState('restricted');
  const [isFieldRecord, setIsFieldRecord] = useState(false);
  const [fieldLocation, setFieldLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!diagnosis.trim()) { toast.error('Diagnosis is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('defense_medical_records').insert({
      personnel_id: personnelId,
      facility_id: facilityId,
      record_type: recordType,
      diagnosis,
      treatment: treatment || null,
      medications: medications || null,
      notes: notes || null,
      classification,
      attending_staff_id: staffId,
      is_field_record: isFieldRecord,
      field_location: isFieldRecord ? (fieldLocation || null) : null,
      record_date: new Date().toISOString(),
    });
    if (error) { toast.error('Could not save record'); setSaving(false); return; }
    toast.success('Medical record added');
    setOpen(false);
    setDiagnosis(''); setTreatment(''); setMedications(''); setNotes(''); setFieldLocation(''); setIsFieldRecord(false);
    onSaved();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Record</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Medical Record</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Record Type</Label>
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="encounter">Encounter</SelectItem>
                <SelectItem value="injury">Injury</SelectItem>
                <SelectItem value="vaccination">Vaccination</SelectItem>
                <SelectItem value="physical">Physical Exam</SelectItem>
                <SelectItem value="mental_health">Mental Health</SelectItem>
                <SelectItem value="deployment_health">Deployment Health</SelectItem>
                <SelectItem value="field_report">Field Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Diagnosis *</Label><Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></div>
          <div><Label>Treatment</Label><Input value={treatment} onChange={e => setTreatment(e.target.value)} /></div>
          <div><Label>Medications</Label><Input value={medications} onChange={e => setMedications(e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
          <div><Label>Classification</Label>
            <Select value={classification} onValueChange={setClassification}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unclassified">Unclassified</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="confidential">Confidential</SelectItem>
                <SelectItem value="secret">Secret</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="field-record" checked={isFieldRecord} onChange={e => setIsFieldRecord(e.target.checked)} className="rounded" />
            <Label htmlFor="field-record" className="text-sm cursor-pointer">Recorded in field conditions</Label>
          </div>
          {isFieldRecord && (
            <div><Label>Field Location</Label><Input value={fieldLocation} onChange={e => setFieldLocation(e.target.value)} placeholder="GPS coordinates or description" /></div>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Save Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewConsultDialog({
  facilityId, staffId, facilities, personnel, onSaved,
}: {
  facilityId: string; staffId: string; facilities: DefenseFacility[]; personnel: DefensePersonnel[]; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [personnelId, setPersonnelId] = useState('');
  const [supportingFacilityId, setSupportingFacilityId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [consultationType, setConsultationType] = useState('chat');
  const [priority, setPriority] = useState('routine');
  const [fieldLocation, setFieldLocation] = useState('');
  const [fieldConditions, setFieldConditions] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!personnelId || !chiefComplaint.trim()) { toast.error('Select personnel and enter complaint'); return; }
    setSaving(true);
    const { error } = await supabase.from('defense_field_consultations').insert({
      personnel_id: personnelId,
      requesting_facility_id: facilityId,
      supporting_facility_id: supportingFacilityId || null,
      requesting_staff_id: staffId,
      chief_complaint: chiefComplaint,
      consultation_type: consultationType,
      status: 'pending',
      priority,
      field_location: fieldLocation || null,
      field_conditions: fieldConditions || null,
    });
    if (error) { toast.error('Could not create consultation'); setSaving(false); return; }
    toast.success('Field consultation initiated');
    setOpen(false);
    setPersonnelId(''); setSupportingFacilityId(''); setChiefComplaint(''); setFieldLocation(''); setFieldConditions('');
    onSaved();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Consultation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Initiate Field Consultation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Personnel *</Label>
            <Select value={personnelId} onValueChange={setPersonnelId}>
              <SelectTrigger><SelectValue placeholder="Select service member" /></SelectTrigger>
              <SelectContent>
                {personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.rank || ''} {p.full_name} ({p.service_number})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Requesting Support From</Label>
            <Select value={supportingFacilityId} onValueChange={setSupportingFacilityId}>
              <SelectTrigger><SelectValue placeholder="Any available facility" /></SelectTrigger>
              <SelectContent>
                {facilities.filter(f => f.id !== facilityId).map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.type})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Chief Complaint *</Label><Textarea value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <Select value={consultationType} onValueChange={setConsultationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="radio">Radio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Field Location</Label><Input value={fieldLocation} onChange={e => setFieldLocation(e.target.value)} placeholder="GPS or description" /></div>
          <div><Label>Field Conditions</Label><Textarea value={fieldConditions} onChange={e => setFieldConditions(e.target.value)} rows={2} placeholder="e.g. Under fire, limited supplies" /></div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radio className="h-4 w-4 mr-2" />} Initiate Consultation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewReferralDialog({
  facilityId, staffId, facilities, personnel, onSaved,
}: {
  facilityId: string; staffId: string; facilities: DefenseFacility[]; personnel: DefensePersonnel[]; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [personnelId, setPersonnelId] = useState('');
  const [toFacilityId, setToFacilityId] = useState('');
  const [reason, setReason] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [urgency, setUrgency] = useState('routine');
  const [transportMode, setTransportMode] = useState('ground');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!personnelId || !toFacilityId || !reason.trim()) { toast.error('Fill required fields'); return; }
    setSaving(true);
    const { error } = await supabase.from('defense_triage_referrals').insert({
      personnel_id: personnelId,
      from_facility_id: facilityId,
      to_facility_id: toFacilityId,
      referring_staff_id: staffId,
      reason,
      clinical_summary: clinicalSummary || null,
      urgency,
      transport_mode: transportMode,
      status: 'pending',
    });
    if (error) { toast.error('Could not create referral'); setSaving(false); return; }
    toast.success('Triage referral created');
    setOpen(false);
    setPersonnelId(''); setToFacilityId(''); setReason(''); setClinicalSummary('');
    onSaved();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Transfer</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Inter-Facility Triage Transfer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Personnel *</Label>
            <Select value={personnelId} onValueChange={setPersonnelId}>
              <SelectTrigger><SelectValue placeholder="Select service member" /></SelectTrigger>
              <SelectContent>
                {personnel.map(p => <SelectItem key={p.id} value={p.id}>{p.rank || ''} {p.full_name} ({p.service_number})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Transfer To *</Label>
            <Select value={toFacilityId} onValueChange={setToFacilityId}>
              <SelectTrigger><SelectValue placeholder="Select receiving facility" /></SelectTrigger>
              <SelectContent>
                {facilities.filter(f => f.id !== facilityId).map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.type})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Reason *</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Requires neurosurgery" /></div>
          <div><Label>Clinical Summary</Label><Textarea value={clinicalSummary} onChange={e => setClinicalSummary(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Transport</Label>
              <Select value={transportMode} onValueChange={setTransportMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ground">Ground</SelectItem>
                  <SelectItem value="air">Air</SelectItem>
                  <SelectItem value="sea">Sea</SelectItem>
                  <SelectItem value="self">Self</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ambulance className="h-4 w-4 mr-2" />} Create Transfer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkFamilyDialog({ personnelId, staffId, onSaved }: { personnelId: string; staffId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('spouse');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) { toast.error('Family member name is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('defense_family_members').insert({
      personnel_id: personnelId,
      full_name: fullName,
      relationship,
      date_of_birth: dateOfBirth || null,
      blood_type: bloodType || null,
      allergies: allergies || null,
      notes: notes || null,
      created_by_staff_id: staffId,
    });
    if (error) { toast.error('Could not link family member'); setSaving(false); return; }
    toast.success('Family member linked');
    setOpen(false);
    setFullName(''); setDateOfBirth(''); setBloodType(''); setAllergies(''); setNotes('');
    onSaved();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Heart className="h-4 w-4 mr-1" /> Link Family</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Link Family Member</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Add a family member to this service member's record. The family member can then sign up using the service member's defense ID number.</p>
        <div className="space-y-3">
          <div><Label>Full Name *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Family member's full name" /></div>
          <div><Label>Relationship *</Label>
            <Select value={relationship} onValueChange={setRelationship}>
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
            <div><Label>Date of Birth</Label><Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} /></div>
            <div><Label>Blood Type</Label>
              <Select value={bloodType} onValueChange={setBloodType}>
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
          <div><Label>Allergies</Label><Input value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Penicillin" /></div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Heart className="h-4 w-4 mr-2" />} Link Family Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
