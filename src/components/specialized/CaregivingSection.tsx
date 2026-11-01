import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  HandHeart, ClipboardList, Calendar, Plus, CheckCircle, Clock, Loader2, User, Stethoscope, Home, Trash2, Search, MapPin, Building2, Send, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface CaregivingSectionProps {
  patientUserId: string;
  patientName: string;
}

const TASK_CATEGORIES = [
  { value: 'medication', label: '💊 Medication' },
  { value: 'appointment', label: '📅 Appointment' },
  { value: 'exercise', label: '🏃 Exercise' },
  { value: 'meal', label: '🍎 Meal/Nutrition' },
  { value: 'hygiene', label: '🛁 Hygiene' },
  { value: 'general', label: '📋 General' },
];

const VISIT_TYPES = [
  { value: 'home_visit', label: 'Home Visit' },
  { value: 'checkup', label: 'Check-up' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'nursing', label: 'Nursing Care' },
];

export function CaregivingSection({ patientUserId, patientName }: CaregivingSectionProps) {
  const [tab, setTab] = useState('tasks');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
          <HandHeart className="h-5 w-5 text-pink-600" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-foreground">Request Care Giver</h2>
          <p className="text-xs text-muted-foreground">For sick, recovering, disabled, or elderly patients</p>
        </div>
      </div>

      {/* Info banner */}
      <Card className="border-pink-200 bg-pink-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <HandHeart className="h-5 w-5 text-pink-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Who is this for?</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                <li>Patients recovering from surgery or illness at home</li>
                <li>Elderly patients needing daily assistance</li>
                <li>Patients with disabilities or mobility impairments</li>
                <li>Chronically ill patients requiring ongoing home care</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tasks">
            <ClipboardList className="h-3 w-3 mr-1" /> Care Tasks
          </TabsTrigger>
          <TabsTrigger value="directory">
            <Search className="h-3 w-3 mr-1" /> Find Care
          </TabsTrigger>
          <TabsTrigger value="visits">
            <Home className="h-3 w-3 mr-1" /> Home Visits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <CareTasksPanel patientUserId={patientUserId} />
        </TabsContent>
        <TabsContent value="directory" className="mt-4">
          <CareDirectoryPanel patientUserId={patientUserId} />
        </TabsContent>
        <TabsContent value="visits" className="mt-4">
          <CareVisitsPanel patientUserId={patientUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface CaregiverDirectoryProfile {
  id: string;
  full_name: string;
  phone: string | null;
  relationship: string;
  specialty: string | null;
}

interface CareFacility {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  description: string | null;
  accredited_specialties: string[] | null;
}

function CareDirectoryPanel({ patientUserId }: { patientUserId: string }) {
  const [caregivers, setCaregivers] = useState<CaregiverDirectoryProfile[]>([]);
  const [facilities, setFacilities] = useState<CareFacility[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [requestTarget, setRequestTarget] = useState<{ type: 'caregiver' | 'facility'; id: string; name: string } | null>(null);
  const [form, setForm] = useState({ service_type: 'home_visit', preferred_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchDirectory = async () => {
    setLoading(true);
    const caregiversRes = await supabase
      .from('caregiver_profiles')
      .select('id, full_name, phone, relationship, specialty')
      .eq('is_professional', true)
      .eq('status', 'active')
      .order('full_name');
    const facilitiesRes = await supabase
      .from('hospitals')
      .select('id, name, address, city, state, phone, description, accredited_specialties')
      .eq('status', 'active')
      .order('name');
    const requestsRes = await supabase
      .from('care_service_requests')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (caregiversRes.data) setCaregivers(caregiversRes.data as unknown as CaregiverDirectoryProfile[]);
    if (facilitiesRes.data) setFacilities(facilitiesRes.data as unknown as CareFacility[]);
    if (requestsRes.data) setRequests(requestsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchDirectory(); }, [patientUserId]);

  const submitRequest = async () => {
    if (!requestTarget) return;
    setSaving(true);
    const { error } = await supabase.from('care_service_requests').insert({
      patient_user_id: patientUserId,
      provider_type: requestTarget.type,
      caregiver_profile_id: requestTarget.type === 'caregiver' ? requestTarget.id : null,
      facility_id: requestTarget.type === 'facility' ? requestTarget.id : null,
      service_type: form.service_type,
      preferred_date: form.preferred_date ? new Date(form.preferred_date).toISOString() : null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not submit your care request.');
      return;
    }
    toast.success(`Request sent to ${requestTarget.name}.`);
    setRequestTarget(null);
    setForm({ service_type: 'home_visit', preferred_date: '', notes: '' });
    fetchDirectory();
  };

  const matches = (name: string, details: string) => `${name} ${details}`.toLowerCase().includes(search.toLowerCase());
  const filteredCaregivers = caregivers.filter(c => matches(c.full_name, `${c.specialty || ''} ${c.relationship}`));
  const filteredFacilities = facilities.filter(f => matches(f.name, `${f.city || ''} ${f.state || ''} ${f.description || ''}`));

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search caregivers or facilities…" className="pl-9" />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><div><h3 className="font-semibold">Professional caregivers</h3><p className="text-xs text-muted-foreground">Choose a qualified caregiver for support at home.</p></div><Badge variant="outline">{filteredCaregivers.length}</Badge></div>
        {filteredCaregivers.length === 0 ? <EmptyDirectory icon={User} text="No professional caregivers are listed yet." /> : <div className="grid gap-3 md:grid-cols-2">{filteredCaregivers.map(caregiver => <DirectoryCard key={caregiver.id} icon={User} title={caregiver.full_name} subtitle={caregiver.specialty || 'Professional caregiver'} meta={caregiver.relationship} onRequest={() => setRequestTarget({ type: 'caregiver', id: caregiver.id, name: caregiver.full_name })} />)}</div>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><div><h3 className="font-semibold">Care facilities</h3><p className="text-xs text-muted-foreground">Choose a hospital or care facility for your service.</p></div><Badge variant="outline">{filteredFacilities.length}</Badge></div>
        {filteredFacilities.length === 0 ? <EmptyDirectory icon={Building2} text="No active care facilities are listed yet." /> : <div className="grid gap-3 md:grid-cols-2">{filteredFacilities.map(facility => <DirectoryCard key={facility.id} icon={Building2} title={facility.name} subtitle={facility.description || 'Connected care facility'} meta={[facility.city, facility.state].filter(Boolean).join(', ') || facility.address || 'Location available on request'} onRequest={() => setRequestTarget({ type: 'facility', id: facility.id, name: facility.name })} />)}</div>}
      </section>

      {requests.length > 0 && <section className="space-y-3"><h3 className="font-semibold">Recent requests</h3>{requests.map(request => <Card key={request.id}><CardContent className="p-3 flex items-center justify-between gap-3"><div><p className="text-sm font-medium capitalize">{request.service_type.replace('_', ' ')}</p><p className="text-xs text-muted-foreground">{request.provider_type === 'facility' ? 'Facility request' : 'Caregiver request'} · {format(parseISO(request.created_at), 'MMM d, yyyy')}</p></div><Badge variant="outline" className="capitalize">{request.status}</Badge></CardContent></Card>)}</section>}

      <Dialog open={!!requestTarget} onOpenChange={open => !open && setRequestTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request care from {requestTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Service type</Label><Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{VISIT_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Preferred date and time</Label><Input type="datetime-local" value={form.preferred_date} onChange={e => setForm({ ...form, preferred_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes for the care team</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Tell them what support you need…" rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRequestTarget(null)}>Cancel</Button><Button onClick={submitRequest} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyDirectory({ icon: Icon, text }: { icon: typeof User; text: string }) {
  return <div className="rounded-lg border border-dashed border-border py-7 text-center"><Icon className="mx-auto h-7 w-7 text-muted-foreground/40" /><p className="mt-2 text-xs text-muted-foreground">{text}</p></div>;
}

function DirectoryCard({ icon: Icon, title, subtitle, meta, onRequest }: { icon: typeof User; title: string; subtitle: string; meta: string; onRequest: () => void }) {
  return <Card className="transition-all hover:border-primary/40"><CardContent className="p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1"><p className="font-medium truncate">{title}</p><p className="text-xs text-muted-foreground">{subtitle}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> {meta}</p></div></div><Button size="sm" className="mt-3 w-full" onClick={onRequest}>Request care <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></CardContent></Card>;
}

function CareTasksPanel({ patientUserId }: { patientUserId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'general', priority: 'normal', due_date: '' });
  const [saving, setSaving] = useState(false);

  const fetchTasks = async () => {
    const { data } = await supabase.from('caregiver_tasks' as any).select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false });
    if (data) setTasks(data as any[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    const ch = supabase.channel('care-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'caregiver_tasks' }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientUserId]);

  const addTask = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      await supabase.from('caregiver_tasks' as any).insert({
        caregiver_user_id: user.id,
        patient_user_id: patientUserId,
        title: form.title,
        description: form.description || null,
        category: form.category,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      } as any);
      toast.success('Task added');
      setShowAdd(false);
      setForm({ title: '', description: '', category: 'general', priority: 'normal', due_date: '' });
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('caregiver_tasks' as any)
      .update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null } as any)
      .eq('id', task.id);
    fetchTasks();
  };

   const priorityColor = (p: string) => {
    switch (p) { case 'urgent': return 'text-red-600 bg-red-100'; case 'high': return 'text-orange-600 bg-orange-100'; default: return 'text-muted-foreground bg-muted'; }
  };

  const pending = tasks.filter(t => t.status !== 'completed');
  const completed = tasks.filter(t => t.status === 'completed');

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{pending.length} pending</Badge>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-3 w-3 mr-1" /> Add Task
        </Button>
      </div>

      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-2">
          {pending.map(task => (
            <Card key={task.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <button onClick={() => toggleComplete(task)}
                  className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <Badge variant="secondary" className={`text-[10px] ${priorityColor(task.priority)}`}>{task.priority}</Badge>
                  </div>
                  {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {TASK_CATEGORIES.find(c => c.value === task.category)?.label || task.category}
                    </span>
                    {task.due_date && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />{format(parseISO(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {completed.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-2">Completed ({completed.length})</p>
              {completed.slice(0, 5).map(task => (
                <Card key={task.id} className="opacity-50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <button onClick={() => toggleComplete(task)}
                      className="h-5 w-5 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                    </button>
                    <p className="text-sm text-muted-foreground line-through truncate">{task.title}</p>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
          {tasks.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No care tasks yet. Add one to get started!</p>
          )}
        </div>
      </ScrollArea>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Care Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Give morning medication" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addTask} disabled={!form.title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CareVisitsPanel({ patientUserId }: { patientUserId: string }) {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [form, setForm] = useState({ visit_type: 'home_visit', scheduled_at: '', duration_minutes: '60', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchVisits = async () => {
    const { data } = await supabase.from('care_visits' as any).select('*')
      .eq('patient_user_id', patientUserId)
      .order('scheduled_at', { ascending: false });
    if (data) setVisits(data as any[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchVisits();
    const ch = supabase.channel('care-visits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'care_visits' }, fetchVisits)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientUserId]);

  const scheduleVisit = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      await supabase.from('care_visits' as any).insert({
        caregiver_user_id: user.id,
        patient_user_id: patientUserId,
        visit_type: form.visit_type,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: parseInt(form.duration_minutes),
        notes: form.notes || null,
      } as any);
      toast.success('Visit scheduled');
      setShowSchedule(false);
      setForm({ visit_type: 'home_visit', scheduled_at: '', duration_minutes: '60', notes: '' });
      fetchVisits();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'scheduled': return 'text-blue-600 bg-blue-100 border-blue-300';
      case 'completed': return 'text-emerald-600 bg-emerald-100 border-emerald-300';
      case 'cancelled': return 'text-red-600 bg-red-100 border-red-300';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{visits.length} visits</Badge>
        <Button size="sm" variant="outline" onClick={() => setShowSchedule(true)}>
          <Calendar className="h-3 w-3 mr-1" /> Schedule Visit
        </Button>
      </div>

      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-2">
          {visits.map(visit => (
            <Card key={visit.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Home className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground capitalize">{visit.visit_type.replace('_', ' ')}</p>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(visit.status)}`}>{visit.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(visit.scheduled_at), 'MMM d, yyyy h:mm a')} · {visit.duration_minutes} min
                      </p>
                    </div>
                  </div>
                </div>
                {visit.notes && <p className="text-xs text-muted-foreground mt-2 pl-11">{visit.notes}</p>}
              </CardContent>
            </Card>
          ))}
          {visits.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No home visits scheduled yet</p>
          )}
        </div>
      </ScrollArea>

      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Home Visit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Visit Type</Label>
              <Select value={form.visit_type} onValueChange={(v) => setForm({ ...form, visit_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Special instructions..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button onClick={scheduleVisit} disabled={!form.scheduled_at || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calendar className="h-4 w-4 mr-1" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
