import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { VITAL_META, VitalThreshold } from '@/lib/vitalsThresholds';
import { CustomVitalsProfile, getDefaultCustomThresholds, generateProfileId } from '@/lib/customProfiles';

interface CustomProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: CustomVitalsProfile) => void;
  editProfile?: CustomVitalsProfile | null;
}

const VITAL_KEYS = ['hr', 'rr', 'bpSys', 'bpDia', 'temp', 'spo2', 'pain'] as const;

export function CustomProfileDialog({ open, onOpenChange, onSave, editProfile }: CustomProfileDialogProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [thresholds, setThresholds] = useState(getDefaultCustomThresholds());

  useEffect(() => {
    if (open) {
      if (editProfile) {
        setLabel(editProfile.label);
        setDescription(editProfile.description);
        setAgeRange(editProfile.ageRange);
        setThresholds(JSON.parse(JSON.stringify(editProfile.thresholds)));
      } else {
        setLabel('');
        setDescription('');
        setAgeRange('');
        setThresholds(getDefaultCustomThresholds());
      }
    }
  }, [open, editProfile]);

  const updateThreshold = (key: string, field: keyof VitalThreshold, value: string) => {
    setThresholds(prev => {
      const next = { ...prev };
      const t = { ...next[key] };
      if (value === '' || value === undefined) {
        if (field === 'criticalLow' || field === 'criticalHigh') {
          delete t[field];
        }
      } else {
        (t as any)[field] = Number(value);
      }
      next[key] = t;
      return next;
    });
  };

  const handleSave = () => {
    if (!label.trim()) {
      toast.error('Please enter a profile name.');
      return;
    }

    const profile: CustomVitalsProfile = {
      id: editProfile?.id || generateProfileId() as any,
      label: label.trim(),
      description: description.trim() || `Custom profile: ${label.trim()}`,
      ageRange: ageRange.trim() || 'Custom',
      thresholds,
      isCustom: true,
    };

    onSave(profile);
    toast.success(`Profile "${profile.label}" ${editProfile ? 'updated' : 'created'}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {editProfile ? 'Edit Custom Profile' : 'Create Custom Profile'}
          </DialogTitle>
          <DialogDescription>
            Define per-vital threshold ranges. Values outside normal range trigger warnings; values beyond critical thresholds trigger critical alerts.
          </DialogDescription>
        </DialogHeader>

        {/* Profile Info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Profile Name *</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Post-Surgery" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Tighter monitoring" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Age Range</Label>
            <Input value={ageRange} onChange={e => setAgeRange(e.target.value)} placeholder="e.g. All ages" className="h-8 text-sm" />
          </div>
        </div>

        <Separator />

        {/* Threshold Table */}
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_repeat(4,80px)] gap-2 text-[10px] font-semibold text-muted-foreground uppercase px-1">
            <span>Vital Sign</span>
            <span className="text-center">Crit. Low</span>
            <span className="text-center">Normal Low</span>
            <span className="text-center">Normal High</span>
            <span className="text-center">Crit. High</span>
          </div>

          {VITAL_KEYS.map(key => {
            const meta = VITAL_META[key];
            const t = thresholds[key];
            if (!t) return null;
            return (
              <div key={key} className="grid grid-cols-[1fr_repeat(4,80px)] gap-2 items-center py-1.5 px-1 rounded hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{meta?.label || key}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{meta?.unit || ''}</Badge>
                </div>
                <ThresholdInput
                  value={t.criticalLow}
                  onChange={v => updateThreshold(key, 'criticalLow', v)}
                  placeholder="—"
                  variant="critical"
                />
                <ThresholdInput
                  value={t.low}
                  onChange={v => updateThreshold(key, 'low', v)}
                  placeholder="Low"
                  variant="normal"
                />
                <ThresholdInput
                  value={t.high}
                  onChange={v => updateThreshold(key, 'high', v)}
                  placeholder="High"
                  variant="normal"
                />
                <ThresholdInput
                  value={t.criticalHigh}
                  onChange={v => updateThreshold(key, 'criticalHigh', v)}
                  placeholder="—"
                  variant="critical"
                />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-destructive/40 bg-destructive/10" />
            Critical zone
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-warning/40 bg-warning/10" />
            Warning (outside normal)
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-border bg-background" />
            Normal range
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>
            {editProfile ? 'Update Profile' : 'Create Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThresholdInput({ value, onChange, placeholder, variant }: {
  value: number | undefined;
  onChange: (v: string) => void;
  placeholder: string;
  variant: 'critical' | 'normal';
}) {
  return (
    <Input
      type="number"
      step="any"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-7 text-xs text-center px-1 ${
        variant === 'critical'
          ? 'border-destructive/30 bg-destructive/5 placeholder:text-destructive/30'
          : ''
      }`}
    />
  );
}
