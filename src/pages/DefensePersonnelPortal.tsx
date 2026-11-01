import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  Shield, LogOut, Loader2, Crosshair, Heart, Users, Radio,
  FileText, MapPin, Activity, Building2, AlertTriangle, Clock,
  Plane, Anchor, User,
} from 'lucide-react';
import type { DefenseUserAccount } from './DefensePersonnelAuth';

interface DefensePersonnel {
  id: string;
  service_number: string;
  full_name: string;
  rank: string | null;
  branch: string;
  unit: string | null;
  deployment_status: string;
  blood_type: string | null;
  allergies: string | null;
  date_of_birth: string | null;
  security_clearance: string;
}

interface MedicalRecord {
  id: string;
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
  chief_complaint: string;
  consultation_type: string;
  status: string;
  priority: string;
  field_location: string | null;
  specialist_notes: string | null;
  recommendations: string | null;
  created_at: string;
  requesting_facility_id: string;
  supporting_facility_id: string | null;
}

interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
  date_of_birth: string | null;
  blood_type: string | null;
  allergies: string | null;
  notes: string | null;
}

interface DefenseFacility {
  id: string;
  name: string;
  type: string;
  branch: string;
  region: string | null;
}

const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
  immediate: { color: 'text-red-600 bg-red-500/10 border-red-500/30', label: 'IMMEDIATE' },
  priority: { color: 'text-amber-600 bg-amber-500/10 border-amber-500/30', label: 'PRIORITY' },
  routine: { color: 'text-blue-600 bg-blue-500/10 border-blue-500/30', label: 'ROUTINE' },
  emergency: { color: 'text-red-600 bg-red-500/10 border-red-500/30', label: 'EMERGENCY' },
  urgent: { color: 'text-amber-600 bg-amber-500/10 border-amber-500/30', label: 'URGENT' },
};

const BRANCH_ICON: Record<string, typeof Shield> = {
  army: Shield,
  navy: Anchor,
  airforce: Plane,
  joint: Shield,
};

const DEPLOYMENT_COLORS: Record<string, string> = {
  active: 'text-green-600 bg-green-500/10 border-green-500/30',
  deployed: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  reserve: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
  retired: 'text-muted-foreground bg-muted',
  wia: 'text-red-600 bg-red-500/10 border-red-500/30',
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  unclassified: 'text-green-600 bg-green-500/10 border-green-500/30',
  restricted: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
  confidential: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  secret: 'text-red-600 bg-red-500/10 border-red-500/30',
};

