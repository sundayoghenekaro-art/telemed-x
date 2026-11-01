import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  Shield, LogOut, Loader2, Star, Building2, Users, Radio, Activity,
  Search, Plane, Truck, Anchor, Crosshair, MapPin, Clock, Stethoscope,
  Hospital, AlertTriangle, ChevronRight,
} from 'lucide-react';

interface DefenseSuperAdmin {
  id: string;
  user_id: string;
  full_name: string;
  status: string;
}

interface DefenseFacility {
  id: string;
  name: string;
  type: string;
  branch: string;
  region: string | null;
  status: string;
}

interface DefenseStaff {
  id: string;
  user_id: string;
  facility_id: string;
  full_name: string;
  rank: string | null;
  role: string;
  specialty: string | null;
  security_clearance: string;
  deployment_status: string;
  status: string;
}

interface ConsultationAnalytics {
  consultation_id: string;
  chief_complaint: string;
  consultation_type: string;
  status: string;
  priority: string;
  field_location: string | null;
  created_at: string;
  personnel_name: string;
  service_number: string;
  personnel_rank: string | null;
  branch: string;
  unit: string | null;
  requesting_facility_name: string;
  requesting_facility_type: string;
  requesting_facility_region: string | null;
  supporting_facility_name: string | null;
  supporting_facility_type: string | null;
  supporting_facility_region: string | null;
  requesting_physician_name: string | null;
  requesting_physician_rank: string | null;
  requesting_physician_role: string | null;
  requesting_physician_specialty: string | null;
  supporting_physician_name: string | null;
  supporting_physician_rank: string | null;
  supporting_physician_role: string | null;
  supporting_physician_specialty: string | null;
}

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

const FACILITY_ICON: Record<string, typeof Building2> = {
  tertiary: Hospital,
  secondary: Building2,
  primary: Crosshair,
};

const ROLE_LABEL: Record<string, string> = {
  command_surgeon: 'Command Surgeon',
  specialist: 'Specialist',
  field_medic: 'Field Medic',
  nurse: 'Nurse',
  medical_officer: 'Medical Officer',
  administrator: 'Administrator',
};

