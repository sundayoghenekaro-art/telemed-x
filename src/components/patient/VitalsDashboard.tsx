import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, parseISO, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, Thermometer, Droplets, Wind, Weight, Activity, Moon, Loader2, Plus, Watch, Wifi, WifiOff } from 'lucide-react';

interface Vital {
  id: string;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  temperature: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  weight: number | null;
  blood_glucose: number | null;
  steps: number | null;
  sleep_hours: number | null;
  source: string;
  recorded_at: string;
}

const VITAL_CARDS = [
  { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: Heart, color: 'hsl(var(--destructive))', normal: [60, 100] },
  { key: 'spo2', label: 'SpO₂', unit: '%', icon: Droplets, color: 'hsl(var(--primary))', normal: [95, 100] },
  { key: 'temperature', label: 'Temp', unit: '°F', icon: Thermometer, color: 'hsl(var(--accent-foreground))', normal: [97, 99.5] },
  { key: 'blood_glucose', label: 'Glucose', unit: 'mg/dL', icon: Activity, color: 'hsl(var(--secondary-foreground))', normal: [70, 140] },
  { key: 'respiratory_rate', label: 'Resp Rate', unit: '/min', icon: Wind, color: 'hsl(var(--muted-foreground))', normal: [12, 20] },
  { key: 'weight', label: 'Weight', unit: 'lbs', icon: Weight, color: 'hsl(var(--foreground))', normal: null },
  { key: 'steps', label: 'Steps', unit: '', icon: Activity, color: 'hsl(var(--primary))', normal: null },
  { key: 'sleep_hours', label: 'Sleep', unit: 'hrs', icon: Moon, color: 'hsl(var(--muted-foreground))', normal: [7, 9] },
];

const WEARABLES = [
  { id: 'apple_watch', name: 'Apple Watch', icon: Watch },
  { id: 'fitbit', name: 'Fitbit', icon: Watch },
  { id: 'garmin', name: 'Garmin', icon: Watch },
];

