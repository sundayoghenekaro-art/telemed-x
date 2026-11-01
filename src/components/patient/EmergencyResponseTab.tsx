import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Ambulance, Loader2, MapPin, Phone, Navigation, Siren, XCircle,
  Crosshair, Clock, Users, Building2, ChevronRight, CheckCircle2, Video,
  LocateFixed, Stethoscope, ShieldCheck,
} from 'lucide-react';

interface AmbulanceRequestRow {
  id: string;
  emergency_type: string;
  severity: 'critical' | 'urgent' | 'moderate';
  status: string;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_hospital_id: string | null;
  destination_reason: string | null;
  assigned_vehicle_id: string | null;
  patient_count: number;
  created_at: string;
}

interface HospitalInfo {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface VehicleInfo {
  id: string;
  plate_number: string;
  vehicle_type: string;
  crew_names: string[] | null;
}

interface CareSession {
  id: string;
  request_id: string;
  clinician_name: string;
  clinician_specialty: string | null;
  channel: string;
  status: string;
  notes: string | null;
  started_at: string;
}

interface LocationPrompt {
  id: string;
  ambulance_request_id: string;
  status: 'pending' | 'shared' | 'declined';
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  created_at: string;
}

const EMERGENCY_TYPES = [
  { value: 'trauma', label: 'Trauma / Accident' },
  { value: 'cardiac', label: 'Cardiac (chest pain, arrest)' },
  { value: 'respiratory', label: 'Respiratory distress' },
  { value: 'stroke', label: 'Stroke / Neurological' },
  { value: 'obstetric', label: 'Obstetric Emergency' },
  { value: 'pediatric', label: 'Pediatric Emergency' },
  { value: 'burn', label: 'Burns' },
  { value: 'other', label: 'Other / Unspecified' },
];

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-700 border-red-500/40',
  urgent: 'bg-orange-500/15 text-orange-700 border-orange-500/40',
  moderate: 'bg-amber-400/15 text-amber-700 border-amber-400/40',
};

const STATUS_META: Record<string, { label: string; chip: string; dot: string; message: string }> = {
  pending: {
    label: 'Awaiting dispatch',
    chip: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
    message: 'Your request has been received. A dispatcher is assigning the nearest crew.',
  },
  dispatched: {
    label: 'Crew assigned',
    chip: 'bg-blue-500/15 text-blue-700 border-blue-500/40',
    dot: 'bg-blue-500',
    message: 'An ambulance crew has been assigned and is preparing to depart.',
  },
  'en-route': {
    label: 'On the way',
    chip: 'bg-sky-500/15 text-sky-700 border-sky-500/40',
    dot: 'bg-sky-500',
    message: 'The ambulance is en route to your pickup location. Keep your phone nearby.',
  },
  'on-scene': {
    label: 'Crew arrived',
    chip: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/40',
    dot: 'bg-indigo-500',
    message: 'The crew has arrived at your location and is with the patient.',
  },
  transporting: {
    label: 'Transporting',
    chip: 'bg-purple-500/15 text-purple-700 border-purple-500/40',
    dot: 'bg-purple-500',
    message: 'The patient is being transported to the receiving facility.',
  },
  completed: {
    label: 'Completed',
    chip: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40',
    dot: 'bg-emerald-500',
    message: 'This emergency mission is complete.',
  },
  cancelled: {
    label: 'Cancelled',
    chip: 'bg-red-500/10 text-red-700 border-red-500/30',
    dot: 'bg-red-500',
    message: 'This emergency request was cancelled.',
  },
};

const STAGES = ['pending', 'dispatched', 'en-route', 'on-scene', 'transporting', 'completed'];

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  basic: 'Basic life support',
  advanced: 'Advanced life support',
  icu: 'Mobile ICU',
  'rapid-response': 'Rapid response',
};

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const careRoomLink = (requestId: string) =>
  `https://meet.jit.si/TelemedX-Ambulance-${requestId.replace(/-/g, '').slice(0, 10)}`;

