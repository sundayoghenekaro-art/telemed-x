import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ComponentType } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Ambulance, Activity, AlertTriangle, ArrowRight, Building2, ChevronRight,
  ClipboardCheck, Clock, Copy, Crosshair, ExternalLink, Loader2, LocateFixed, LogOut,
  MapPin, MessageSquare, Navigation, Phone, Plus, Radio, Search, Send, Siren,
  Stethoscope, Truck, Users, Video, XCircle, HeartPulse, Route,
} from 'lucide-react';
import { AmbulanceAuth } from './AmbulanceAuth';

interface AmbulanceAccount {
  id?: string;
  full_name: string;
  role: string;
  organization_name?: string | null;
}

interface AmbulanceRequest {
  id: string;
  patient_user_id: string | null;
  requester_name: string;
  requester_phone: string;
  emergency_type: string;
  severity: 'critical' | 'urgent' | 'moderate';
  nature_description: string | null;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  patient_count: number;
  status: string;
  assigned_vehicle_id: string | null;
  destination_hospital_id: string | null;
  destination_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface Hospital {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  accredited_specialties: string[] | null;
  phone: string | null;
}

interface RankedHospital extends Hospital {
  km?: number;
  matched: string[];
}

interface VirtualCareSession {
  id: string;
  request_id: string;
  clinician_name: string;
  clinician_specialty: string | null;
  channel: string;
  status: string;
  started_at: string;
  ended_at?: string | null;
  notes: string | null;
}

interface LocationPrompt {
  id: string;
  ambulance_request_id: string;
  patient_user_id: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  created_at: string;
  responded_at: string | null;
}

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  base_latitude: number | null;
  base_longitude: number | null;
  base_address: string | null;
  status: string;
  crew_names: string[] | null;
}

const SEVERITY_META: Record<string, { label: string; rank: number; chip: string; bar: string; ring: string }> = {
  critical: { label: 'Critical', rank: 0, chip: 'bg-red-500/15 text-red-700 border-red-500/40', bar: 'bg-red-500', ring: 'border-l-red-500' },
  urgent: { label: 'Urgent', rank: 1, chip: 'bg-orange-500/15 text-orange-700 border-orange-500/40', bar: 'bg-orange-500', ring: 'border-l-orange-500' },
  moderate: { label: 'Moderate', rank: 2, chip: 'bg-amber-400/15 text-amber-700 border-amber-400/40', bar: 'bg-amber-400', ring: 'border-l-amber-400' },
};

