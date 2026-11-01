import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2, Users, CheckCircle, XCircle, Clock, Stethoscope, Plus, Loader2, UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface HospitalDoctor {
  id: string;
  hospital_id: string;
  doctor_user_id: string;
  doctor_name: string;
  specialty: string | null;
  license_number: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
}

interface HospitalAdminPortalProps {
  hospitalId: string;
  hospitalName: string;
}

export function HospitalAdminPortal({ hospitalId, hospitalName }: HospitalAdminPortalProps) {
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '', licenseNumber: '', email: '' });

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from('hospital_doctors')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });
    if (data) setDoctors(data as unknown as HospitalDoctor[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
    const channel = supabase
      .channel(`hospital-doctors-${hospitalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospital_doctors', filter: `hospital_id=eq.${hospitalId}` }, () => fetchDoctors())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hospitalId]);

  const handleApprove = async (doctor: HospitalDoctor) => {
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('hospital_doctors')
        .update({
          status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        } as any)
        .eq('id', doctor.id);
      if (error) throw error;
      toast.success(`${doctor.doctor_name} approved`);
      fetchDoctors();
    } catch {
      toast.error('Failed to approve doctor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (doctor: HospitalDoctor) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('hospital_doctors')
        .update({ status: 'suspended' } as any)
        .eq('id', doctor.id);
      if (error) throw error;
      toast.success(`${doctor.doctor_name} suspended`);
      fetchDoctors();
    } catch {
      toast.error('Failed to suspend doctor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      // For now, we create a placeholder affiliation without a real user_id
      // In production, this would involve inviting the doctor or searching existing users
      const { error } = await supabase.from('hospital_doctors').insert({
        hospital_id: hospitalId,
        doctor_user_id: crypto.randomUUID(), // placeholder
        doctor_name: newDoctor.name,
        specialty: newDoctor.specialty || null,
        license_number: newDoctor.licenseNumber || null,
        status: 'pending',
      } as any);
      if (error) throw error;
      toast.success('Doctor affiliation created');
      setShowAddDialog(false);
      setNewDoctor({ name: '', specialty: '', licenseNumber: '', email: '' });
      fetchDoctors();
    } catch {
      toast.error('Failed to add doctor');
    } finally {
      setActionLoading(false);
    }
  };

  const pending = doctors.filter(d => d.status === 'pending');
  const active = doctors.filter(d => d.status === 'active');
  const suspended = doctors.filter(d => d.status === 'suspended');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/10"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'active': return <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'suspended': return <Badge variant="outline" className="text-red-600 border-red-500/30 bg-red-500/10"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const DoctorRow = ({ doctor }: { doctor: HospitalDoctor }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Stethoscope className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{doctor.doctor_name}</p>
          <p className="text-xs text-muted-foreground">{doctor.specialty || 'General'} · {doctor.license_number || 'No license'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {statusBadge(doctor.status)}
        {doctor.status === 'pending' && (
          <>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleSuspend(doctor)} disabled={actionLoading}>
              <XCircle className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={() => handleApprove(doctor)} disabled={actionLoading}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
            </Button>
          </>
        )}
        {doctor.status === 'active' && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleSuspend(doctor)} disabled={actionLoading}>
            Suspend
          </Button>
        )}
        {doctor.status === 'suspended' && (
          <Button size="sm" onClick={() => handleApprove(doctor)} disabled={actionLoading}>
            Reactivate
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{hospitalName}</h2>
            <p className="text-sm text-muted-foreground">Hospital Administration Portal</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Doctor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{active.length}</p>
            <p className="text-xs text-muted-foreground">Active Doctors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{doctors.length}</p>
            <p className="text-xs text-muted-foreground">Total Affiliations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="suspended">Suspended ({suspended.length})</TabsTrigger>
        </TabsList>
        {(['active', 'pending', 'suspended'] as const).map(tab => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <ScrollArea className="h-[50vh]">
                <div className="space-y-2">
                  {(tab === 'active' ? active : tab === 'pending' ? pending : suspended)
                    .map(d => <DoctorRow key={d.id} doctor={d} />)}
                  {(tab === 'active' ? active : tab === 'pending' ? pending : suspended).length === 0 && (
                    <p className="text-center text-muted-foreground py-12">No doctors in this category</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Add Doctor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Doctor Affiliation</DialogTitle>
            <DialogDescription>Add a doctor to {hospitalName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDoctor} className="space-y-4">
            <div className="space-y-2">
              <Label>Doctor Name *</Label>
              <Input placeholder="Dr. John Smith" value={newDoctor.name}
                onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Input placeholder="e.g. Cardiology" value={newDoctor.specialty}
                onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input placeholder="Medical license #" value={newDoctor.licenseNumber}
                onChange={(e) => setNewDoctor({ ...newDoctor, licenseNumber: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Add Doctor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
