import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Activity, AlertTriangle, Heart, Droplets, Thermometer, Wind, Plus, Loader2, CheckCircle2, Bell, Settings2 } from 'lucide-react';

interface Alert {
  id: string;
  patient_user_id: string;
  metric: string;
  value: number;
  severity: string;
  status: string;
  message: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

interface Threshold {
  id: string;
  patient_user_id: string;
  metric: string;
  min_value: number | null;
  max_value: number | null;
  severity: string;
}

interface PatientVital {
  patient_user_id: string;
  heart_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  blood_glucose: number | null;
  weight: number | null;
  recorded_at: string;
}

interface MonitoredPatient {
  patient_user_id: string;
  latest_vitals: PatientVital | null;
  alert_count: number;
  thresholds: Threshold[];
}

const METRIC_CONFIG: Record<string, { label: string; unit: string; icon: typeof Heart }> = {
  heart_rate: { label: 'Heart Rate', unit: 'bpm', icon: Heart },
  spo2: { label: 'SpO₂', unit: '%', icon: Droplets },
  temperature: { label: 'Temperature', unit: '°F', icon: Thermometer },
  blood_pressure_systolic: { label: 'BP Systolic', unit: 'mmHg', icon: Activity },
  blood_glucose: { label: 'Glucose', unit: 'mg/dL', icon: Activity },
  respiratory_rate: { label: 'Resp Rate', unit: '/min', icon: Wind },
  weight: { label: 'Weight', unit: 'lbs', icon: Activity },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-600 bg-red-500/10 border-red-500/30',
  warning: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  info: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
};

const NORMAL_RANGES: Record<string, [number, number]> = {
  heart_rate: [60, 100],
  spo2: [95, 100],
  temperature: [97, 99.5],
  blood_pressure_systolic: [90, 140],
  blood_glucose: [70, 140],
  respiratory_rate: [12, 20],
};

export function RemotePatientMonitoring({ clinicianUserId }: { clinicianUserId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patients, setPatients] = useState<MonitoredPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('alerts');
  const [showThreshold, setShowThreshold] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [thresholdMetric, setThresholdMetric] = useState('heart_rate');
  const [thresholdMin, setThresholdMin] = useState('');
  const [thresholdMax, setThresholdMax] = useState('');
  const [thresholdSeverity, setThresholdSeverity] = useState('warning');
  const [savingThreshold, setSavingThreshold] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [alertsRes, vitalsRes, thresholdsRes] = await Promise.all([
      supabase.from('rpm_alerts').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('patient_vitals').select('patient_user_id, heart_rate, spo2, temperature, blood_pressure_systolic, blood_pressure_diastolic, blood_glucose, weight, recorded_at').order('recorded_at', { ascending: false }).limit(500),
      supabase.from('rpm_alert_thresholds').select('*'),
    ]);

    if (alertsRes.data) setAlerts(alertsRes.data as Alert[]);

    // Group vitals by patient — latest reading per patient
    if (vitalsRes.data) {
      const byPatient: Record<string, PatientVital> = {};
      for (const v of vitalsRes.data as PatientVital[]) {
        if (!byPatient[v.patient_user_id]) byPatient[v.patient_user_id] = v;
      }
      const patientList: MonitoredPatient[] = Object.entries(byPatient).map(([pid, vitals]) => ({
        patient_user_id: pid,
        latest_vitals: vitals,
        alert_count: alertsRes.data?.filter(a => a.patient_user_id === pid && a.status === 'active').length || 0,
        thresholds: (thresholdsRes.data as Threshold[])?.filter(t => t.patient_user_id === pid) || [],
      }));
      setPatients(patientList);
    }
    setLoading(false);
  };

  const acknowledgeAlert = async (alert: Alert) => {
    const { error } = await supabase.from('rpm_alerts').update({
      status: 'acknowledged',
      acknowledged_by: clinicianUserId,
      acknowledged_at: new Date().toISOString(),
    }).eq('id', alert.id);
    if (error) { toast.error('Could not acknowledge alert'); return; }
    toast.success('Alert acknowledged');
    fetchAll();
  };

  const saveThreshold = async () => {
    if (!selectedPatient) return;
    setSavingThreshold(true);
    const { error } = await supabase.from('rpm_alert_thresholds').insert({
      patient_user_id: selectedPatient,
      metric: thresholdMetric,
      min_value: thresholdMin ? parseFloat(thresholdMin) : null,
      max_value: thresholdMax ? parseFloat(thresholdMax) : null,
      severity: thresholdSeverity,
      created_by: clinicianUserId,
    });
    if (error) {
      toast.error('Could not save threshold');
    } else {
      toast.success('Alert threshold set');
      setShowThreshold(false);
      setThresholdMin(''); setThresholdMax('');
      fetchAll();
    }
    setSavingThreshold(false);
  };