const elapsedLabel = (iso: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};

export function EmergencyResponseTab({ patientUserId, patientName }: {
  patientUserId: string;
  patientName: string;
}) {
  const [myRequests, setMyRequests] = useState<AmbulanceRequestRow[]>([]);
  const [pendingPrompts, setPendingPrompts] = useState<LocationPrompt[]>([]);
  const [hospitals, setHospitals] = useState<Record<string, HospitalInfo>>({});
  const [vehicles, setVehicles] = useState<Record<string, VehicleInfo>>({});
  const [careSessions, setCareSessions] = useState<CareSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AmbulanceRequestRow | null>(null);
  const [form, setForm] = useState({
    phone: '', emergencyType: 'other', severity: 'urgent' as 'critical' | 'urgent' | 'moderate',
    pickupAddress: '', description: '',
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [capturing, setCapturing] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: reqData } = await supabase
      .from('ambulance_requests')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false })
      .limit(30);

    const rows = (reqData || []) as AmbulanceRequestRow[];
    setMyRequests(rows);

    const destIds = Array.from(new Set(rows.map((r) => r.destination_hospital_id).filter(Boolean))) as string[];
    if (destIds.length) {
      const { data: hs } = await supabase
        .from('hospitals')
        .select('id, name, address, city, state, phone, latitude, longitude')
        .in('id', destIds);
      if (hs) setHospitals(Object.fromEntries((hs as HospitalInfo[]).map((h) => [h.id, h])));
    }

    const unitIds = Array.from(new Set(rows.map((r) => r.assigned_vehicle_id).filter(Boolean))) as string[];
    if (unitIds.length) {
      const { data: vs } = await supabase
        .from('ambulance_vehicles')
        .select('id, plate_number, vehicle_type, crew_names')
        .in('id', unitIds);
      if (vs) setVehicles(Object.fromEntries((vs as VehicleInfo[]).map((v) => [v.id, v])));
    }

    const requestIds = rows
      .filter((r) => !['completed', 'cancelled'].includes(r.status))
      .map((r) => r.id);
    if (requestIds.length) {
      const { data: cs } = await supabase
        .from('ambulance_virtual_care_sessions')
        .select('*')
        .in('request_id', requestIds)
        .eq('status', 'active');
      setCareSessions((cs || []) as CareSession[]);
    } else {
      setCareSessions([]);
    }

    const { data: prompts } = await supabase
      .from('ambulance_location_requests')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingPrompts((prompts || []) as LocationPrompt[]);

    setLoading(false);
  }, [patientUserId]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(`patient-ambulance-${patientUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_location_requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_virtual_care_sessions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_vehicles' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [patientUserId, fetchData]);

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error('GPS is not available on this device');
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCapturing(false);
        toast.success('Location attached to this request');
      },
      () => {
        setCapturing(false);
        toast.error('Could not read GPS. Check that location permission is allowed.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const requestAmbulance = async () => {
    if (!form.phone.trim() || !form.pickupAddress.trim()) {
      toast.error('Your phone number and pickup address are required');
      return;
    }
    try {
      const { error } = await supabase.from('ambulance_requests').insert({
        patient_user_id: patientUserId,
        requester_name: patientName,
        requester_phone: form.phone.trim(),
        emergency_type: form.emergencyType,
        severity: form.severity,
        pickup_address: form.pickupAddress.trim(),
        nature_description: form.description.trim() || null,
        pickup_latitude: coords?.lat ?? null,
        pickup_longitude: coords?.lng ?? null,
        patient_count: 1,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Emergency request sent — the ambulance crew has been alerted');
      setReqOpen(false);
      setForm({ phone: '', emergencyType: 'other', severity: 'urgent', pickupAddress: '', description: '' });
      setCoords(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not send the emergency request');
    }
  };

  const shareLocation = (prompt: LocationPrompt) => {
    if (!navigator.geolocation) {
      toast.error('GPS is not available on this device');
      return;
    }
    setSharing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          await supabase.from('ambulance_requests').update({
            pickup_latitude: latitude,
            pickup_longitude: longitude,
          }).eq('id', prompt.ambulance_request_id);
          const { error } = await supabase.from('ambulance_location_requests').update({
            status: 'shared',
            latitude,
            longitude,
            accuracy_m: accuracy ?? null,
            responded_at: new Date().toISOString(),
          }).eq('id', prompt.id);
          if (error) throw error;
          toast.success('Location shared with the ambulance crew — help is on the way');
          fetchData();
        } catch (err: any) {
          toast.error(err.message || 'Could not share your location');
        } finally {
          setSharing(false);
        }
      },
      () => {
        setSharing(false);
        toast.error('Could not read your GPS location. Check that location permission is allowed.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const declinePrompt = async (prompt: LocationPrompt) => {
    try {
      const { error } = await supabase.from('ambulance_location_requests').update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      }).eq('id', prompt.id);
      if (error) throw error;
      fetchData();
    } catch {
      toast.error('Could not decline the prompt');
    }
  };

  const refreshPickupLocation = (req: AmbulanceRequestRow) => {
    if (!navigator.geolocation) {
      toast.error('GPS is not available on this device');
      return;
    }
    setSharing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { error } = await supabase.from('ambulance_requests').update({
            pickup_latitude: pos.coords.latitude,
            pickup_longitude: pos.coords.longitude,
          }).eq('id', req.id);
          if (error) throw error;
          toast.success('Pickup point updated for the crew');
          fetchData();
        } catch (err: any) {
          toast.error(err.message || 'Could not update your location');
        } finally {
          setSharing(false);
        }
      },
      () => {
        setSharing(false);
        toast.error('Could not read GPS. Check that location permission is allowed.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const cancelRequest = async (req: AmbulanceRequestRow) => {
    try {
      const { error } = await supabase
        .from('ambulance_requests')
        .update({ status: 'cancelled' })
        .eq('id', req.id);
      if (error) throw error;
      toast.success('Your emergency request was cancelled');
      fetchData();
    } catch {
      toast.error('Could not cancel the request — call the dispatch line instead');
    } finally {
      setCancelTarget(null);
    }
  };

  const activeRequests = myRequests.filter((r) => !['completed', 'cancelled'].includes(r.status));
  const pastRequests = myRequests.filter((r) => ['completed', 'cancelled'].includes(r.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Siren className="h-5 w-5 text-red-600" /> Emergency Ambulance
          </h2>
          <p className="text-sm text-muted-foreground">
            Request an ambulance, track the crew live and connect with a remote clinician in transit
          </p>
        </div>
        <Button onClick={() => setReqOpen(true)} className="gap-1 bg-red-600 text-white hover:bg-red-700">
          <Siren className="h-4 w-4" /> Request Ambulance
        </Button>
      </div>

      {/* Pending location prompts from the ambulance crew */}
      {pendingPrompts.map((prompt) => {
        const req = myRequests.find((r) => r.id === prompt.ambulance_request_id);
        return (
          <Card key={prompt.id} className="border-red-500/50 bg-red-500/5">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <p className="text-sm font-semibold">The ambulance crew is requesting your location</p>
              </div>
              {req && (
                <p className="text-xs text-muted-foreground">
                  {req.emergency_type} emergency at {req.pickup_address}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Share your GPS position so the crew can find you and route to the nearest appropriate facility.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={sharing} onClick={() => shareLocation(prompt)} className="gap-1">
                  {sharing
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Getting GPS…</>
                    : <><Crosshair className="h-3.5 w-3.5" /> Share My Location</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => declinePrompt(prompt)} className="gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active missions</h3>
        {activeRequests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Ambulance className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No active emergency requests</p>
              <p className="mt-1 text-xs text-muted-foreground">
                When you request an ambulance you can follow every stage of the response here
              </p>
            </CardContent>
          </Card>
        ) : activeRequests.map((req) => {
          const dest = req.destination_hospital_id ? hospitals[req.destination_hospital_id] : undefined;
          const unit = req.assigned_vehicle_id ? vehicles[req.assigned_vehicle_id] : undefined;
          const care = careSessions.find((s) => s.request_id === req.id);
          const meta = STATUS_META[req.status] || STATUS_META.pending;
          const sev = SEVERITY_STYLE[req.severity] || SEVERITY_STYLE.urgent;
          const currentIdx = STAGES.indexOf(req.status);
          const transportKm = dest && dest.latitude != null && dest.longitude != null
            && req.pickup_latitude != null && req.pickup_longitude != null
            ? distanceKm(req.pickup_latitude, req.pickup_longitude, dest.latitude, dest.longitude)
            : null;

          return (
            <Card key={req.id} className={req.severity === 'critical' ? 'border-red-500/50' : ''}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase ${sev}`}>
                    {req.severity}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${meta.chip}`}>
                    <span className={`mr-1 h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{req.emergency_type}</Badge>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Users className="h-3 w-3" /> {req.patient_count}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> {elapsedLabel(req.created_at)}
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                  <p className="text-xs font-medium">{meta.message}</p>
                  <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-0.5">
                    {STAGES.map((stage, idx) => {
                      const done = currentIdx > idx;
                      const current = currentIdx === idx;
                      return (
                        <div key={stage} className="flex shrink-0 items-center gap-1">
                          {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                          <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] capitalize ${
                            current
                              ? 'border-primary bg-primary/10 font-semibold text-primary'
                              : done
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                                : 'border-border text-muted-foreground'
                          }`}>
                            {done && <CheckCircle2 className="h-2.5 w-2.5" />}
                            {stage.replace('-', ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-2.5">
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-3 w-3" /> Pickup
                    </p>
                    <p className="text-sm font-medium">{req.pickup_address}</p>
                    {req.pickup_latitude != null && req.pickup_longitude != null ? (
                      <Badge variant="outline" className="mt-1.5 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700">
                        <Crosshair className="mr-1 h-3 w-3" /> GPS shared with crew
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="mt-1.5 h-7 gap-1 text-[11px]"
                        disabled={sharing} onClick={() => refreshPickupLocation(req)}>
                        {sharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
                        Attach my GPS
                      </Button>
                    )}
                  </div>

                  <div className="rounded-lg border border-border p-2.5">
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Building2 className="h-3 w-3" /> Receiving facility
                    </p>
                    {dest ? (
                      <>
                        <p className="text-sm font-medium">{dest.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {dest.address || [dest.city, dest.state].filter(Boolean).join(', ')}
                        </p>
                        {transportKm != null && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Navigation className="h-3 w-3" /> ~{transportKm.toFixed(1)} km · est. {Math.max(1, Math.round((transportKm / 40) * 60))} min
                          </p>
                        )}
                        {dest.phone && (
                          <Button size="sm" variant="outline" className="mt-1.5 h-7 gap-1 text-[11px]" asChild>
                            <a href={`tel:${dest.phone.replace(/[^\d+]/g, '')}`}>
                              <Phone className="h-3 w-3" /> Call facility
                            </a>
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        The dispatcher selects the closest appropriate facility.
                      </p>
                    )}
                  </div>
                </div>

                {unit && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5">
                    <div className="rounded-md bg-sky-500/10 p-1.5 text-sky-600">
                      <Ambulance className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold">{unit.plate_number}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {VEHICLE_TYPE_LABEL[unit.vehicle_type] || unit.vehicle_type}
                        {unit.crew_names?.length ? ` · ${unit.crew_names.join(', ')}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-700">
                      Your crew
                    </Badge>
                  </div>
                )}

                {care && (
                  <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-purple-600" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{care.clinician_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {care.clinician_specialty || 'Emergency Medicine'} · {care.channel} consultation
                        </p>
                      </div>
                      <Button size="sm" className="ml-auto h-7 gap-1 text-[11px]"
                        onClick={() => window.open(careRoomLink(req.id), '_blank', 'noopener,noreferrer')}>
                        <Video className="h-3 w-3" /> Join clinician
                      </Button>
                    </div>
                    {care.notes && (
                      <p className="mt-2 rounded bg-background/70 p-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">Care note: </span>{care.notes}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {req.pickup_latitude != null && req.pickup_longitude != null && (
                    <Button size="sm" variant="outline" className="h-8 gap-1"
                      onClick={() => window.open(
                        `https://www.google.com/maps?q=${req.pickup_latitude},${req.pickup_longitude}`,
                        '_blank', 'noopener,noreferrer')}>
                      <Navigation className="h-3.5 w-3.5" /> Show pickup on map
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="ml-auto h-8 gap-1 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                    onClick={() => setCancelTarget(req)}>
                    <XCircle className="h-3.5 w-3.5" /> Cancel request
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pastRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past requests</h3>
          {pastRequests.map((req) => {
            const meta = STATUS_META[req.status] || STATUS_META.pending;
            const dest = req.destination_hospital_id ? hospitals[req.destination_hospital_id] : undefined;
            return (
              <Card key={req.id}>
                <CardContent className="flex flex-wrap items-center gap-2 p-3">
                  <Badge variant="outline" className={`text-[10px] ${meta.chip}`}>{meta.label}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{req.emergency_type}</Badge>
                  <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {req.pickup_address}
                    {dest ? ` → ${dest.name}` : ''}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-2 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Your location is shared only with the crew assigned to your request and is used to route the
            ambulance to you and onward to the receiving facility.
          </p>
        </CardContent>
      </Card>

      {/* Request ambulance dialog */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Siren className="h-4 w-4 text-red-600" /> Request an ambulance
            </DialogTitle>
            <DialogDescription>
              Give the dispatcher enough detail to send the right crew. Attaching GPS shortens response time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Your phone number *</Label>
              <Input placeholder="+234 800 000 0000" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Emergency type *</Label>
                <Select value={form.emergencyType} onValueChange={(v) => setForm({ ...form, emergencyType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMERGENCY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Severity *</Label>
                <Select value={form.severity}
                  onValueChange={(v) => setForm({ ...form, severity: v as typeof form.severity })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Pickup address *</Label>
              <div className="relative">
                <Input placeholder="Where is the patient?" value={form.pickupAddress}
                  onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} />
                <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="rounded-lg border border-border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium">Attach your GPS location</p>
                  <p className="text-[11px] text-muted-foreground">
                    {coords
                      ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                      : 'Recommended — helps the crew find you faster'}
                  </p>
                </div>
                <Button type="button" size="sm" variant={coords ? 'secondary' : 'outline'} className="h-8 shrink-0 gap-1"
                  disabled={capturing} onClick={captureGps}>
                  {capturing
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Locating…</>
                    : <><Crosshair className="h-3.5 w-3.5" /> {coords ? 'Update' : 'Use my location'}</>}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>What happened?</Label>
              <Textarea rows={2} placeholder="Patient condition, what happened…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button>
            <Button onClick={requestAmbulance} className="gap-1 bg-red-600 text-white hover:bg-red-700">
              <Siren className="h-4 w-4" /> Send emergency request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this emergency request?</AlertDialogTitle>
            <AlertDialogDescription>
              The assigned crew will be notified that you no longer need an ambulance.
              Only cancel if the emergency has been resolved or help is no longer required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep request</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelTarget && cancelRequest(cancelTarget)}>
              Cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