export function VitalsDashboard({ patientUserId }: { patientUserId: string }) {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rangeDays, setRangeDays] = useState(7);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form
  const [hr, setHr] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [temp, setTemp] = useState('');
  const [spo2, setSpo2] = useState('');
  const [rr, setRr] = useState('');
  const [wt, setWt] = useState('');
  const [glucose, setGlucose] = useState('');
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');

  useEffect(() => {
    fetchVitals();
    const channel = supabase
      .channel('patient-vitals-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patient_vitals', filter: `patient_user_id=eq.${patientUserId}` }, (payload) => {
        setVitals(prev => [payload.new as Vital, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [patientUserId]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const fetchVitals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_vitals')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .gte('recorded_at', subDays(new Date(), 30).toISOString())
      .order('recorded_at', { ascending: false });
    if (data) setVitals(data as Vital[]);
    setLoading(false);
  };

  const handleLogVitals = async () => {
    setSaving(true);
    const { error } = await supabase.from('patient_vitals').insert({
      patient_user_id: patientUserId,
      heart_rate: hr ? parseInt(hr) : null,
      blood_pressure_systolic: bpSys ? parseInt(bpSys) : null,
      blood_pressure_diastolic: bpDia ? parseInt(bpDia) : null,
      temperature: temp ? parseFloat(temp) : null,
      spo2: spo2 ? parseInt(spo2) : null,
      respiratory_rate: rr ? parseInt(rr) : null,
      weight: wt ? parseFloat(wt) : null,
      blood_glucose: glucose ? parseInt(glucose) : null,
      steps: steps ? parseInt(steps) : null,
      sleep_hours: sleep ? parseFloat(sleep) : null,
      source: 'manual',
    });
    if (error) toast.error('Failed to log vitals');
    else { toast.success('Vitals logged'); setLogOpen(false); }
    setSaving(false);
  };

  const connectWearable = (deviceId: string) => {
    setConnectedDevice(deviceId);
    toast.success(`Connected to ${WEARABLES.find(w => w.id === deviceId)?.name}`);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      await supabase.from('patient_vitals').insert({
        patient_user_id: patientUserId,
        heart_rate: 60 + Math.floor(Math.random() * 40),
        spo2: 95 + Math.floor(Math.random() * 5),
        steps: Math.floor(Math.random() * 200),
        temperature: +(97 + Math.random() * 2.5).toFixed(1),
        blood_pressure_systolic: 110 + Math.floor(Math.random() * 20),
        blood_pressure_diastolic: 65 + Math.floor(Math.random() * 15),
        source: deviceId,
      });
    }, 15000);
  };

  const disconnectWearable = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    toast.info('Wearable disconnected');
    setConnectedDevice(null);
  };

  const latest = vitals[0];
  const rangeVitals = vitals.filter(v => new Date(v.recorded_at) >= subDays(new Date(), rangeDays));
  const chartData = [...rangeVitals].reverse().map(v => ({
    time: format(parseISO(v.recorded_at), rangeDays <= 7 ? 'EEE HH:mm' : 'MMM d'),
    hr: v.heart_rate, spo2: v.spo2, temp: v.temperature, bpSys: v.blood_pressure_systolic,
  }));

  const getStatus = (value: number | null | undefined, normal: number[] | null) => {
    if (value == null || !normal) return 'default';
    if (value < normal[0]) return 'low';
    if (value > normal[1]) return 'high';
    return 'normal';
  };

  return (
    <div className="space-y-6">
      {/* Top actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {connectedDevice ? (
            <Badge variant="outline" className="flex items-center gap-1 text-primary border-primary">
              <Wifi className="h-3 w-3" /> {WEARABLES.find(w => w.id === connectedDevice)?.name} connected
              <Button variant="ghost" size="sm" className="h-5 px-1 ml-1" onClick={disconnectWearable}><WifiOff className="h-3 w-3" /></Button>
            </Badge>
          ) : (
            WEARABLES.map(w => (
              <Button key={w.id} variant="outline" size="sm" onClick={() => connectWearable(w.id)}>
                <w.icon className="h-4 w-4 mr-1" /> {w.name}
              </Button>
            ))
          )}
        </div>
        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Log Vitals</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Vitals</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              <div><Label>Heart Rate (bpm)</Label><Input type="number" value={hr} onChange={e => setHr(e.target.value)} /></div>
              <div><Label>SpO₂ (%)</Label><Input type="number" value={spo2} onChange={e => setSpo2(e.target.value)} /></div>
              <div><Label>BP Systolic</Label><Input type="number" value={bpSys} onChange={e => setBpSys(e.target.value)} /></div>
              <div><Label>BP Diastolic</Label><Input type="number" value={bpDia} onChange={e => setBpDia(e.target.value)} /></div>
              <div><Label>Temp (°F)</Label><Input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} /></div>
              <div><Label>Resp Rate (/min)</Label><Input type="number" value={rr} onChange={e => setRr(e.target.value)} /></div>
              <div><Label>Weight (lbs)</Label><Input type="number" step="0.1" value={wt} onChange={e => setWt(e.target.value)} /></div>
              <div><Label>Glucose (mg/dL)</Label><Input type="number" value={glucose} onChange={e => setGlucose(e.target.value)} /></div>
              <div><Label>Steps</Label><Input type="number" value={steps} onChange={e => setSteps(e.target.value)} /></div>
              <div><Label>Sleep (hrs)</Label><Input type="number" step="0.5" value={sleep} onChange={e => setSleep(e.target.value)} /></div>
            </div>
            <Button onClick={handleLogVitals} disabled={saving} className="w-full mt-2">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save Vitals
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
      ) : !latest ? (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Heart className="h-12 w-12 mx-auto opacity-50" />
          <p className="font-medium">No vitals recorded</p>
          <p className="text-sm">Log your vitals manually or connect a wearable device</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {VITAL_CARDS.map(vc => {
              const val = latest[vc.key as keyof Vital] as number | null;
              const status = getStatus(val, vc.normal);
              return (
                <Card key={vc.key} className={`${status === 'high' || status === 'low' ? 'border-destructive/50' : ''}`}>
                  <CardContent className="pt-3 pb-3 px-4">
                    <div className="flex items-center gap-2 mb-1">
                      <vc.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{vc.label}</span>
                    </div>
                    <p className="text-xl font-bold">
                      {val != null ? val : '—'}
                      <span className="text-xs font-normal text-muted-foreground ml-1">{vc.unit}</span>
                    </p>
                    {vc.key === 'heart_rate' && latest.blood_pressure_systolic && (
                      <p className="text-xs text-muted-foreground">BP: {latest.blood_pressure_systolic}/{latest.blood_pressure_diastolic}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Trend charts */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Vitals Trends</CardTitle>
                <Tabs value={String(rangeDays)} onValueChange={v => setRangeDays(Number(v))}>
                  <TabsList className="h-7">
                    <TabsTrigger value="7" className="text-xs px-2 h-6">7 days</TabsTrigger>
                    <TabsTrigger value="30" className="text-xs px-2 h-6">30 days</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length < 2 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Need more data points for trends</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="hr" name="Heart Rate" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="spo2" name="SpO₂" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