  const checkVitalOutOfRange = (metric: string, value: number | null, thresholds: Threshold[]) => {
    if (value == null) return false;
    const t = thresholds.find(t => t.metric === metric);
    if (t) {
      if (t.min_value != null && value < t.min_value) return true;
      if (t.max_value != null && value > t.max_value) return true;
      return false;
    }
    const normal = NORMAL_RANGES[metric];
    if (!normal) return false;
    return value < normal[0] || value > normal[1];
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Remote Patient Monitoring
          </h2>
          <p className="text-sm text-muted-foreground">Monitor vitals from connected patients in real time</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Bell className="h-3 w-3" /> {activeAlerts.length} active alerts
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> Alerts
            {activeAlerts.length > 0 && <span className="ml-1 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">{activeAlerts.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-1">
            <Heart className="h-4 w-4" /> Patients
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-3 mt-4">
          {activeAlerts.length === 0 && acknowledgedAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 opacity-50" />
                <p className="font-medium">No alerts</p>
                <p className="text-sm">Patient vitals are within normal ranges</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {activeAlerts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-destructive">Active Alerts</h3>
                  {activeAlerts.map(alert => {
                    const config = METRIC_CONFIG[alert.metric] || METRIC_CONFIG.heart_rate;
                    const Icon = config.icon;
                    return (
                      <Card key={alert.id} className="border-destructive/30">
                        <CardContent className="pt-3 pb-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-destructive/10">
                              <Icon className="h-4 w-4 text-destructive" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{config.label}: {alert.value}{config.unit}</p>
                                <Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.warning}`}>
                                  {alert.severity}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {alert.message || 'Value outside normal range'} • {format(parseISO(alert.created_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert)}>
                            Acknowledge
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {acknowledgedAlerts.length > 0 && (
                <div className="space-y-2 pt-4">
                  <h3 className="font-semibold text-sm text-muted-foreground">Acknowledged</h3>
                  {acknowledgedAlerts.slice(0, 10).map(alert => {
                    const config = METRIC_CONFIG[alert.metric] || METRIC_CONFIG.heart_rate;
                    return (
                      <Card key={alert.id} className="opacity-60">
                        <CardContent className="pt-3 pb-3 flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">{config.label}: {alert.value}{config.unit}</p>
                            <p className="text-xs text-muted-foreground">
                              Acknowledged {alert.acknowledged_at && format(parseISO(alert.acknowledged_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients" className="space-y-3 mt-4">
          {patients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                <Heart className="h-12 w-12 mx-auto opacity-50" />
                <p className="font-medium">No monitored patients</p>
                <p className="text-sm">Patients who log vitals will appear here for monitoring</p>
              </CardContent>
            </Card>
          ) : (
            patients.map(patient => {
              const v = patient.latest_vitals;
              if (!v) return null;
              return (
                <Card key={patient.patient_user_id} className={patient.alert_count > 0 ? 'border-destructive/30' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Patient {patient.patient_user_id.slice(0, 8)}...
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {patient.alert_count > 0 && (
                          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-xs">
                            {patient.alert_count} alert{patient.alert_count > 1 ? 's' : ''}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(v.recorded_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {Object.entries(METRIC_CONFIG).slice(0, 6).map(([metric, config]) => {
                        const value = v[metric as keyof PatientVital] as number | null;
                        const outOfRange = checkVitalOutOfRange(metric, value, patient.thresholds);
                        const Icon = config.icon;
                        return (
                          <div key={metric} className={`rounded-lg p-2 ${outOfRange ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'}`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <Icon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">{config.label}</span>
                            </div>
                            <p className={`text-sm font-bold ${outOfRange ? 'text-destructive' : ''}`}>
                              {value != null ? value : '—'}
                              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{config.unit}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Dialog open={showThreshold && selectedPatient === patient.patient_user_id} onOpenChange={(open) => { setShowThreshold(open); if (open) setSelectedPatient(patient.patient_user_id); }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedPatient(patient.patient_user_id); setShowThreshold(true); }}>
                            <Settings2 className="h-3 w-3 mr-1" /> Set Threshold
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Set Alert Threshold</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div>
                              <Label>Metric</Label>
                              <Select value={thresholdMetric} onValueChange={setThresholdMetric}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(METRIC_CONFIG).map(([key, cfg]) => (
                                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><Label>Min Value</Label><Input type="number" value={thresholdMin} onChange={e => setThresholdMin(e.target.value)} placeholder="e.g. 60" /></div>
                              <div><Label>Max Value</Label><Input type="number" value={thresholdMax} onChange={e => setThresholdMax(e.target.value)} placeholder="e.g. 100" /></div>
                            </div>
                            <div>
                              <Label>Severity</Label>
                              <Select value={thresholdSeverity} onValueChange={setThresholdSeverity}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="info">Info</SelectItem>
                                  <SelectItem value="warning">Warning</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={saveThreshold} disabled={savingThreshold} className="w-full">
                              {savingThreshold ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Save Threshold
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {patient.thresholds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {patient.thresholds.map(t => (
                            <Badge key={t.id} variant="outline" className="text-[10px]">
                              {METRIC_CONFIG[t.metric]?.label || t.metric}: {t.min_value ?? '−'} / {t.max_value ?? '−'}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
