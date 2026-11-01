import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Droplets, Pill, Activity } from 'lucide-react';

interface HomeData {
  hr: number | null;
  spo2: number | null;
  bpSys: number | null;
  bpDia: number | null;
  activeMeds: number;
}

export function PatientHomeCards({ patientUserId }: { patientUserId: string }) {
  const [data, setData] = useState<HomeData>({ hr: null, spo2: null, bpSys: null, bpDia: null, activeMeds: 0 });

  useEffect(() => {
    const load = async () => {
      const [vitalsRes, medsRes] = await Promise.all([
        supabase.from('patient_vitals').select('heart_rate, spo2, blood_pressure_systolic, blood_pressure_diastolic')
          .eq('patient_user_id', patientUserId).order('recorded_at', { ascending: false }).limit(1),
        supabase.from('patient_medications').select('id', { count: 'exact', head: true })
          .eq('patient_user_id', patientUserId).eq('status', 'active'),
      ]);
      const v = vitalsRes.data?.[0];
      setData({
        hr: v?.heart_rate ?? null,
        spo2: v?.spo2 ?? null,
        bpSys: v?.blood_pressure_systolic ?? null,
        bpDia: v?.blood_pressure_diastolic ?? null,
        activeMeds: medsRes.count ?? 0,
      });
    };
    load();

    const channel = supabase
      .channel('home-vitals-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patient_vitals', filter: `patient_user_id=eq.${patientUserId}` }, (payload: any) => {
        const v = payload.new;
        setData(prev => ({
          ...prev,
          hr: v.heart_rate ?? prev.hr,
          spo2: v.spo2 ?? prev.spo2,
          bpSys: v.blood_pressure_systolic ?? prev.bpSys,
          bpDia: v.blood_pressure_diastolic ?? prev.bpDia,
        }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [patientUserId]);

  const cards = [
    { icon: Heart, label: 'Heart Rate', value: data.hr != null ? `${data.hr} bpm` : '—', color: 'text-destructive' },
    { icon: Droplets, label: 'SpO₂', value: data.spo2 != null ? `${data.spo2}%` : '—', color: 'text-primary' },
    { icon: Activity, label: 'Blood Pressure', value: data.bpSys != null ? `${data.bpSys}/${data.bpDia}` : '—', color: 'text-muted-foreground' },
    { icon: Pill, label: 'Active Meds', value: String(data.activeMeds), color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {cards.map(c => (
        <Card key={c.label} className="bg-card/50 backdrop-blur">
          <CardContent className="pt-3 pb-3 px-4 flex items-center gap-3">
            <c.icon className={`h-5 w-5 ${c.color} shrink-0`} />
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-bold text-sm">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