export function DefensePersonnelPortal({
  account,
  personnel,
  onLogout,
}: {
  account: DefenseUserAccount;
  personnel: DefensePersonnel;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [consultations, setConsultations] = useState<FieldConsultation[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [facilities, setFacilities] = useState<DefenseFacility[]>([]);

  const isFamily = account.account_type === 'family';

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const personnelId = account.personnel_id || account.linked_personnel_id;
    if (!personnelId) { setLoading(false); return; }
    const [recRes, consRes, famRes, facRes] = await Promise.all([
      supabase.from('defense_medical_records').select('*').eq('personnel_id', personnelId).order('record_date', { ascending: false }),
      supabase.from('defense_field_consultations').select('*').eq('personnel_id', personnelId).order('created_at', { ascending: false }),
      supabase.from('defense_family_members').select('*').eq('personnel_id', personnelId).order('full_name'),
      supabase.from('defense_facilities').select('*').order('name'),
    ]);
    if (recRes.data) setRecords(recRes.data as MedicalRecord[]);
    if (consRes.data) setConsultations(consRes.data as FieldConsultation[]);
    if (famRes.data) setFamilyMembers(famRes.data as FamilyMember[]);
    if (facRes.data) setFacilities(facRes.data as DefenseFacility[]);
    setLoading(false);
  };

  const facilityName = (id: string | null) => facilities.find(f => f.id === id)?.name || 'Unknown';
  const BranchIcon = BRANCH_ICON[personnel.branch] || Shield;

  const activeConsultations = consultations.filter(c => c.status === 'pending' || c.status === 'active');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sidebar">
        <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-20 border-b border-sidebar-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <Crosshair className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-sm">Defense Health Portal</p>
              <p className="text-xs text-sidebar-foreground/60">
                {isFamily ? 'Family Member' : 'Service Member'} • {account.full_name}
                <span className="ml-2 text-sidebar-foreground/40">{personnel.service_number}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Personnel Info Banner */}
        <Card className="mb-6 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="p-3 rounded-xl bg-primary/10">
                <BranchIcon className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{personnel.rank || ''} {personnel.full_name}</h2>
                <p className="text-sm text-muted-foreground font-mono">{personnel.service_number} • {personnel.branch} • {personnel.unit || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {personnel.blood_type && <Badge variant="outline" className="text-xs">Blood: {personnel.blood_type}</Badge>}
                <Badge variant="outline" className={`text-xs ${DEPLOYMENT_COLORS[personnel.deployment_status] || ''}`}>
                  {personnel.deployment_status.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">Clearance: {personnel.security_clearance}</Badge>
              </div>
            </div>
            {personnel.allergies && (
              <div className="mt-3 p-2 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive font-medium">Allergies: {personnel.allergies}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm"><Activity className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-1 text-xs sm:text-sm"><FileText className="h-4 w-4" /> Records</TabsTrigger>
            <TabsTrigger value="consultations" className="flex items-center gap-1 text-xs sm:text-sm"><Radio className="h-4 w-4" /> Consultations</TabsTrigger>
            {!isFamily && (
              <TabsTrigger value="family" className="flex items-center gap-1 text-xs sm:text-sm"><Users className="h-4 w-4" /> Family</TabsTrigger>
            )}
            {isFamily && (
              <TabsTrigger value="family" className="flex items-center gap-1 text-xs sm:text-sm"><Users className="h-4 w-4" /> Family</TabsTrigger>
            )}
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Health Summary
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Medical Records</span>
                  </div>
                  <p className="text-2xl font-bold">{records.length}</p>
                  <p className="text-xs text-muted-foreground">{records.filter(r => r.is_field_record).length} field records</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Radio className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Consultations</span>
                  </div>
                  <p className="text-2xl font-bold">{consultations.length}</p>
                  <p className="text-xs text-muted-foreground">{activeConsultations.length} active</p>
                </CardContent>
              </Card>
              {!isFamily && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Family Members</span>
                    </div>
                    <p className="text-2xl font-bold">{familyMembers.length}</p>
                    <p className="text-xs text-muted-foreground">linked to your record</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Status</span>
                  </div>
                  <p className="text-lg font-bold capitalize">{personnel.deployment_status}</p>
                  <p className="text-xs text-muted-foreground">{personnel.branch} • {personnel.unit || 'N/A'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Active Consultations */}
            {activeConsultations.length > 0 && (
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Radio className="h-5 w-5 text-primary" /> Active Consultations ({activeConsultations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeConsultations.map(c => (
                    <div key={c.id} className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium text-sm">{c.chief_complaint}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {facilityName(c.requesting_facility_id)}
                        {c.supporting_facility_id && ` → ${facilityName(c.supporting_facility_id)}`}
                        {' • '}{c.consultation_type}
                      </p>
                      {c.field_location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {c.field_location}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={URGENCY_CONFIG[c.priority]?.color}>{URGENCY_CONFIG[c.priority]?.label || c.priority}</Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{c.status}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent Records */}
            {records.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Recent Medical Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {records.slice(0, 3).map(rec => (
                    <div key={rec.id} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className="text-xs capitalize">{rec.record_type.replace('_', ' ')}</Badge>
                        <span className="text-xs text-muted-foreground">{format(parseISO(rec.record_date), 'MMM d, yyyy')}</span>
                      </div>
                      {rec.diagnosis && <p className="text-sm font-medium">{rec.diagnosis}</p>}
                      {rec.treatment && <p className="text-xs text-muted-foreground mt-1">Treatment: {rec.treatment}</p>}
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setTab('records')}>
                    View all records
                  </Button>
                </CardContent>
              </Card>
            )}

            {records.length === 0 && consultations.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <Activity className="h-12 w-12 mx-auto opacity-50" />
                  <p className="font-medium">No health records yet</p>
                  <p className="text-sm">Your medical records and consultations will appear here once your medical facility adds them.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* RECORDS */}
          <TabsContent value="records" className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Medical History
            </h3>
            {records.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <FileText className="h-12 w-12 mx-auto opacity-50" />
                  <p className="font-medium">No medical records on file</p>
                  <p className="text-sm">Records will appear here once your medical facility documents them.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {records.map(rec => (
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
                      {rec.field_location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {rec.field_location}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* CONSULTATIONS */}
          <TabsContent value="consultations" className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" /> Field Consultations
            </h3>
            {consultations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <Radio className="h-12 w-12 mx-auto opacity-50" />
                  <p className="font-medium">No consultations recorded</p>
                  <p className="text-sm">Your remote medical consultations will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {consultations.map(c => (
                  <Card key={c.id} className={c.status === 'active' || c.status === 'pending' ? 'border-primary/30' : ''}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-medium text-sm">{c.chief_complaint}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {facilityName(c.requesting_facility_id)}
                            {c.supporting_facility_id && ` → ${facilityName(c.supporting_facility_id)}`}
                            {' • '}{c.consultation_type}
                          </p>
                          {c.field_location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {c.field_location}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className={URGENCY_CONFIG[c.priority]?.color}>{URGENCY_CONFIG[c.priority]?.label || c.priority}</Badge>
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
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {format(parseISO(c.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* FAMILY */}
          <TabsContent value="family" className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> {isFamily ? 'Your Family Profile' : 'Linked Family Members'}
            </h3>

            {!isFamily && (
              <p className="text-sm text-muted-foreground">
                Your medical staff can link family members to your service record. They will be able to create their own accounts
                using your defense ID number.
              </p>
            )}

            {familyMembers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <Users className="h-12 w-12 mx-auto opacity-50" />
                  <p className="font-medium">No family members linked yet</p>
                  <p className="text-sm">
                    {isFamily
                      ? 'You are linked as a family member. Your profile is shown below.'
                      : 'Visit your medical facility to have family members linked to your service record.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {familyMembers.map(fam => (
                  <Card key={fam.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Heart className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{fam.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{fam.relationship}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {fam.blood_type && <Badge variant="outline" className="text-xs">{fam.blood_type}</Badge>}
                          {fam.date_of_birth && <span className="text-xs text-muted-foreground">DOB: {format(parseISO(fam.date_of_birth), 'MMM d, yyyy')}</span>}
                        </div>
                      </div>
                      {fam.allergies && (
                        <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Allergies: {fam.allergies}
                        </p>
                      )}
                      {fam.notes && <p className="text-xs text-muted-foreground mt-1">{fam.notes}</p>}
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
