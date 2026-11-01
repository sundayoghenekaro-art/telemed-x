import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { FileJson, Download, Loader2, Share2, CheckCircle2 } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

const FHIR_RESOURCES = [
  { key: 'Patient', label: 'Patient Demographics' },
  { key: 'Observation', label: 'Vital Signs & Observations' },
  { key: 'MedicationStatement', label: 'Medications' },
  { key: 'Condition', label: 'Conditions & Diagnoses' },
  { key: 'CarePlan', label: 'Care Plans' },
  { key: 'Encounter', label: 'Consultation Encounters' },
  { key: 'AllergyIntolerance', label: 'Allergies' },
];

interface FhirExport {
  id: string;
  resource_types: string[];
  version: string;
  created_at: string;
}

export function FhirExportView({ patientUserId }: { patientUserId: string }) {
  const [exports, setExports] = useState<FhirExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<string[]>(['Patient', 'Observation', 'MedicationStatement']);

  useEffect(() => { fetchExports(); }, [patientUserId]);

  const fetchExports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('fhir_exports')
      .select('id, resource_types, version, created_at')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setExports(data as FhirExport[]);
    setLoading(false);
  };

  const toggleResource = (key: string) => {
    setSelected(prev => prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]);
  };

  const generateBundle = async () => {
    if (selected.length === 0) { toast.error('Select at least one resource type'); return; }
    setGenerating(true);

    try {
      const [vitalsRes, medsRes, sessionsRes, carePlansRes, prescriptionsRes] = await Promise.all([
        supabase.from('patient_vitals').select('*').eq('patient_user_id', patientUserId).order('recorded_at', { ascending: false }).limit(100),
        supabase.from('patient_medications').select('*').eq('patient_user_id', patientUserId),
        supabase.from('telemedicine_sessions').select('*').eq('patient_user_id', patientUserId).order('scheduled_at', { ascending: false }).limit(50),
        supabase.from('care_plans').select('*').eq('patient_user_id', patientUserId),
        supabase.from('telemedicine_prescriptions').select('*').eq('patient_account_id', patientUserId).order('created_at', { ascending: false }),
      ]);

      const bundle: Record<string, unknown> = {
        resourceType: 'Bundle',
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: [] as Record<string, unknown>[],
      };
      const entries: Record<string, unknown>[] = [];

      if (selected.includes('Patient')) {
        entries.push({
          fullUrl: `urn:uuid:${patientUserId}`,
          resource: {
            resourceType: 'Patient',
            id: patientUserId,
          },
        });
      }

      if (selected.includes('Observation') && vitalsRes.data) {
        for (const v of vitalsRes.data) {
          entries.push({
            resource: {
              resourceType: 'Observation',
              status: 'final',
              code: { text: 'Vital Signs' },
              effectiveDateTime: v.recorded_at,
              component: [
                ...(v.heart_rate ? [{ code: { text: 'Heart Rate' }, valueQuantity: { value: v.heart_rate, unit: 'bpm' } }] : []),
                ...(v.spo2 ? [{ code: { text: 'SpO2' }, valueQuantity: { value: v.spo2, unit: '%' } }] : []),
                ...(v.temperature ? [{ code: { text: 'Temperature' }, valueQuantity: { value: v.temperature, unit: 'F' } }] : []),
                ...(v.blood_pressure_systolic ? [{ code: { text: 'BP Systolic' }, valueQuantity: { value: v.blood_pressure_systolic, unit: 'mmHg' } }] : []),
              ],
            },
          });
        }
      }

      if (selected.includes('MedicationStatement') && medsRes.data) {
        for (const m of medsRes.data) {
          entries.push({
            resource: {
              resourceType: 'MedicationStatement',
              status: m.status === 'active' ? 'active' : 'completed',
              medicationCodeableConcept: { text: m.name },
              dosage: [{ text: `${m.dosage || ''} ${m.frequency || ''}`.trim() }],
              effectivePeriod: { start: m.start_date || undefined, end: m.end_date || undefined },
            },
          });
        }
      }

      if (selected.includes('Encounter') && sessionsRes.data) {
        for (const s of sessionsRes.data) {
          entries.push({
            resource: {
              resourceType: 'Encounter',
              status: s.status === 'completed' ? 'finished' : 'planned',
              class: { code: 'telehealth' },
              subject: { reference: `Patient/${patientUserId}` },
              period: { start: s.scheduled_at, end: s.ended_at || undefined },
              reasonCode: s.chief_complaint ? [{ text: s.chief_complaint }] : undefined,
            },
          });
        }
      }

      if (selected.includes('CarePlan') && carePlansRes.data) {
        for (const cp of carePlansRes.data) {
          entries.push({
            resource: {
              resourceType: 'CarePlan',
              status: cp.status === 'active' ? 'active' : 'completed',
              title: cp.title,
              description: cp.goals,
              subject: { reference: `Patient/${patientUserId}` },
            },
          });
        }
      }

      bundle.entry = entries;

      const { error } = await supabase.from('fhir_exports').insert({
        patient_user_id: patientUserId,
        resource_types: selected,
        bundle_json: bundle as unknown as Json,
        version: 'R4',
      });

      if (error) throw error;
      toast.success(`FHIR bundle generated with ${entries.length} resources`);
      fetchExports();
    } catch {
      toast.error('Could not generate FHIR bundle');
    }
    setGenerating(false);
  };

  const downloadBundle = async (exportId: string) => {
    const { data } = await supabase
      .from('fhir_exports')
      .select('bundle_json')
      .eq('id', exportId)
      .single();
    if (!data?.bundle_json) { toast.error('Could not load bundle'); return; }
    const blob = new Blob([JSON.stringify(data.bundle_json, null, 2)], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `fhir-bundle-${exportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('FHIR bundle downloaded');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <FileJson className="h-5 w-5 text-primary" /> FHIR Health Export
      </h2>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Generate FHIR R4 Bundle</p>
            <p className="text-xs text-muted-foreground mb-3">
              Export your health data in the HL7 FHIR R4 standard format, compatible with electronic health record systems worldwide.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FHIR_RESOURCES.map(res => (
                <label key={res.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={selected.includes(res.key)} onCheckedChange={() => toggleResource(res.key)} />
                  <span className="text-sm">{res.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={generateBundle} disabled={generating} className="w-full">
            {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Share2 className="h-4 w-4 mr-2" /> Generate FHIR Bundle</>}
          </Button>
        </CardContent>
      </Card>

      {exports.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Export History</h3>
          {exports.map(exp => (
            <Card key={exp.id}>
              <CardContent className="pt-3 pb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium">FHIR R4 Bundle</p>
                    <Badge variant="secondary" className="text-xs">{exp.resource_types.length} types</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(exp.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {exp.resource_types.map(rt => (
                      <Badge key={rt} variant="outline" className="text-[10px]">{rt}</Badge>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadBundle(exp.id)}>
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
