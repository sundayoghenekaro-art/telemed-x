import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { VitalSigns } from '@/types/dhos';
import { cn } from '@/lib/utils';
import {
  AlertLevel, VitalsProfileId, VITALS_PROFILES, VITAL_META,
  getThresholds, getSeverity, getRangeHint, ThresholdSet,
} from '@/lib/vitalsThresholds';
import { getAllProfiles } from '@/lib/customProfiles';

interface RecordVitalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  onRecorded: (vitals: VitalSigns) => void;
  profileId?: string;
}

const alertStyles: Record<AlertLevel, string> = {
  normal: '',
  warning: 'border-warning ring-1 ring-warning/30 bg-warning/5',
  critical: 'border-destructive ring-2 ring-destructive/30 bg-destructive/5',
};

export function RecordVitalsDialog({ open, onOpenChange, patientName, onRecorded, profileId = 'adult' }: RecordVitalsDialogProps) {
  const [hr, setHr] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [temp, setTemp] = useState('');
  const [rr, setRr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [pain, setPain] = useState('');

  const allProfiles = getAllProfiles();
  const profile = allProfiles.find(p => p.id === profileId) || VITALS_PROFILES[0];
  const thresholds = profile.thresholds;
  const values: Record<string, string> = { hr, rr, bpSys, bpDia, temp, spo2, pain };

  const alerts = useMemo(() => {
    const result: { key: string; level: AlertLevel; label: string; value: string }[] = [];
    for (const [key, val] of Object.entries(values)) {
      if (!val) continue;
      const num = Number(val);
      if (isNaN(num)) continue;
      const level = getSeverity(key, num, thresholds);
      if (level !== 'normal') {
        result.push({ key, level, label: VITAL_META[key]?.label || key, value: val });
      }
    }
    return result;
  }, [hr, rr, bpSys, bpDia, temp, spo2, pain, thresholds]);

  const hasCritical = alerts.some(a => a.level === 'critical');
  const hasWarning = alerts.some(a => a.level === 'warning');

  const reset = () => {
    setHr(''); setBpSys(''); setBpDia(''); setTemp(''); setRr(''); setSpo2(''); setPain('');
  };

  const handleSubmit = () => {
    if (!hr && !bpSys && !temp && !spo2 && !rr) {
      toast.error('Please enter at least one vital sign reading.');
      return;
    }

    const vitals: VitalSigns = {
      timestamp: new Date().toISOString(),
      heartRate: hr ? Number(hr) : undefined,
      bloodPressureSystolic: bpSys ? Number(bpSys) : undefined,
      bloodPressureDiastolic: bpDia ? Number(bpDia) : undefined,
      temperature: temp ? Number(temp) : undefined,
      respiratoryRate: rr ? Number(rr) : undefined,
      oxygenSaturation: spo2 ? Number(spo2) : undefined,
      painLevel: pain ? Number(pain) : undefined,
    };

    onRecorded(vitals);

    if (hasCritical) {
      const criticals = alerts.filter(a => a.level === 'critical');
      toast.error(
        `⚠️ CRITICAL values recorded for ${patientName}: ${criticals.map(c => `${c.label} (${c.value})`).join(', ')}`,
        { duration: 8000 }
      );
    } else if (hasWarning) {
      const warnings = alerts.filter(a => a.level === 'warning');
      toast.warning(
        `Abnormal values recorded for ${patientName}: ${warnings.map(w => `${w.label} (${w.value})`).join(', ')}`,
        { duration: 6000 }
      );
    } else {
      toast.success(`Vitals recorded for ${patientName}`);
    }

    reset();
    onOpenChange(false);
  };

  function getFieldSeverity(key: string, value: string): AlertLevel {
    if (!value) return 'normal';
    const num = Number(value);
    if (isNaN(num)) return 'normal';
    return getSeverity(key, num, thresholds);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Record Vitals — {patientName}
          </DialogTitle>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="secondary" className="text-[10px]">{profile.label}</Badge>
            <span className="text-[10px] text-muted-foreground">{profile.description}</span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <VitalField label="Heart Rate (bpm)" value={hr} onChange={setHr} vitalKey="hr" placeholder="72" severity={getFieldSeverity('hr', hr)} hint={getRangeHint('hr', thresholds)} />
          <VitalField label="Resp. Rate (/min)" value={rr} onChange={setRr} vitalKey="rr" placeholder="16" severity={getFieldSeverity('rr', rr)} hint={getRangeHint('rr', thresholds)} />
          <VitalField label="BP Systolic (mmHg)" value={bpSys} onChange={setBpSys} vitalKey="bpSys" placeholder="120" severity={getFieldSeverity('bpSys', bpSys)} hint={getRangeHint('bpSys', thresholds)} />
          <VitalField label="BP Diastolic (mmHg)" value={bpDia} onChange={setBpDia} vitalKey="bpDia" placeholder="80" severity={getFieldSeverity('bpDia', bpDia)} hint={getRangeHint('bpDia', thresholds)} />
          <VitalField label="Temperature (°C)" value={temp} onChange={setTemp} vitalKey="temp" placeholder="36.8" step="0.1" severity={getFieldSeverity('temp', temp)} hint={getRangeHint('temp', thresholds)} />
          <VitalField label="SpO₂ (%)" value={spo2} onChange={setSpo2} vitalKey="spo2" placeholder="98" severity={getFieldSeverity('spo2', spo2)} hint={getRangeHint('spo2', thresholds)} />
          <div className="col-span-2">
            <VitalField label="Pain Level (0–10)" value={pain} onChange={setPain} vitalKey="pain" placeholder="0" min="0" max="10" severity={getFieldSeverity('pain', pain)} hint={getRangeHint('pain', thresholds)} />
          </div>
        </div>

        {/* Alert Summary Banner */}
        {alerts.length > 0 && (
          <div className={cn(
            "rounded-lg border p-3 flex items-start gap-2.5 text-sm",
            hasCritical
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-warning/40 bg-warning/5 text-warning-foreground"
          )}>
            <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", hasCritical ? "text-destructive" : "text-warning")} />
            <div>
              <p className="font-semibold text-xs uppercase mb-1">
                {hasCritical ? 'Critical Values Detected' : 'Abnormal Values Detected'}
              </p>
              <ul className="space-y-0.5">
                {alerts.map(a => {
                  const t = thresholds[a.key];
                  return (
                    <li key={a.key} className="text-xs">
                      <span className="font-medium">{a.label}:</span> {a.value}{' '}
                      {t && <span className="text-muted-foreground">(normal: {t.low}–{t.high})</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant={hasCritical ? 'destructive' : 'default'}>
            {hasCritical ? 'Record Critical Vitals' : 'Record Vitals'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VitalField({ label, value, onChange, vitalKey, placeholder, step, min, max, severity, hint }: {
  label: string; value: string; onChange: (v: string) => void; vitalKey: string;
  placeholder: string; step?: string; min?: string; max?: string;
  severity: AlertLevel; hint: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {severity !== 'normal' && (
          <span className={cn(
            "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
            severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
          )}>
            {severity}
          </span>
        )}
      </div>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        type="number"
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        className={cn(alertStyles[severity])}
      />
      {severity !== 'normal' && (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