const STATUS_META: Record<string, { label: string; chip: string; dot: string }> = {
  pending: { label: 'Awaiting dispatch', chip: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  dispatched: { label: 'Dispatched', chip: 'bg-blue-500/15 text-blue-700 border-blue-500/40', dot: 'bg-blue-500' },
  'en-route': { label: 'En route', chip: 'bg-sky-500/15 text-sky-700 border-sky-500/40', dot: 'bg-sky-500' },
  'on-scene': { label: 'On scene', chip: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/40', dot: 'bg-indigo-500' },
  transporting: { label: 'Transporting', chip: 'bg-purple-500/15 text-purple-700 border-purple-500/40', dot: 'bg-purple-500' },
  completed: { label: 'Completed', chip: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', chip: 'bg-red-500/10 text-red-700 border-red-500/30', dot: 'bg-red-500' },
};

const STAGES = ['pending', 'dispatched', 'en-route', 'on-scene', 'transporting', 'completed'];

const NEXT_STEP: Record<string, { next: string; label: string }> = {
  pending: { next: 'dispatched', label: 'Dispatch unit' },
  dispatched: { next: 'en-route', label: 'Mark en route' },
  'en-route': { next: 'on-scene', label: 'Mark on scene' },
  'on-scene': { next: 'transporting', label: 'Begin transport' },
  transporting: { next: 'completed', label: 'Complete mission' },
};

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  basic: 'Basic life support',
  advanced: 'Advanced life support',
  icu: 'Mobile ICU',
  'rapid-response': 'Rapid response',
};

const EMERGENCY_TYPES = [
  { value: 'trauma', label: 'Trauma / Accident' },
  { value: 'cardiac', label: 'Cardiac (chest pain, arrest)' },
  { value: 'respiratory', label: 'Respiratory distress' },
  { value: 'stroke', label: 'Stroke / Neurological' },
  { value: 'obstetric', label: 'Obstetric emergency' },
  { value: 'pediatric', label: 'Pediatric emergency' },
  { value: 'burn', label: 'Burns' },
  { value: 'other', label: 'Other / Unspecified' },
];

const EMERGENCY_SPECIALTIES: Record<string, string[]> = {
  trauma: ['Trauma Surgery', 'Orthopedics', 'Emergency Medicine', 'General Surgery'],
  cardiac: ['Cardiology', 'Emergency Medicine', 'Cardiac Surgery'],
  respiratory: ['Pulmonology', 'Emergency Medicine', 'Internal Medicine'],
  stroke: ['Neurology', 'Neurosurgery', 'Emergency Medicine'],
  obstetric: ['Obstetrics & Gynecology', 'Neonatology', 'Emergency Medicine'],
  pediatric: ['Pediatrics', 'Neonatology', 'Emergency Medicine'],
  burn: ['Plastic Surgery', 'Burn Care', 'General Surgery', 'Emergency Medicine'],
  other: ['Emergency Medicine'],
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

const etaMinutes = (km: number) => Math.max(1, Math.round((km / 40) * 60));

const elapsedLabel = (iso: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
};

const cleanPhone = (phone: string) => phone.replace(/[^\d+]/g, '');
const telHref = (phone: string) => `tel:${cleanPhone(phone)}`;
const smsHref = (phone: string, body: string) =>
  `sms:${cleanPhone(phone)}?body=${encodeURIComponent(body)}`;

// Deterministic room so the crew and the patient land in the same Jitsi call
const careRoomLink = (requestId: string) =>
  `https://meet.jit.si/TelemedX-Ambulance-${requestId.replace(/-/g, '').slice(0, 10)}`;

const openRoute = (
  destLat: number, destLng: number, destName: string,
  originLat?: number | null, originLng?: number | null,
) => {
  const origin = originLat != null && originLng != null ? `&origin=${originLat},${originLng}` : '';
  window.open(
    `https://www.google.com/maps/dir/?api=1${origin}&destination=${destLat},${destLng}` +
    `&travelmode=driving&dir_action=navigate&q=${encodeURIComponent(destName || 'Destination')}`,
    '_blank', 'noopener,noreferrer',
  );
};

function Kpi({ icon: Icon, label, value, hint, tone }: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center gap-3 p-3">
        <div className={`rounded-lg p-2 ${tone || 'bg-primary/10 text-primary'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
          <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
          {hint && <p className="truncate text-[10px] text-muted-foreground/80">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function AmbulanceConsole() {
  const [account, setAccount] = useState<AmbulanceAccount | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [careSessions, setCareSessions] = useState<VirtualCareSession[]>([]);
  const [locationPrompts, setLocationPrompts] = useState<LocationPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverGps, setDriverGps] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [queueFilter, setQueueFilter] = useState<'active' | 'transporting' | 'closed'>('active');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [newReqOpen, setNewReqOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [careOpen, setCareOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<{ id: string; text: string } | null>(null);

  const [newReq, setNewReq] = useState({
    requesterName: '', requesterPhone: '', emergencyType: 'other',
    severity: 'urgent' as 'critical' | 'urgent' | 'moderate',
    description: '', pickupAddress: '', pickupLat: '', pickupLng: '', patientCount: '1',
  });
  const [careForm, setCareForm] = useState({
    clinicianName: '', specialty: 'Emergency Medicine', channel: 'video', notes: '',
  });
  const [vehicleForm, setVehicleForm] = useState({
    plate: '', vehicleType: 'advanced', baseAddress: '', baseLat: '', baseLng: '', crew: '',
  });

  const handleAuth = (uid: string, acc: any) => {
    setUserId(uid);
    setAccount({ ...acc, full_name: acc.full_name || acc.fullName || 'Crew Member' });
  };

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from('ambulance_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80);
    if (data) setRequests(data as AmbulanceRequest[]);
    setLoading(false);
  }, []);

  const fetchFleet = useCallback(async () => {
    const { data } = await supabase
      .from('ambulance_vehicles')
      .select('id, plate_number, vehicle_type, base_latitude, base_longitude, base_address, status, crew_names')
      .order('plate_number');
    if (data) setVehicles(data as Vehicle[]);
  }, []);

  const fetchCareSessions = useCallback(async () => {
    const { data } = await supabase
      .from('ambulance_virtual_care_sessions')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false });
    if (data) setCareSessions(data as VirtualCareSession[]);
  }, []);

  const fetchLocationPrompts = useCallback(async () => {
    const { data } = await supabase
      .from('ambulance_location_requests')
      .select('*')
      .in('status', ['pending', 'shared'])
      .order('created_at', { ascending: false });
    if (data) setLocationPrompts(data as LocationPrompt[]);
  }, []);

  const fetchHospitals = useCallback(async () => {
    const { data } = await supabase
      .from('hospitals')
      .select('id, name, city, state, address, latitude, longitude, accredited_specialties, phone')
      .eq('status', 'verified')
      .order('name');
    if (data) setHospitals(data as Hospital[]);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchRequests();
    fetchFleet();
    fetchCareSessions();
    fetchLocationPrompts();
    fetchHospitals();

    const channel = supabase
      .channel('ambulance-dispatch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_requests' }, fetchRequests)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_vehicles' }, fetchFleet)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_virtual_care_sessions' }, fetchCareSessions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_location_requests' }, fetchLocationPrompts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchRequests, fetchFleet, fetchCareSessions, fetchLocationPrompts, fetchHospitals]);

  // Continuous driver GPS feeds live distance / ETA readouts
  useEffect(() => {
    if (!userId || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setDriverGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* GPS unavailable — map falls back to the pickup point */ },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [userId]);

  const hospitalById = (id: string | null) => hospitals.find((h) => h.id === id);

  const pickupPoint = (req: AmbulanceRequest | null) => {
    if (!req) return null;
    if (req.pickup_latitude != null && req.pickup_longitude != null) {
      return { lat: req.pickup_latitude, lng: req.pickup_longitude };
    }
    const shared = locationPrompts.find(
      (p) => p.ambulance_request_id === req.id && p.status === 'shared'
        && p.latitude != null && p.longitude != null);
    return shared ? { lat: shared.latitude!, lng: shared.longitude! } : null;
  };

  const rankFacilities = (req: AmbulanceRequest): RankedHospital[] => {
    const needed = EMERGENCY_SPECIALTIES[req.emergency_type] || ['Emergency Medicine'];
    const matchedFor = (h: Hospital) =>
      needed.filter((n) => (h.accredited_specialties || []).some(
        (spec) => spec.toLowerCase().includes(n.toLowerCase().split(' ')[0])));

    const point = pickupPoint(req);
    if (!point) {
      return hospitals
        .map((h) => ({ ...h, matched: matchedFor(h) }))
        .sort((a, b) => b.matched.length - a.matched.length)
        .slice(0, 8);
    }
    return hospitals
      .filter((h) => h.latitude != null && h.longitude != null)
      .map((h) => ({
        ...h,
        matched: matchedFor(h),
        km: distanceKm(point.lat, point.lng, h.latitude!, h.longitude!),
      }))
      .sort((a, b) => {
        if (!!a.matched.length !== !!b.matched.length) return a.matched.length ? -1 : 1;
        return a.km! - b.km!;
      })
      .slice(0, 8);
  };

  const updateRequest = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('ambulance_requests').update(patch).eq('id', id);
    if (error) throw error;
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...(patch as Partial<AmbulanceRequest>) } : r)));
  };

  const releaseUnit = async (req: AmbulanceRequest) => {
    if (!req.assigned_vehicle_id) return;
    await supabase.from('ambulance_vehicles').update({ status: 'available' }).eq('id', req.assigned_vehicle_id);
    setVehicles((prev) => prev.map((v) => (v.id === req.assigned_vehicle_id ? { ...v, status: 'available' } : v)));
  };

  const endCareForRequest = async (requestId: string) => {
    const active = careSessions.filter((s) => s.request_id === requestId && s.status === 'active');
    if (!active.length) return;
    await supabase.from('ambulance_virtual_care_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .in('id', active.map((s) => s.id));
    setCareSessions((prev) => prev.filter((s) => !active.some((a) => a.id === s.id)));
  };

  const createRequest = async () => {
    if (!newReq.requesterName.trim() || !newReq.requesterPhone.trim() || !newReq.pickupAddress.trim()) {
      toast.error('Requester name, phone and pickup address are required');
      return;
    }
    setBusy('create');
    try {
      const { data, error } = await supabase
        .from('ambulance_requests')
        .insert({
          requester_name: newReq.requesterName.trim(),
          requester_phone: newReq.requesterPhone.trim(),
          emergency_type: newReq.emergencyType,
          severity: newReq.severity,
          nature_description: newReq.description.trim() || null,
          pickup_address: newReq.pickupAddress.trim(),
          pickup_latitude: newReq.pickupLat ? parseFloat(newReq.pickupLat) : null,
          pickup_longitude: newReq.pickupLng ? parseFloat(newReq.pickupLng) : null,
          patient_count: parseInt(newReq.patientCount) || 1,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      const created = data as AmbulanceRequest;
      setRequests((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setQueueFilter('active');
      setNewReqOpen(false);
      setNewReq({
        requesterName: '', requesterPhone: '', emergencyType: 'other',
        severity: 'urgent', description: '', pickupAddress: '', pickupLat: '', pickupLng: '', patientCount: '1',
      });
      toast.success('Emergency logged — assign a unit and destination');
    } catch (err: any) {
      toast.error(err.message || 'Could not log the emergency');
    } finally {
      setBusy(null);
    }
  };

  const setDestination = async (req: AmbulanceRequest, hospital: RankedHospital) => {
    setBusy(`dest:${req.id}`);
    try {
      const capability = hospital.matched.length ? hospital.matched.join(', ') : 'Emergency Medicine';
      const reason = hospital.km != null
        ? `${hospital.km.toFixed(1)} km from pickup • ${capability}`
        : capability;
      await updateRequest(req.id, {
        destination_hospital_id: hospital.id,
        destination_reason: reason,
        ...(req.status === 'pending' ? { status: 'dispatched' } : {}),
      });
      setFacilityOpen(false);
      toast.success(`Routing to ${hospital.name}`);
    } catch {
      toast.error('Could not set the destination');
    } finally {
      setBusy(null);
    }
  };

  const nearestAvailable = (req: AmbulanceRequest) => {
    const point = pickupPoint(req);
    return vehicles
      .filter((v) => v.status === 'available')
      .map((v) => ({
        vehicle: v,
        km: point && v.base_latitude != null && v.base_longitude != null
          ? distanceKm(point.lat, point.lng, v.base_latitude, v.base_longitude)
          : null,
      }))
      .sort((a, b) => {
        if (a.km == null && b.km == null) return a.vehicle.plate_number.localeCompare(b.vehicle.plate_number);
        if (a.km == null) return 1;
        if (b.km == null) return -1;
        return a.km - b.km;
      });
  };

  const assignVehicle = async (req: AmbulanceRequest, vehicle: Vehicle) => {
    setBusy(`unit:${req.id}`);
    try {
      await updateRequest(req.id, {
        assigned_vehicle_id: vehicle.id,
        ...(req.status === 'pending' ? { status: 'dispatched' } : {}),
      });
      await supabase.from('ambulance_vehicles').update({ status: 'dispatched' }).eq('id', vehicle.id);
      if (req.assigned_vehicle_id && req.assigned_vehicle_id !== vehicle.id) {
        await supabase.from('ambulance_vehicles').update({ status: 'available' }).eq('id', req.assigned_vehicle_id);
        setVehicles((prev) => prev.map((v) => (
          v.id === req.assigned_vehicle_id ? { ...v, status: 'available' } : v
        )));
      }
      setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? { ...v, status: 'dispatched' } : v)));
      setAssignOpen(false);
      toast.success(`Unit ${vehicle.plate_number} assigned`);
    } catch {
      toast.error('Could not assign the unit');
    } finally {
      setBusy(null);
    }
  };

  const autoAssignNearest = (req: AmbulanceRequest) => {
    const [first] = nearestAvailable(req);
    if (!first) {
      toast.error('No available units. Add a vehicle or release one from another mission.');
      return;
    }
    assignVehicle(req, first.vehicle);
  };

  const advanceStatus = async (req: AmbulanceRequest, next: string) => {
    setBusy(`status:${req.id}`);
    try {
      await updateRequest(req.id, { status: next });
      if (next === 'completed' || next === 'cancelled') {
        await releaseUnit(req);
        await endCareForRequest(req.id);
        toast.success(next === 'completed' ? 'Mission completed — unit released' : 'Emergency request cancelled');
      } else {
        toast.success(STATUS_META[next]?.label || `Status updated to ${next}`);
      }
    } catch {
      toast.error('Could not update the mission status');
    } finally {
      setBusy(null);
    }
  };

  const handlePrimaryAction = (req: AmbulanceRequest) => {
    const step = NEXT_STEP[req.status];
    if (!step) return;
    if (['pending', 'on-scene'].includes(req.status) && !req.destination_hospital_id) {
      setFacilityOpen(true);
      toast.info('Select a destination facility first');
      return;
    }
    advanceStatus(req, step.next);
  };

  const requestPatientLocation = async (req: AmbulanceRequest) => {
    if (!req.patient_user_id) {
      toast.error('No linked patient account — confirm the pickup point by phone instead');
      return;
    }
    setBusy(`gps:${req.id}`);
    try {
      const { error } = await supabase.from('ambulance_location_requests').insert({
        ambulance_request_id: req.id,
        patient_user_id: req.patient_user_id,
        status: 'pending',
      });
      if (error) throw error;
      await fetchLocationPrompts();
      toast.success('Live location request sent to the patient');
    } catch (err: any) {
      toast.error(err.message || 'Could not send the location request');
    } finally {
      setBusy(null);
    }
  };

  const startVirtualCare = async () => {
    const req = selectedRequest;
    if (!req) return;
    if (!careForm.clinicianName.trim()) {
      toast.error('Enter the responding clinician name');
      return;
    }
    setBusy('care:start');
    try {
      const { data, error } = await supabase
        .from('ambulance_virtual_care_sessions')
        .insert({
          request_id: req.id,
          clinician_name: careForm.clinicianName.trim(),
          clinician_specialty: careForm.specialty,
          channel: careForm.channel,
          status: 'active',
          notes: careForm.notes.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      setCareSessions((prev) => [data as VirtualCareSession, ...prev]);
      setCareOpen(false);
      setCareForm({ clinicianName: '', specialty: 'Emergency Medicine', channel: 'video', notes: '' });
      toast.success('Virtual care started — share the secure link with the patient');
    } catch (err: any) {
      toast.error(err.message || 'Could not start virtual care');
    } finally {
      setBusy(null);
    }
  };

  const endCareSession = async (session: VirtualCareSession) => {
    try {
      const { error } = await supabase
        .from('ambulance_virtual_care_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', session.id);
      if (error) throw error;
      setCareSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast.success('Virtual care session ended');
    } catch {
      toast.error('Could not end the session');
    }
  };

  const saveCareNote = async (session: VirtualCareSession, text: string) => {
    try {
      const { error } = await supabase
        .from('ambulance_virtual_care_sessions')
        .update({ notes: text.trim() || null })
        .eq('id', session.id);
      if (error) throw error;
      setCareSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, notes: text.trim() || null } : s)));
      toast.success('Care note saved');
    } catch {
      toast.error('Could not save the note');
    }
  };

  const copyText = async (text: string, label = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error('Clipboard is not available in this browser');
    }
  };

  const addVehicle = async () => {
    if (!vehicleForm.plate.trim()) {
      toast.error('Plate number is required');
      return;
    }
    setBusy('vehicle:add');
    try {
      const { error } = await supabase.from('ambulance_vehicles').insert({
        plate_number: vehicleForm.plate.trim().toUpperCase(),
        vehicle_type: vehicleForm.vehicleType,
        base_address: vehicleForm.baseAddress.trim() || null,
        base_latitude: vehicleForm.baseLat ? parseFloat(vehicleForm.baseLat) : null,
        base_longitude: vehicleForm.baseLng ? parseFloat(vehicleForm.baseLng) : null,
        crew_names: vehicleForm.crew.split(',').map((c) => c.trim()).filter(Boolean),
        status: 'available',
      });
      if (error) throw error;
      setVehicleOpen(false);
      setVehicleForm({ plate: '', vehicleType: 'advanced', baseAddress: '', baseLat: '', baseLng: '', crew: '' });
      await fetchFleet();
      toast.success('Unit added to the fleet');
    } catch (err: any) {
      toast.error(err.message || 'Could not add the unit');
    } finally {
      setBusy(null);
    }
  };

  const captureGps = (target: 'request' | 'vehicle') => {
    if (!navigator.geolocation) {
      toast.error('GPS is not available on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        if (target === 'request') setNewReq((f) => ({ ...f, pickupLat: lat, pickupLng: lng }));
        else setVehicleForm((f) => ({ ...f, baseLat: lat, baseLng: lng }));
        toast.success('GPS captured');
      },
      () => toast.error('Could not read GPS. Check location permission.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAccount(null);
    setUserId(null);
    setRequests([]);
    setVehicles([]);
    setCareSessions([]);
    setLocationPrompts([]);
    setSelectedId(null);
  };

  const activeRequests = useMemo(
    () => requests.filter((r) => !['completed', 'cancelled'].includes(r.status)),
    [requests],
  );

  const sortedActive = useMemo(() => [...activeRequests].sort((a, b) => {
    const ra = SEVERITY_META[a.severity]?.rank ?? 3;
    const rb = SEVERITY_META[b.severity]?.rank ?? 3;
    return ra - rb || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [activeRequests]);

  useEffect(() => {
    if (selectedId && requests.some((r) => r.id === selectedId)) return;
    setSelectedId(sortedActive[0]?.id ?? requests[0]?.id ?? null);
  }, [requests, sortedActive, selectedId]);

  const visibleRequests = useMemo(() => {
    const base = queueFilter === 'closed'
      ? requests.filter((r) => ['completed', 'cancelled'].includes(r.status))
      : queueFilter === 'transporting'
        ? requests.filter((r) => r.status === 'transporting')
        : activeRequests;
    const term = search.trim().toLowerCase();
    const filtered = term
      ? base.filter((r) =>
        r.requester_name.toLowerCase().includes(term) ||
        r.pickup_address.toLowerCase().includes(term) ||
        r.requester_phone.toLowerCase().includes(term) ||
        r.emergency_type.toLowerCase().includes(term))
      : base;
    const sorted = queueFilter === 'closed'
      ? [...filtered].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      : [...filtered].sort((a, b) => {
        const ra = SEVERITY_META[a.severity]?.rank ?? 3;
        const rb = SEVERITY_META[b.severity]?.rank ?? 3;
        return ra - rb || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    return sorted.slice(0, 40);
  }, [requests, activeRequests, queueFilter, search]);

  const selectedRequest = requests.find((r) => r.id === selectedId) || null;
  const selectedDest = selectedRequest ? hospitalById(selectedRequest.destination_hospital_id) : undefined;
  const selectedUnit = selectedRequest?.assigned_vehicle_id
    ? vehicles.find((v) => v.id === selectedRequest.assigned_vehicle_id)
    : undefined;
  const activeCare = selectedRequest
    ? careSessions.find((s) => s.request_id === selectedRequest.id && s.status === 'active')
    : undefined;
  const rankedFacilities = selectedRequest ? rankFacilities(selectedRequest) : [];
  const rankedUnits = selectedRequest ? nearestAvailable(selectedRequest) : [];
  const selectedCareNote = activeCare
    ? (noteDraft?.id === activeCare.id ? noteDraft.text : activeCare.notes || '')
    : '';

  const routeOrigin = selectedRequest ? (driverGps ?? pickupPoint(selectedRequest)) : null;
  const routeKm = selectedDest && routeOrigin && selectedDest.latitude != null && selectedDest.longitude != null
    ? distanceKm(routeOrigin.lat, routeOrigin.lng, selectedDest.latitude, selectedDest.longitude)
    : null;

  const buildHandoff = (req: AmbulanceRequest) => {
    const dest = hospitalById(req.destination_hospital_id);
    const unit = req.assigned_vehicle_id ? vehicles.find((v) => v.id === req.assigned_vehicle_id) : undefined;
    const care = careSessions.find((s) => s.request_id === req.id && s.status === 'active');
    const point = pickupPoint(req);
    return [
      `UHES AMBULANCE HANDOFF — #${req.id.slice(0, 8).toUpperCase()}`,
      `Emergency: ${req.emergency_type} (${req.severity})`,
      `Status: ${STATUS_META[req.status]?.label || req.status}`,
      `Patient(s): ${req.patient_count} — ${req.requester_name} (${req.requester_phone})`,
      `Pickup: ${req.pickup_address}${point ? ` [${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}]` : ''}`,
      req.nature_description ? `Nature: ${req.nature_description}` : '',
      `Destination: ${dest ? `${dest.name}, ${dest.city} ${dest.state}` : 'Not set'}`,
      `Unit: ${unit ? `${unit.plate_number} (${VEHICLE_TYPE_LABEL[unit.vehicle_type] || unit.vehicle_type})` : 'Unassigned'}`,
      `Requested: ${new Date(req.created_at).toLocaleString()}`,
      care ? `Virtual care: ${care.clinician_name}${care.clinician_specialty ? ` (${care.clinician_specialty})` : ''} — ${care.channel}` : '',
      care?.notes ? `Care note: ${care.notes}` : '',
    ].filter(Boolean).join('\n');
  };

  const handoffText = selectedRequest ? buildHandoff(selectedRequest) : '';

  if (!userId || !account) {
    return <AmbulanceAuth onLogin={handleAuth} />;
  }

  const criticalCount = activeRequests.filter((r) => r.severity === 'critical').length;
  const unassignedCount = activeRequests.filter((r) => !r.assigned_vehicle_id).length;
  const availableUnits = vehicles.filter((v) => v.status === 'available').length;
  const transportingCount = activeRequests.filter((r) => r.status === 'transporting').length;

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-red-500/10 p-2">
              <Ambulance className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Telemed-X EMS Dispatch</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {account.full_name} · {account.role}
                {account.organization_name ? ` · ${account.organization_name}` : ''}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Badge variant="outline" className="hidden gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 md:inline-flex">
              <Siren className="h-3 w-3" /> On duty
            </Badge>
            <Badge variant="outline" className="hidden gap-1 lg:inline-flex">
              {driverGps ? (
                <><LocateFixed className="h-3 w-3 text-sky-600" /> GPS live</>
              ) : (
                <><LocateFixed className="h-3 w-3 text-muted-foreground" /> Acquiring GPS…</>
              )}
            </Badge>
            <Button size="sm" variant="outline" className="h-8 gap-1 px-2 sm:px-3"
              onClick={() => setVehicleOpen(true)} title="Add unit" aria-label="Add unit">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add unit</span>
            </Button>
            <Button size="sm" className="h-8 gap-1 bg-red-600 px-2 text-white hover:bg-red-700 sm:px-3"
              onClick={() => setNewReqOpen(true)} title="New emergency" aria-label="New emergency">
              <Siren className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New emergency</span>
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={signOut} title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          <Kpi icon={Activity} label="Active missions" value={activeRequests.length}
            hint={`${transportingCount} transporting`} tone="bg-primary/10 text-primary" />
          <Kpi icon={AlertTriangle} label="Critical" value={criticalCount}
            hint="Needs immediate response" tone="bg-red-500/10 text-red-600" />
          <Kpi icon={Radio} label="Awaiting dispatch" value={unassignedCount}
            hint="No unit assigned" tone="bg-orange-500/10 text-orange-600" />
          <Kpi icon={Truck} label="Units available" value={availableUnits}
            hint={`${vehicles.length} in fleet`} tone="bg-sky-500/10 text-sky-600" />
          <Kpi icon={HeartPulse} label="Virtual care live" value={careSessions.length}
            hint="Patients in transit" tone="bg-purple-500/10 text-purple-600" />
        </div>

        {careSessions.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Live virtual care
            </h2>
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {careSessions.map((s) => {
                const req = requests.find((r) => r.id === s.request_id);
                return (
                  <Card key={s.id} className="border-red-500/30 bg-red-500/5">
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">
                          <Video className="h-3.5 w-3.5" /> {s.channel}
                        </p>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {req?.emergency_type || 'emergency'}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold">{s.clinician_name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {s.clinician_specialty || 'Emergency Medicine'} · {req?.pickup_address || 'Unknown pickup'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
                          onClick={() => req && copyText(careRoomLink(req.id), 'Secure care link copied')}>
                          <Copy className="h-3 w-3" /> Copy link
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
                          onClick={() => req && window.open(careRoomLink(req.id), '_blank', 'noopener,noreferrer')}>
                          <ExternalLink className="h-3 w-3" /> Open room
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 text-[11px]"
                          onClick={() => endCareSession(s)}>
                          <XCircle className="h-3 w-3" /> End
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* Priority queue */}
          <Card className="h-fit lg:sticky lg:top-[68px]">
            <CardHeader className="space-y-2 p-3 pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Route className="h-4 w-4 text-primary" /> Priority queue</span>
                <Badge variant="secondary" className="text-[10px]">{visibleRequests.length}</Badge>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, address, phone…" className="h-8 pl-8 text-xs" />
              </div>
              <Tabs value={queueFilter} onValueChange={(v) => setQueueFilter(v as typeof queueFilter)}>
                <TabsList className="grid h-8 w-full grid-cols-3">
                  <TabsTrigger value="active" className="text-[11px]">Active</TabsTrigger>
                  <TabsTrigger value="transporting" className="text-[11px]">Transporting</TabsTrigger>
                  <TabsTrigger value="closed" className="text-[11px]">Closed</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-1.5 p-2 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : visibleRequests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-10 text-center">
                  <Ambulance className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs font-medium text-muted-foreground">No requests in this view</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                    New emergencies arrive here in real time
                  </p>
                </div>
              ) : (
                visibleRequests.map((req) => {
                  const sev = SEVERITY_META[req.severity] || SEVERITY_META.urgent;
                  const status = STATUS_META[req.status] || STATUS_META.pending;
                  const dest = hospitalById(req.destination_hospital_id);
                  const unit = req.assigned_vehicle_id ? vehicles.find((v) => v.id === req.assigned_vehicle_id) : undefined;
                  const isSelected = req.id === selectedId;
                  return (
                    <button
                      key={req.id}
                      onClick={() => {
                        setSelectedId(req.id);
                        if (window.matchMedia('(max-width: 1023px)').matches) {
                          requestAnimationFrame(() => {
                            document.getElementById('mission-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          });
                        }
                      }}
                      className={`w-full rounded-lg border border-l-4 border-border bg-card p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 ${sev.ring} ${isSelected ? 'ring-2 ring-primary/30 bg-accent/60' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[9px] font-bold uppercase ${sev.chip}`}>{sev.label}</Badge>
                        <Badge variant="outline" className={`text-[9px] ${status.chip}`}>{status.label}</Badge>
                        <span className="ml-auto text-[10px] text-muted-foreground">{elapsedLabel(req.created_at)}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold">{req.requester_name}</p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" /> {req.pickup_address}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="capitalize">{req.emergency_type}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{req.patient_count}</span>
                        {unit && (
                          <><span>·</span><span className="flex items-center gap-0.5"><Truck className="h-2.5 w-2.5" />{unit.plate_number}</span></>
                        )}
                        {dest && (
                          <><span className="ml-auto">→</span><span className="max-w-[90px] truncate">{dest.name}</span></>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Mission workspace */}
          {!selectedRequest ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                <Ambulance className="h-12 w-12 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">No mission selected</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Pick a request from the priority queue, or log a new emergency to start dispatch.
                </p>
                <Button size="sm" className="mt-2 gap-1" onClick={() => setNewReqOpen(true)}>
                  <Siren className="h-3.5 w-3.5" /> New emergency
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div id="mission-workspace" className="min-w-0 scroll-mt-24 space-y-3">
              {/* Mission header */}
              <Card>
                <CardContent className="space-y-3 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase ${(SEVERITY_META[selectedRequest.severity] || SEVERITY_META.urgent).chip}`}>
                          {(SEVERITY_META[selectedRequest.severity] || SEVERITY_META.urgent).label}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${(STATUS_META[selectedRequest.status] || STATUS_META.pending).chip}`}>
                          {(STATUS_META[selectedRequest.status] || STATUS_META.pending).label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{selectedRequest.emergency_type}</Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #{selectedRequest.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {elapsedLabel(selectedRequest.created_at)}
                        </span>
                      </div>
                      <h2 className="mt-1 text-lg font-bold leading-tight">{selectedRequest.requester_name}</h2>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {selectedRequest.pickup_address}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 gap-1" asChild>
                        <a href={telHref(selectedRequest.requester_phone)}>
                          <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1" asChild>
                        <a href={smsHref(selectedRequest.requester_phone, `UHES ambulance en route to ${selectedRequest.pickup_address}. Reply with your exact location.`)}>
                          <MessageSquare className="h-3.5 w-3.5" /> SMS
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setHandoffOpen(true)}>
                        <Send className="h-3.5 w-3.5" /> Handoff
                      </Button>
                    </div>
                  </div>

                  {/* Status stepper */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {STAGES.map((stage, idx) => {
                      const currentIdx = STAGES.indexOf(selectedRequest.status);
                      const done = currentIdx > idx;
                      const current = currentIdx === idx;
                      return (
                        <div key={stage} className="flex shrink-0 items-center gap-1">
                          {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                          <span className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] capitalize ${
                            current
                              ? 'border-primary bg-primary/10 font-semibold text-primary'
                              : done
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                                : 'border-border text-muted-foreground'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              current ? 'bg-primary' : done ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                            }`} />
                            {stage.replace('-', ' ')}
                          </span>
                        </div>
                      );
                    })}
                    {selectedRequest.status === 'cancelled' && (
                      <Badge variant="outline" className="ml-1 text-[10px] border-red-500/30 bg-red-500/10 text-red-700">
                        Cancelled
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {NEXT_STEP[selectedRequest.status] && (
                      <Button size="sm" className="h-8 gap-1"
                        disabled={busy === `status:${selectedRequest.id}`}
                        onClick={() => handlePrimaryAction(selectedRequest)}>
                        {busy === `status:${selectedRequest.id}`
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ArrowRight className="h-3.5 w-3.5" />}
                        {NEXT_STEP[selectedRequest.status].label}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setFacilityOpen(true)}>
                      <Building2 className="h-3.5 w-3.5" />
                      {selectedDest ? 'Change facility' : 'Select facility'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setAssignOpen(true)}>
                      <Truck className="h-3.5 w-3.5" />
                      {selectedUnit ? `Reassign ${selectedUnit.plate_number}` : 'Assign unit'}
                    </Button>
                    {selectedRequest.patient_user_id && !pickupPoint(selectedRequest) && (
                      <Button size="sm" variant="outline" className="h-8 gap-1"
                        disabled={busy === `gps:${selectedRequest.id}`}
                        onClick={() => requestPatientLocation(selectedRequest)}>
                        <Crosshair className="h-3.5 w-3.5" /> Request patient GPS
                      </Button>
                    )}
                    {activeCare ? (
                      <Button size="sm" variant="outline" className="h-8 gap-1"
                        onClick={() => window.open(careRoomLink(selectedRequest.id), '_blank', 'noopener,noreferrer')}>
                        <Video className="h-3.5 w-3.5 text-red-600" /> Join virtual care
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setCareOpen(true)}>
                        <Stethoscope className="h-3.5 w-3.5" /> Start virtual care
                      </Button>
                    )}
                    {!['completed', 'cancelled'].includes(selectedRequest.status) && (
                      <Button size="sm" variant="ghost" className="h-8 gap-1 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                        onClick={() => setCancelOpen(true)}>
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-2">
                {/* Incident details */}
                <Card>
                  <CardHeader className="p-3 pb-1.5">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" /> Incident
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0 text-sm">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Patient count</p>
                        <p className="font-medium">{selectedRequest.patient_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Requester phone</p>
                        <a href={telHref(selectedRequest.requester_phone)} className="font-medium text-primary hover:underline">
                          {selectedRequest.requester_phone}
                        </a>
                      </div>
                    </div>
                    {selectedRequest.nature_description ? (
                      <p className="rounded-md bg-muted/60 p-2 text-xs leading-relaxed">{selectedRequest.nature_description}</p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">No incident description provided.</p>
                    )}
                    <Separator />
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium">{selectedRequest.pickup_address}</p>
                        {pickupPoint(selectedRequest) ? (
                          <p className="text-muted-foreground">
                            {pickupPoint(selectedRequest)!.lat.toFixed(5)}, {pickupPoint(selectedRequest)!.lng.toFixed(5)}
                            {selectedRequest.pickup_latitude == null && ' · shared by patient'}
                          </p>
                        ) : (
                          <p className="text-amber-600">No GPS — confirm pickup by phone</p>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const prompt = locationPrompts.find((p) => p.ambulance_request_id === selectedRequest.id);
                      if (!prompt) return null;
                      return (
                        <Badge variant="outline" className={`text-[10px] ${
                          prompt.status === 'shared'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                            : prompt.status === 'declined'
                              ? 'border-red-500/30 bg-red-500/10 text-red-700'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                        }`}>
                          <Crosshair className="mr-1 h-3 w-3" />
                          Patient GPS {prompt.status}
                        </Badge>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Destination */}
                <Card>
                  <CardHeader className="p-3 pb-1.5">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" /> Destination facility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0">
                    {selectedDest ? (
                      <>
                        <p className="text-sm font-semibold">{selectedDest.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedDest.address || `${selectedDest.city}, ${selectedDest.state}`}
                        </p>
                        {selectedRequest.destination_reason && (
                          <p className="text-[11px] text-emerald-700">{selectedRequest.destination_reason}</p>
                        )}
                        {routeKm != null && (
                          <p className="flex items-center gap-2 text-xs">
                            <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">~{routeKm.toFixed(1)} km</span>
                            <span className="text-muted-foreground">· est. {etaMinutes(routeKm)} min</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              {driverGps ? 'from live unit GPS' : 'from pickup'}
                            </span>
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedDest.latitude != null && selectedDest.longitude != null && (
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
                              onClick={() => openRoute(
                                selectedDest.latitude!, selectedDest.longitude!, selectedDest.name,
                                routeOrigin?.lat, routeOrigin?.lng)}>
                              <Navigation className="h-3 w-3" /> Navigate
                            </Button>
                          )}
                          {selectedDest.phone && (
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" asChild>
                              <a href={telHref(selectedDest.phone)}>
                                <Phone className="h-3 w-3" /> Hospital
                              </a>
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-3 text-center">
                        <Building2 className="mx-auto mb-1 h-6 w-6 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">No receiving facility selected</p>
                        <Button size="sm" variant="outline" className="mt-2 h-7 gap-1 text-[11px]"
                          onClick={() => setFacilityOpen(true)}>
                          <MapPin className="h-3 w-3" /> Suggest facilities
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assigned unit */}
                <Card>
                  <CardHeader className="p-3 pb-1.5">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" /> Assigned unit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0">
                    {selectedUnit ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-base font-bold">{selectedUnit.plate_number}</p>
                          <Badge variant="outline" className={`text-[10px] ${selectedUnit.status === 'dispatched' ? 'border-blue-500/40 bg-blue-500/10 text-blue-700' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'}`}>
                            {selectedUnit.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {VEHICLE_TYPE_LABEL[selectedUnit.vehicle_type] || selectedUnit.vehicle_type}
                        </p>
                        {selectedUnit.crew_names && selectedUnit.crew_names.length > 0 && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" /> {selectedUnit.crew_names.join(', ')}
                          </p>
                        )}
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setAssignOpen(true)}>
                          <Truck className="h-3 w-3" /> Reassign
                        </Button>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-3 text-center">
                        <Truck className="mx-auto mb-1 h-6 w-6 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">No unit assigned</p>
                        <Button size="sm" variant="outline" className="mt-2 h-7 gap-1 text-[11px]"
                          disabled={busy === `unit:${selectedRequest.id}`}
                          onClick={() => autoAssignNearest(selectedRequest)}>
                          <LocateFixed className="h-3 w-3" /> Auto-assign nearest
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Virtual care */}
                <Card className={activeCare ? 'border-red-500/30 bg-red-500/5' : ''}>
                  <CardHeader className="p-3 pb-1.5">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Video className="h-3.5 w-3.5" /> Virtual care
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0">
                    {activeCare ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{activeCare.clinician_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {activeCare.clinician_specialty || 'Emergency Medicine'} · {activeCare.channel}
                            </p>
                          </div>
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                          </span>
                        </div>
                        <Textarea
                          rows={2}
                          placeholder="Pre-arrival / care notes…"
                          value={selectedCareNote}
                          onChange={(e) => setNoteDraft({ id: activeCare.id, text: e.target.value })}
                          className="text-xs"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" className="h-7 gap-1 text-[11px]"
                            onClick={() => saveCareNote(activeCare, selectedCareNote)}>
                            <ClipboardCheck className="h-3 w-3" /> Save note
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
                            onClick={() => copyText(careRoomLink(selectedRequest.id), 'Secure care link copied')}>
                            <Copy className="h-3 w-3" /> Copy link
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" asChild>
                            <a href={smsHref(selectedRequest.requester_phone,
                              `UHES virtual care: join the secure video room at ${careRoomLink(selectedRequest.id)}`)}>
                              <Send className="h-3 w-3" /> Text patient
                            </a>
                          </Button>
                          <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 text-[11px]"
                            onClick={() => endCareSession(activeCare)}>
                            <XCircle className="h-3 w-3" /> End
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-3 text-center">
                        <Stethoscope className="mx-auto mb-1 h-6 w-6 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">No remote clinician connected</p>
                        <Button size="sm" variant="outline" className="mt-2 h-7 gap-1 text-[11px]"
                          onClick={() => setCareOpen(true)}>
                          <Video className="h-3 w-3" /> Start session
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Live route map */}
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-3 pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Navigation className="h-3.5 w-3.5" /> Live route
                  </CardTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {pickupPoint(selectedRequest) && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
                        onClick={() => openRoute(
                          pickupPoint(selectedRequest)!.lat, pickupPoint(selectedRequest)!.lng,
                          selectedRequest.pickup_address, driverGps?.lat, driverGps?.lng)}>
                        <MapPin className="h-3 w-3" /> To pickup
                      </Button>
                    )}
                    {selectedDest && selectedDest.latitude != null && selectedDest.longitude != null && (
                      <Button size="sm" className="h-7 gap-1 text-[11px]"
                        onClick={() => openRoute(
                          selectedDest.latitude!, selectedDest.longitude!, selectedDest.name,
                          routeOrigin?.lat, routeOrigin?.lng)}>
                        <Navigation className="h-3 w-3" /> To facility
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {selectedDest && selectedDest.latitude != null && selectedDest.longitude != null && routeOrigin ? (
                  <div className="border-t border-border">
                    <iframe
                      title={`Route to ${selectedDest.name}`}
                      src={`https://maps.google.com/maps?saddr=${routeOrigin.lat},${routeOrigin.lng}&daddr=${selectedDest.latitude},${selectedDest.longitude}&z=12&output=embed`}
                      className="h-64 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : (
                  <CardContent className="p-4 text-center text-xs text-muted-foreground">
                    Route appears once a destination facility and coordinates are available.
                    Unit GPS: {driverGps ? 'acquired' : 'acquiring…'}
                  </CardContent>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Log new emergency */}
      <Dialog open={newReqOpen} onOpenChange={setNewReqOpen}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Siren className="h-4 w-4 text-red-600" /> Log emergency request
            </DialogTitle>
            <DialogDescription>
              Capture the incident, set the pickup point and dispatch the closest capable unit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Requester name *</Label>
                <Input value={newReq.requesterName}
                  onChange={(e) => setNewReq({ ...newReq, requesterName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Requester phone *</Label>
                <Input placeholder="+234 800 000 0000" value={newReq.requesterPhone}
                  onChange={(e) => setNewReq({ ...newReq, requesterPhone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Emergency type *</Label>
                <Select value={newReq.emergencyType} onValueChange={(v) => setNewReq({ ...newReq, emergencyType: v })}>
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
                <Select value={newReq.severity}
                  onValueChange={(v) => setNewReq({ ...newReq, severity: v as typeof newReq.severity })}>
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
              <Input placeholder="Where is the patient?" value={newReq.pickupAddress}
                onChange={(e) => setNewReq({ ...newReq, pickupAddress: e.target.value })} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Pickup coordinates</Label>
                <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 text-[11px]"
                  onClick={() => captureGps('request')}>
                  <LocateFixed className="h-3 w-3" /> Use my GPS
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Latitude" value={newReq.pickupLat}
                  onChange={(e) => setNewReq({ ...newReq, pickupLat: e.target.value })} />
                <Input placeholder="Longitude" value={newReq.pickupLng}
                  onChange={(e) => setNewReq({ ...newReq, pickupLng: e.target.value })} />
                <Input type="number" min="1" max="10" placeholder="Patients" value={newReq.patientCount}
                  onChange={(e) => setNewReq({ ...newReq, patientCount: e.target.value })} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Coordinates enable facility routing and driver navigation. Without them the crew confirms the pickup by phone.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Nature of emergency</Label>
              <Textarea rows={2} placeholder="Patient condition, mechanism of injury, hazards…"
                value={newReq.description}
                onChange={(e) => setNewReq({ ...newReq, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewReqOpen(false)}>Cancel</Button>
            <Button className="gap-1 bg-red-600 text-white hover:bg-red-700" onClick={createRequest} disabled={busy === 'create'}>
              {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Siren className="h-4 w-4" />}
              Log emergency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Facility selection */}
      <Dialog open={facilityOpen} onOpenChange={setFacilityOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Receiving facility
            </DialogTitle>
            <DialogDescription>
              Ranked by capability for this emergency type
              {pickupPoint(selectedRequest) ? ' and distance from the pickup point' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {rankedFacilities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No verified facilities with coordinates are available.
              </p>
            ) : rankedFacilities.map((h) => (
              <button
                key={h.id}
                onClick={() => selectedRequest && setDestination(selectedRequest, h)}
                disabled={!!busy?.startsWith('dest:')}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/50 disabled:opacity-60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{h.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {h.address || `${h.city}, ${h.state}`}
                    {h.km != null && ` · ~${h.km.toFixed(1)} km · ${etaMinutes(h.km)} min`}
                  </p>
                  {h.matched.length > 0 && (
                    <p className="truncate text-[10px] text-emerald-700">Capable: {h.matched.join(', ')}</p>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {h.latitude != null ? 'Route' : 'Select'}
                </Badge>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFacilityOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit assignment */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Assign response unit
            </DialogTitle>
            <DialogDescription>
              Available units sorted by distance to the pickup point. Selecting a unit marks it dispatched.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {selectedRequest && (
              <Button variant="outline" className="w-full gap-1"
                disabled={rankedUnits.length === 0 || busy === `unit:${selectedRequest.id}`}
                onClick={() => autoAssignNearest(selectedRequest)}>
                <LocateFixed className="h-4 w-4" /> Auto-assign nearest available unit
              </Button>
            )}
            {rankedUnits.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No available units right now. Add a vehicle or complete another mission to free one up.
              </p>
            ) : rankedUnits.map(({ vehicle, km }) => (
              <button
                key={vehicle.id}
                onClick={() => selectedRequest && assignVehicle(selectedRequest, vehicle)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <div className="rounded-lg bg-sky-500/10 p-2 text-sky-600">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold">{vehicle.plate_number}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {VEHICLE_TYPE_LABEL[vehicle.vehicle_type] || vehicle.vehicle_type}
                    {vehicle.crew_names?.length ? ` · ${vehicle.crew_names.join(', ')}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {km != null ? `~${km.toFixed(1)} km` : 'base n/a'}
                </span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignOpen(false); setVehicleOpen(true); }}>
              <Plus className="h-4 w-4" /> Add unit
            </Button>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start virtual care */}
      <Dialog open={careOpen} onOpenChange={setCareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-4 w-4 text-red-600" /> Start virtual care
            </DialogTitle>
            <DialogDescription>
              Connect a remote clinician to the crew and patient while the unit is in transit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Responding clinician *</Label>
              <Input placeholder="Dr. name" value={careForm.clinicianName}
                onChange={(e) => setCareForm({ ...careForm, clinicianName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Specialty</Label>
                <Select value={careForm.specialty} onValueChange={(v) => setCareForm({ ...careForm, specialty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Emergency Medicine', 'Cardiology', 'Trauma Surgery', 'Neurology', 'Pulmonology', 'Obstetrics', 'Pediatrics'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Channel</Label>
                <Select value={careForm.channel} onValueChange={(v) => setCareForm({ ...careForm, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Care notes</Label>
              <Textarea rows={2} placeholder="Pre-arrival instructions for the crew…"
                value={careForm.notes}
                onChange={(e) => setCareForm({ ...careForm, notes: e.target.value })} />
            </div>
            <p className="rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">
              A secure Jitsi room is created for this mission. Share the link with the patient by SMS
              from the virtual care panel.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCareOpen(false)}>Cancel</Button>
            <Button onClick={startVirtualCare} disabled={busy === 'care:start'} className="gap-1">
              {busy === 'care:start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Start session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handoff */}
      <Dialog open={handoffOpen} onOpenChange={setHandoffOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Patient handoff summary
            </DialogTitle>
            <DialogDescription>
              Share the pre-arrival report with the receiving facility or the incoming crew.
            </DialogDescription>
          </DialogHeader>
          <Textarea readOnly rows={12} value={handoffText} className="font-mono text-[11px]" />
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" className="gap-1" onClick={() => copyText(handoffText, 'Handoff copied')}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
            {selectedDest?.phone && (
              <Button variant="outline" className="gap-1" asChild>
                <a href={smsHref(selectedDest.phone, handoffText)}>
                  <Send className="h-4 w-4" /> Text facility
                </a>
              </Button>
            )}
            <Button className="ml-auto" onClick={() => setHandoffOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add vehicle */}
      <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Add fleet unit
            </DialogTitle>
            <DialogDescription>
              Register an ambulance with its home base so dispatch can route the closest unit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Plate number *</Label>
                <Input placeholder="LAG-123-XY" value={vehicleForm.plate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Capability</Label>
                <Select value={vehicleForm.vehicleType} onValueChange={(v) => setVehicleForm({ ...vehicleForm, vehicleType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic life support</SelectItem>
                    <SelectItem value="advanced">Advanced life support</SelectItem>
                    <SelectItem value="icu">Mobile ICU</SelectItem>
                    <SelectItem value="rapid-response">Rapid response</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Base address</Label>
              <Input placeholder="Station / hospital" value={vehicleForm.baseAddress}
                onChange={(e) => setVehicleForm({ ...vehicleForm, baseAddress: e.target.value })} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Base coordinates</Label>
                <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 text-[11px]"
                  onClick={() => captureGps('vehicle')}>
                  <LocateFixed className="h-3 w-3" /> Use my GPS
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Latitude" value={vehicleForm.baseLat}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, baseLat: e.target.value })} />
                <Input placeholder="Longitude" value={vehicleForm.baseLng}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, baseLng: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Crew</Label>
              <Input placeholder="Comma separated names" value={vehicleForm.crew}
                onChange={(e) => setVehicleForm({ ...vehicleForm, crew: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleOpen(false)}>Cancel</Button>
            <Button onClick={addVehicle} disabled={busy === 'vehicle:add'} className="gap-1">
              {busy === 'vehicle:add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel mission */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this emergency mission?</AlertDialogTitle>
            <AlertDialogDescription>
              The request will be closed, the assigned unit released and any live virtual care ended.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep mission</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedRequest) advanceStatus(selectedRequest, 'cancelled');
                setCancelOpen(false);
              }}>
              Cancel mission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fleet snapshot (compact footer) */}
      {vehicles.length > 0 && (
        <div className="mx-auto max-w-[1600px] px-3 pb-6 sm:px-4">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-3">
              <p className="mr-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Truck className="h-3.5 w-3.5" /> Fleet
              </p>
              {vehicles.map((v) => (
                <Badge key={v.id} variant="outline"
                  className={`text-[10px] ${
                    v.status === 'available'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                      : v.status === 'dispatched'
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-700'
                        : 'border-border text-muted-foreground'
                  }`}>
                  {v.plate_number} · {v.status}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
