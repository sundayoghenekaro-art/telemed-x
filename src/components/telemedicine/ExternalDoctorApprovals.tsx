import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, XCircle, Clock, User, Stethoscope,
  Building2, Award, Phone, Mail, FileText, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ExternalDoctor {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialty: string;
  license_number: string;
  license_state: string;
  institution: string | null;
  years_experience: number | null;
  bio: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface ExternalDoctorApprovalsProps {
  reviewerName: string;
}

export function ExternalDoctorApprovals({ reviewerName }: ExternalDoctorApprovalsProps) {
  const [allDoctors, setAllDoctors] = useState<ExternalDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<ExternalDoctor | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Derive displayed list from filter; counts always use the full unfiltered list
  const doctors = filter === 'all' ? allDoctors : allDoctors.filter(d => d.status === filter);

  const fetchDoctors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('external_doctors')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load applications'); }
    else { setAllDoctors(data as ExternalDoctor[]); }
    setLoading(false);
  };

  useEffect(() => { fetchDoctors(); }, []);

  const sendNotification = async (type: string, payload: Record<string, unknown>) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      fetch(`${SUPABASE_URL}/functions/v1/send-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type, ...payload }),
      }).then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          console.warn('Notification send failed:', d.error);
          toast.warning('Action completed, but notification email could not be sent.');
        }
      }).catch(() => {
        toast.warning('Action completed, but notification email could not be sent.');
      });
    } catch {
      // non-blocking — do not interrupt the UI flow
    }
  };

  const handleApprove = async (doctor: ExternalDoctor) => {
    setActionLoading(true);
    const { error } = await supabase
      .from('external_doctors')
      .update({
        status: 'approved',
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', doctor.id);

    if (error) {
      toast.error('Failed to approve application');
    } else {
      toast.success(`${doctor.full_name} has been approved`);
      sendNotification('doctor_approved', {
        doctorEmail: doctor.email,
        doctorName: doctor.full_name,
        specialty: doctor.specialty,
        reviewerName,
      });
      setSelectedDoctor(null);
      fetchDoctors();
    }
    setActionLoading(false);
  };

  const handleReject = async (doctor: ExternalDoctor) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setActionLoading(true);
    const { error } = await supabase
      .from('external_doctors')
      .update({
        status: 'rejected',
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectReason.trim(),
      })
      .eq('id', doctor.id);

    if (error) {
      toast.error('Failed to reject application');
    } else {
      toast.success(`${doctor.full_name}'s application has been rejected`);
      sendNotification('doctor_rejected', {
        doctorEmail: doctor.email,
        doctorName: doctor.full_name,
        rejectionReason: rejectReason.trim(),
      });
      setSelectedDoctor(null);
      setRejectReason('');
      fetchDoctors();
    }
    setActionLoading(false);
  };

  // Always count from the full unfiltered list so stats are accurate regardless of active filter
  const statusCounts = {
    pending: allDoctors.filter(d => d.status === 'pending').length,
    approved: allDoctors.filter(d => d.status === 'approved').length,
    rejected: allDoctors.filter(d => d.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">External Doctor Applications</h2>
        <p className="text-sm text-muted-foreground">Review and approve telemedicine access requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', count: statusCounts.pending, icon: Clock, color: 'text-muted-foreground', filter: 'pending' as const },
          { label: 'Approved', count: statusCounts.approved, icon: CheckCircle2, color: 'text-primary', filter: 'approved' as const },
          { label: 'Rejected', count: statusCounts.rejected, icon: XCircle, color: 'text-destructive', filter: 'rejected' as const },
        ].map(({ label, count, icon: Icon, color, filter: f }) => (
          <Card key={f} className={`cursor-pointer transition-all ${filter === f ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
            onClick={() => setFilter(f)}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No {filter !== 'all' ? filter : ''} applications found
          </div>
        ) : (
          doctors.map((doctor) => (
            <Card key={doctor.id} className="hover:border-primary/30 transition-all">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{doctor.full_name}</p>
                        <StatusBadge status={doctor.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {doctor.email}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Award className="h-3 w-3" /> {doctor.license_number} ({doctor.license_state})
                        </span>
                        {doctor.institution && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {doctor.institution}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied {format(new Date(doctor.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setSelectedDoctor(doctor)}>
                      <Eye className="h-4 w-4 mr-1" /> Review
                    </Button>
                    {doctor.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(doctor)} disabled={actionLoading}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setSelectedDoctor(doctor)} disabled={actionLoading}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedDoctor} onOpenChange={() => { setSelectedDoctor(null); setRejectReason(''); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Review — {selectedDoctor?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedDoctor.status} />
                  {selectedDoctor.reviewed_at && (
                    <span className="text-xs text-muted-foreground">
                      Reviewed by {selectedDoctor.reviewed_by} on {format(new Date(selectedDoctor.reviewed_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InfoRow icon={User} label="Full Name" value={selectedDoctor.full_name} />
                  <InfoRow icon={Mail} label="Email" value={selectedDoctor.email} />
                  <InfoRow icon={Phone} label="Phone" value={selectedDoctor.phone || '—'} />
                  <InfoRow icon={Stethoscope} label="Specialty" value={selectedDoctor.specialty} />
                  <InfoRow icon={Award} label="License" value={`${selectedDoctor.license_number} (${selectedDoctor.license_state})`} />
                  <InfoRow icon={Building2} label="Institution" value={selectedDoctor.institution || '—'} />
                  <InfoRow icon={Clock} label="Experience" value={selectedDoctor.years_experience ? `${selectedDoctor.years_experience} years` : '—'} />
                </div>

                {selectedDoctor.bio && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-muted-foreground" /> Statement
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedDoctor.bio}</p>
                    </div>
                  </>
                )}

                {selectedDoctor.rejection_reason && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                      <p className="text-sm text-muted-foreground">{selectedDoctor.rejection_reason}</p>
                    </div>
                  </>
                )}

                {selectedDoctor.status === 'pending' && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Rejection Reason (required to reject)</Label>
                      <Textarea
                        placeholder="Explain why this application is being rejected..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
          {selectedDoctor?.status === 'pending' && (
            <DialogFooter className="gap-2">
              <Button variant="destructive" onClick={() => handleReject(selectedDoctor)} disabled={actionLoading || !rejectReason.trim()}>
                <XCircle className="h-4 w-4 mr-1" /> Reject Application
              </Button>
              <Button onClick={() => handleApprove(selectedDoctor)} disabled={actionLoading}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve Application
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <Badge className="bg-primary/20 text-primary border-primary/30">Approved</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
