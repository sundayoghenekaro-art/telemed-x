import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeartPulse, Thermometer, Wind, Droplets, Activity, Plus, AlertTriangle, Settings2, Pencil, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { VitalSigns, Patient } from '@/types/dhos';
import { RecordVitalsDialog } from './RecordVitalsDialog';
import { VitalsAlertHistory } from './VitalsAlertHistory';
import { VitalSparkline } from './VitalSparkline';
import { CustomProfileDialog } from './CustomProfileDialog';
import { cn } from '@/lib/utils';
import {
  AlertLevel, VitalsProfileId, VITALS_PROFILES, VitalsProfile,
  detectProfile, getSeverity,
} from '@/lib/vitalsThresholds';
import {
  CustomVitalsProfile, loadCustomProfiles, addCustomProfile,
  updateCustomProfile, deleteCustomProfile,
} from '@/lib/customProfiles';
import { toast } from 'sonner';

interface VitalsPanelProps {
  vitalsHistory: Record<string, VitalSigns[]>;
  patients: Patient[];
}

export function VitalsPanel({ vitalsHistory, patients }: VitalsPanelProps) {
  const patientsWithVitals = patients.filter(p => vitalsHistory[p.upid]?.length > 0);
  const [selectedPatient, setSelectedPatient] = useState(patientsWithVitals[0]?.upid || '');
  const [localVitals, setLocalVitals] = useState<Record<string, VitalSigns[]>>(vitalsHistory);
  const [showRecord, setShowRecord] = useState(false);
  const [profileOverrides, setProfileOverrides] = useState<Record<string, string>>({});
  const [customProfiles, setCustomProfiles] = useState<CustomVitalsProfile[]>(loadCustomProfiles);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CustomVitalsProfile | null>(null);

  // All available profiles: presets + custom
  const allProfiles = useMemo<(VitalsProfile | CustomVitalsProfile)[]>(
    () => [...VITALS_PROFILES, ...customProfiles],
    [customProfiles]
  );

  const selectedPatientObj = patients.find(p => p.upid === selectedPatient);
  const patientName = selectedPatientObj ? `${selectedPatientObj.firstName} ${selectedPatientObj.lastName}` : '';

  const detectedProfileId = selectedPatientObj ? detectProfile(selectedPatientObj.dateOfBirth) : 'adult';
  const activeProfileId = profileOverrides[selectedPatient] || detectedProfileId;
  const activeProfile = allProfiles.find(p => p.id === activeProfileId) || VITALS_PROFILES[0];
  const activeThresholds = activeProfile.thresholds;

  const patientProfiles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of patients) {
      map[p.upid] = profileOverrides[p.upid] || detectProfile(p.dateOfBirth);
    }
    return map;
  }, [patients, profileOverrides]);

  const vitals = localVitals[selectedPatient] || [];
  const latest = vitals[vitals.length - 1];

  const handleRecorded = (newVitals: VitalSigns) => {
    setLocalVitals(prev => ({
      ...prev,
      [selectedPatient]: [...(prev[selectedPatient] || []), newVitals],
    }));
  };

  const handleSaveCustomProfile = (profile: CustomVitalsProfile) => {
    if (editingProfile) {
      setCustomProfiles(updateCustomProfile(profile));
    } else {
      setCustomProfiles(addCustomProfile(profile));
    }
    setEditingProfile(null);
  };

  const handleDeleteCustomProfile = (id: string) => {
    setCustomProfiles(deleteCustomProfile(id));
    // Reset any overrides using this profile
    setProfileOverrides(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (v === id) delete next[k];
      }
      return next;
    });
    toast.success('Custom profile deleted');
  };

  const isCustomProfile = (id: string) => customProfiles.some(p => p.id === id);

  const chartData = vitals.map(v => ({
    time: format(new Date(v.timestamp), 'HH:mm'),
    HR: v.heartRate,
    SysBP: v.bloodPressureSystolic,
    DiaBP: v.bloodPressureDiastolic,
    Temp: v.temperature,
    SpO2: v.oxygenSaturation,
    RR: v.respiratoryRate,
  }));

  return (
    <div className="space-y-6">
      {/* Patient Selector + Profile */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select patient" />
          </SelectTrigger>
          <SelectContent>
            {patientsWithVitals.map(p => {
              const pid = profileOverrides[p.upid] || detectProfile(p.dateOfBirth);
              const prof = allProfiles.find(pr => pr.id === pid) || VITALS_PROFILES[0];
              return (
                <SelectItem key={p.upid} value={p.upid}>
                  {p.firstName} {p.lastName} — {p.wardLocation} {p.bedNumber}
                  <span className="text-muted-foreground ml-1 text-[10px]">({prof.label})</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Profile selector */}
        <div className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={activeProfileId}
            onValueChange={(v) =>
              setProfileOverrides(prev => ({ ...prev, [selectedPatient]: v }))
            }
          >
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VITALS_PROFILES.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label} <span className="text-muted-foreground">({p.ageRange})</span>
                </SelectItem>
              ))}
              {customProfiles.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Custom Profiles</div>
                  {customProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-1.5">
                        {p.label}
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">Custom</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>

          {profileOverrides[selectedPatient] && profileOverrides[selectedPatient] !== detectedProfileId && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 cursor-pointer hover:bg-muted"
              onClick={() => setProfileOverrides(prev => {
                const next = { ...prev };
                delete next[selectedPatient];
                return next;
              })}
            >
              Reset to {VITALS_PROFILES.find(p => p.id === detectedProfileId)?.label || 'Auto'}
            </Badge>
          )}

          {/* Edit/delete if custom profile active */}
          {isCustomProfile(activeProfileId) && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => {
                  setEditingProfile(customProfiles.find(p => p.id === activeProfileId)!);
                  setShowCustomDialog(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => handleDeleteCustomProfile(activeProfileId)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Create new custom profile button */}
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1"
            onClick={() => { setEditingProfile(null); setShowCustomDialog(true); }}
          >
            <Plus className="h-3 w-3" />
            New Profile
          </Button>
        </div>

        {latest && (
          <Badge variant="outline" className="text-xs">
            Last recorded: {format(new Date(latest.timestamp), 'h:mm a')}
          </Badge>
        )}
        <Button onClick={() => setShowRecord(true)} className="gap-2 ml-auto" disabled={!selectedPatient}>
          <Plus className="h-4 w-4" />
          Record Vitals
        </Button>
      </div>

      {/* Profile info banner */}
      <div className="text-xs text-muted-foreground flex items-center gap-2 px-1">
        <Badge variant="secondary" className="text-[10px]">{activeProfile.label}</Badge>
        {(activeProfile as any).isCustom && <Badge variant="outline" className="text-[9px] px-1 py-0">Custom</Badge>}
        {activeProfile.description}
      </div>

      <RecordVitalsDialog
        open={showRecord}
        onOpenChange={setShowRecord}
        patientName={patientName}
        onRecorded={handleRecorded}
        profileId={activeProfileId as VitalsProfileId}
      />

      <CustomProfileDialog
        open={showCustomDialog}
        onOpenChange={setShowCustomDialog}
        onSave={handleSaveCustomProfile}
        editProfile={editingProfile}
      />

      {/* Current Vitals */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <VitalCard icon={HeartPulse} label="Heart Rate" value={latest.heartRate} unit="bpm" color="text-destructive" severity={getSeverity('hr', latest.heartRate, activeThresholds)} vitals={vitals} vitalKey="hr" strokeColor="hsl(var(--destructive))" thresholds={activeThresholds.hr} />
          <VitalCard icon={Activity} label="Blood Pressure" value={latest.bloodPressureSystolic != null && latest.bloodPressureDiastolic != null ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic}` : undefined} unit="mmHg" color="text-info" severity={getSeverity('bpSys', latest.bloodPressureSystolic, activeThresholds)} vitals={vitals} vitalKey="bpSys" strokeColor="hsl(var(--info))" thresholds={activeThresholds.bpSys} />
          <VitalCard icon={Thermometer} label="Temperature" value={latest.temperature} unit="°C" color="text-warning" severity={getSeverity('temp', latest.temperature, activeThresholds)} vitals={vitals} vitalKey="temp" strokeColor="hsl(var(--warning))" thresholds={activeThresholds.temp} />
          <VitalCard icon={Droplets} label="SpO₂" value={latest.oxygenSaturation} unit="%" color="text-primary" severity={getSeverity('spo2', latest.oxygenSaturation, activeThresholds)} vitals={vitals} vitalKey="spo2" strokeColor="hsl(var(--primary))" thresholds={activeThresholds.spo2} />
          <VitalCard icon={Wind} label="Resp. Rate" value={latest.respiratoryRate} unit="/min" color="text-success" severity={getSeverity('rr', latest.respiratoryRate, activeThresholds)} vitals={vitals} vitalKey="rr" strokeColor="hsl(var(--success))" thresholds={activeThresholds.rr} />
          {latest.painLevel !== undefined && (
            <VitalCard icon={HeartPulse} label="Pain Level" value={latest.painLevel} unit="/10" color="text-destructive" severity={getSeverity('pain', latest.painLevel, activeThresholds)} vitals={vitals} vitalKey="pain" strokeColor="hsl(var(--destructive))" thresholds={activeThresholds.pain} />
          )}
        </div>
      )}

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Heart Rate & Blood Pressure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="HR" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} name="HR (bpm)" />
                    <Line type="monotone" dataKey="SysBP" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 3 }} name="Sys BP" />
                    <Line type="monotone" dataKey="DiaBP" stroke="hsl(var(--info))" strokeWidth={1} strokeDasharray="4 4" dot={{ r: 2 }} name="Dia BP" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Temperature & SpO₂</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis yAxisId="temp" domain={[35, 41]} className="text-xs" />
                    <YAxis yAxisId="spo2" orientation="right" domain={[85, 100]} className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="temp" type="monotone" dataKey="Temp" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} name="Temp (°C)" />
                    <Line yAxisId="spo2" type="monotone" dataKey="SpO2" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="SpO₂ (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert History Timeline */}
      <VitalsAlertHistory vitalsHistory={localVitals} patients={patients} patientProfiles={patientProfiles} />
    </div>
  );
}

function VitalCard({ icon: Icon, label, value, unit, color, severity = 'normal', vitals, vitalKey, strokeColor, thresholds }: {
  icon: React.ElementType; label: string; value: number | string | undefined; unit: string; color: string; severity?: AlertLevel;
  vitals?: VitalSigns[]; vitalKey?: string; strokeColor?: string; thresholds?: { low: number; high: number };
}) {
  return (
    <Card className={cn(
      severity === 'critical' && 'border-destructive/40 ring-1 ring-destructive/30 bg-destructive/5',
      severity === 'warning' && 'border-warning/40 bg-warning/5',
    )}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
          {severity !== 'normal' && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
              severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
            )}>
              <AlertTriangle className="h-3 w-3" />
              {severity}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold">
          {value ?? '—'}
          <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
        {vitals && vitalKey && strokeColor && (
          <VitalSparkline
            vitals={vitals}
            vitalKey={vitalKey as any}
            color={strokeColor}
            thresholdLow={thresholds?.low}
            thresholdHigh={thresholds?.high}
          />
        )}
      </CardContent>
    </Card>
  );
}