export function DefenseSuperAdminDashboard({
  admin,
  onLogout,
}: {
  admin: DefenseSuperAdmin;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<DefenseFacility[]>([]);
  const [staff, setStaff] = useState<DefenseStaff[]>([]);
  const [consultations, setConsultations] = useState<ConsultationAnalytics[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [consSearch, setConsSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [facRes, staffRes, consRes] = await Promise.all([
      supabase.from('defense_facilities').select('*').order('name'),
      supabase.from('defense_medical_staff').select('*').eq('status', 'active').order('full_name'),
      supabase.from('defense_consultation_analytics').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    if (facRes.data) setFacilities(facRes.data as DefenseFacility[]);
    if (staffRes.data) setStaff(staffRes.data as DefenseStaff[]);
    if (consRes.data) setConsultations(consRes.data as ConsultationAnalytics[]);
    setLoading(false);
  };

  const facilityName = (id: string) => facilities.find(f => f.id === id)?.name || 'Unassigned';

  // Stats
  const activeStaff = staff.filter(s => s.deployment_status === 'active');
  const deployedStaff = staff.filter(s => s.deployment_status === 'deployed');
  const activeConsultations = consultations.filter(c => c.status === 'pending' || c.status === 'active');
  const completedConsultations = consultations.filter(c => c.status === 'completed');
  const tertiaryFacilities = facilities.filter(f => f.type === 'tertiary');
  const secondaryFacilities = facilities.filter(f => f.type === 'secondary');
  const primaryFacilities = facilities.filter(f => f.type === 'primary');
  const activeFacilities = facilities.filter(f => f.status === 'active');

  const filteredStaff = staff.filter(s =>
    s.full_name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    (s.specialty?.toLowerCase().includes(staffSearch.toLowerCase()) ?? false) ||
    s.role.toLowerCase().includes(staffSearch.toLowerCase()) ||
    facilityName(s.facility_id).toLowerCase().includes(staffSearch.toLowerCase())
  );

  const filteredConsultations = consultations.filter(c =>
    c.personnel_name?.toLowerCase().includes(consSearch.toLowerCase()) ||
    c.requesting_physician_name?.toLowerCase().includes(consSearch.toLowerCase()) ||
    c.supporting_physician_name?.toLowerCase().includes(consSearch.toLowerCase()) ||
    c.chief_complaint?.toLowerCase().includes(consSearch.toLowerCase()) ||
    c.requesting_facility_name?.toLowerCase().includes(consSearch.toLowerCase())
  );

  // Group staff by facility
  const staffByFacility = facilities.map(f => ({
    facility: f,
    members: staff.filter(s => s.facility_id === f.id),
  })).filter(g => g.members.length > 0);

  // Consultations by facility
  const consultationsByFacility = facilities.map(f => ({
    facility: f,
    count: consultations.filter(c =>
      c.requesting_facility_name === f.name || c.supporting_facility_name === f.name
    ).length,
  })).filter(g => g.count > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-hero)' }}>
        <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b" style={{ background: 'var(--gradient-hero)', borderColor: 'hsl(214 24% 27%)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <Star className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-sm text-sidebar-foreground">Defense Health Network — Super Admin</p>
              <p className="text-xs text-sidebar-foreground/60">{admin.full_name} • Network Oversight</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-xs">
              <Shield className="h-3 w-3 mr-1" /> Top Secret
            </Badge>
            <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm"><Activity className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="personnel" className="flex items-center gap-1 text-xs sm:text-sm"><Users className="h-4 w-4" /> Personnel</TabsTrigger>
            <TabsTrigger value="facilities" className="flex items-center gap-1 text-xs sm:text-sm"><Building2 className="h-4 w-4" /> Facilities</TabsTrigger>
            <TabsTrigger value="consultations" className="flex items-center gap-1 text-xs sm:text-sm"><Radio className="h-4 w-4" /> Consultations</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" /> Network Command Overview
            </h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-amber-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Active Facilities</span>
                  </div>
                  <p className="text-2xl font-bold">{activeFacilities.length}</p>
                  <p className="text-xs text-muted-foreground">{tertiaryFacilities.length} tertiary • {secondaryFacilities.length} secondary • {primaryFacilities.length} primary</p>
                </CardContent>
              </Card>
              <Card className="border-blue-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Medical Staff</span>
                  </div>
                  <p className="text-2xl font-bold">{staff.length}</p>
                  <p className="text-xs text-muted-foreground">{activeStaff.length} active • {deployedStaff.length} deployed</p>
                </CardContent>
              </Card>
              <Card className={activeConsultations.length > 0 ? 'border-destructive/30' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Radio className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Active Consults</span>
                  </div>
                  <p className="text-2xl font-bold">{activeConsultations.length}</p>
                  <p className="text-xs text-muted-foreground">{consultations.length} total • {completedConsultations.length} completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Consultation Types</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {new Set(consultations.map(c => c.consultation_type)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {consultations.filter(c => c.consultation_type === 'video').length} video • {consultations.filter(c => c.consultation_type === 'chat').length} chat • {consultations.filter(c => c.consultation_type === 'radio').length} radio
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Active Consultations Summary */}
            {activeConsultations.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" /> Active Field Consultations ({activeConsultations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeConsultations.slice(0, 5).map(c => (
                    <div key={c.consultation_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">
                          {c.personnel_rank || ''} {c.personnel_name}
                          <span className="text-muted-foreground font-normal ml-2">({c.service_number})</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{c.chief_complaint}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {c.requesting_facility_name}
                          {c.supporting_facility_name && ` → ${c.supporting_facility_name}`}
                        </p>
                        {c.requesting_physician_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <Stethoscope className="h-3 w-3 inline mr-1" />
                            Physician: {c.requesting_physician_rank || ''} {c.requesting_physician_name}
                            {c.supporting_physician_name && ` → ${c.supporting_physician_name}`}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={URGENCY_CONFIG[c.priority]?.color}>
                        {URGENCY_CONFIG[c.priority]?.label || c.priority}
                      </Badge>
                    </div>
                  ))}
                  {activeConsultations.length > 5 && (
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setTab('consultations')}>
                      View all {activeConsultations.length} consultations <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Consultations by Facility */}
            {consultationsByFacility.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hospital className="h-5 w-5 text-primary" /> Consultations by Facility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {consultationsByFacility.map(({ facility, count }) => {
                    const Icon = FACILITY_ICON[facility.type] || Building2;
                    return (
                      <div key={facility.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{facility.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{facility.type} • {facility.branch} • {facility.region || 'No region'}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-sm">{count} consultations</Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PERSONNEL */}
          <TabsContent value="personnel" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" /> Active Medical Personnel ({staff.length})
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, role, facility..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="pl-9 w-72"
                />
              </div>
            </div>

            {filteredStaff.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <Users className="h-12 w-12 mx-auto opacity-50" />
                  <p className="font-medium">No medical personnel found</p>
                  <p className="text-sm">{staff.length === 0 ? 'No staff registered in the network yet' : 'Try a different search term'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Staff grouped by facility */}
                {staffByFacility.map(({ facility, members }) => {
                  const Icon = FACILITY_ICON[facility.type] || Building2;
                  const BranchIcon = BRANCH_ICON[facility.branch] || Shield;
                  const filteredMembers = members.filter(s =>
                    s.full_name.toLowerCase().includes(staffSearch.toLowerCase()) ||
                    (s.specialty?.toLowerCase().includes(staffSearch.toLowerCase()) ?? false) ||
                    s.role.toLowerCase().includes(staffSearch.toLowerCase())
                  );
                  if (filteredMembers.length === 0) return null;
                  return (
                    <Card key={facility.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <CardTitle className="text-sm">{facility.name}</CardTitle>
                          <Badge variant="outline" className="text-xs capitalize">{facility.type}</Badge>
                          <BranchIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground capitalize">{facility.branch}</span>
                          {facility.region && <span className="text-xs text-muted-foreground">• {facility.region}</span>}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {filteredMembers.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-lg bg-amber-500/10">
                                <Stethoscope className="h-4 w-4 text-amber-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{s.rank || ''} {s.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {ROLE_LABEL[s.role] || s.role.replace('_', ' ')}
                                  {s.specialty && ` • ${s.specialty}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs capitalize">{s.security_clearance}</Badge>
                              <Badge variant="outline" className="text-xs capitalize">{s.deployment_status}</Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* FACILITIES */}
          <TabsContent value="facilities" className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500" /> Facility Network ({facilities.length})
            </h2>

            {['tertiary', 'secondary', 'primary'].map(type => {
              const typeFacilities = facilities.filter(f => f.type === type);
              if (typeFacilities.length === 0) return null;
              const Icon = FACILITY_ICON[type] || Building2;
              const labels: Record<string, string> = {
                tertiary: 'Tertiary Command Hospitals',
                secondary: 'Secondary Regional Hospitals',
                primary: 'Primary Field Clinics',
              };
              return (
                <div key={type} className="space-y-2">
                  <h3 className="font-semibold text-sm text-primary flex items-center gap-1">
                    <Icon className="h-4 w-4" /> {labels[type]}
                  </h3>
                  {typeFacilities.map(f => {
                    const BranchIcon = BRANCH_ICON[f.branch] || Shield;
                    const facStaffCount = staff.filter(s => s.facility_id === f.id).length;
                    const facConsCount = consultations.filter(c =>
                      c.requesting_facility_name === f.name || c.supporting_facility_name === f.name
                    ).length;
                    return (
                      <Card key={f.id}>
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{f.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <BranchIcon className="h-3 w-3" /> {f.branch}
                                  {f.region && ` • ${f.region}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">{facStaffCount} staff</p>
                                <p className="text-xs text-muted-foreground">{facConsCount} consults</p>
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">{f.status}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })}

            {facilities.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <Building2 className="h-12 w-12 mx-auto opacity-50" />
                  <p className="font-medium">No facilities registered</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* CONSULTATIONS */}
          <TabsContent value="consultations" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Radio className="h-5 w-5 text-amber-500" /> Consultation Analytics ({consultations.length})
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient, physician, facility..."
                  value={consSearch}
                  onChange={e => setConsSearch(e.target.value)}
                  className="pl-9 w-72"
                />
              </div>
            </div>

            {filteredConsultations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <Radio className="h-12 w-12 mx-auto opacity-50" />
                  <p className="font-medium">{consultations.length === 0 ? 'No consultations recorded' : 'No matches found'}</p>
                  <p className="text-sm">{consultations.length === 0 ? 'Field consultations will appear here once initiated' : 'Try a different search term'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredConsultations.map(c => (
                  <Card key={c.consultation_id} className={c.status === 'active' || c.status === 'pending' ? 'border-primary/30' : ''}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          {/* Patient info */}
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">
                              {c.personnel_rank || ''} {c.personnel_name}
                            </p>
                            <span className="text-xs text-muted-foreground font-mono">{c.service_number}</span>
                            <Badge variant="outline" className="text-xs capitalize">{c.branch}</Badge>
                            {c.unit && <span className="text-xs text-muted-foreground">{c.unit}</span>}
                          </div>
                          {/* Complaint */}
                          <p className="text-sm text-muted-foreground">{c.chief_complaint}</p>
                          {/* Facility and location */}
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.requesting_facility_name}
                            <span className="text-muted-foreground/50 capitalize">({c.requesting_facility_type})</span>
                            {c.requesting_facility_region && ` • ${c.requesting_facility_region}`}
                            {c.supporting_facility_name && (
                              <>
                                <ChevronRight className="h-3 w-3 mx-0.5" />
                                {c.supporting_facility_name}
                                <span className="text-muted-foreground/50 capitalize">({c.supporting_facility_type})</span>
                                {c.supporting_facility_region && ` • ${c.supporting_facility_region}`}
                              </>
                            )}
                          </p>
                          {c.field_location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Crosshair className="h-3 w-3" /> Field location: {c.field_location}
                            </p>
                          )}
                          {/* Physician info */}
                          <div className="mt-2 pt-2 border-t space-y-1">
                            {c.requesting_physician_name && (
                              <p className="text-xs flex items-center gap-1">
                                <Stethoscope className="h-3 w-3 text-primary" />
                                <span className="text-muted-foreground">Requesting physician:</span>
                                <span className="font-medium">{c.requesting_physician_rank || ''} {c.requesting_physician_name}</span>
                                <span className="text-muted-foreground">• {ROLE_LABEL[c.requesting_physician_role] || c.requesting_physician_role?.replace('_', ' ')}</span>
                                {c.requesting_physician_specialty && <span className="text-muted-foreground">• {c.requesting_physician_specialty}</span>}
                              </p>
                            )}
                            {c.supporting_physician_name && (
                              <p className="text-xs flex items-center gap-1">
                                <Stethoscope className="h-3 w-3 text-green-500" />
                                <span className="text-muted-foreground">Consulting physician:</span>
                                <span className="font-medium">{c.supporting_physician_rank || ''} {c.supporting_physician_name}</span>
                                <span className="text-muted-foreground">• {ROLE_LABEL[c.supporting_physician_role] || c.supporting_physician_role?.replace('_', ' ')}</span>
                                {c.supporting_physician_specialty && <span className="text-muted-foreground">• {c.supporting_physician_specialty}</span>}
                              </p>
                            )}
                          </div>
                          {/* Time */}
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(c.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className={URGENCY_CONFIG[c.priority]?.color}>
                            {URGENCY_CONFIG[c.priority]?.label || c.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">{c.status}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{c.consultation_type}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
