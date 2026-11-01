import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { Pill, CheckCircle2, XCircle, Clock, Loader2, TrendingUp } from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  status: string;
}

interface DoseLog {
  id: string;
  medication_id: string | null;
  medication_name: string;
  scheduled_time: string;
  status: string;
  taken_at: string | null;
  notes: string | null;
}

export function MedicationAdherence({ patientUserId }: { patientUserId: string }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, [patientUserId]);

  const fetchAll = async () => {
    setLoading(true);
    const [medsRes, logsRes] = await Promise.all([
      supabase.from('patient_medications').select('id, name, dosage, frequency, status').eq('patient_user_id', patientUserId).eq('status', 'active'),
      supabase.from('medication_dose_logs').select('*').eq('patient_user_id', patientUserId).gte('scheduled_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('scheduled_time', { ascending: false }),
    ]);
    if (medsRes.data) setMedications(medsRes.data as Medication[]);
    if (logsRes.data) setLogs(logsRes.data as DoseLog[]);
    setLoading(false);
  };

  const logDose = async (med: Medication, status: 'taken' | 'skipped') => {
    setLogging(med.id);
    const { error } = await supabase.from('medication_dose_logs').insert({
      patient_user_id: patientUserId,
      medication_id: med.id,
      medication_name: med.name,
      scheduled_time: new Date().toISOString(),
      status,
      taken_at: status === 'taken' ? new Date().toISOString() : null,
    });
    if (error) {
      toast.error('Could not log dose');
    } else {
      toast.success(status === 'taken' ? `${med.name} marked as taken` : `${med.name} skipped`);
      fetchAll();
    }
    setLogging(null);
  };

  const getAdherenceRate = (medId: string) => {
    const medLogs = logs.filter(l => l.medication_id === medId);
    if (medLogs.length === 0) return null;
    const taken = medLogs.filter(l => l.status === 'taken').length;
    return Math.round((taken / medLogs.length) * 100);
  };

  const getTodayLogs = (medId: string) => {
    return logs.filter(l => l.medication_id === medId && isToday(parseISO(l.scheduled_time)));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const totalAdherence = logs.length > 0 ? Math.round((logs.filter(l => l.status === 'taken').length / logs.length) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" /> Medication Adherence
        </h2>
        {totalAdherence !== null && (
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> 7-day: {totalAdherence}%
          </Badge>
        )}
      </div>

      {medications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <Pill className="h-12 w-12 mx-auto opacity-50" />
            <p className="font-medium">No active medications</p>
            <p className="text-sm">Add medications in the Medications tab to start tracking adherence</p>
          </CardContent>
        </Card>
      ) : (
        medications.map(med => {
          const rate = getAdherenceRate(med.id);
          const todayLogs = getTodayLogs(med.id);
          const takenToday = todayLogs.some(l => l.status === 'taken');
          return (
            <Card key={med.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{med.name}</p>
                    {med.dosage && <p className="text-xs text-muted-foreground">{med.dosage} • {med.frequency || 'as directed'}</p>}
                  </div>
                  {takenToday ? (
                    <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Taken today
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                      <Clock className="h-3 w-3 mr-1" /> Due today
                    </Badge>
                  )}
                </div>

                {rate !== null && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">7-day adherence</span>
                      <span className={rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}>{rate}%</span>
                    </div>
                    <Progress value={rate} className="h-2" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={takenToday ? 'outline' : 'default'}
                    onClick={() => logDose(med, 'taken')}
                    disabled={logging === med.id || takenToday}
                  >
                    {logging === med.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    Mark as Taken
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => logDose(med, 'skipped')}
                    disabled={logging === med.id || takenToday}
                  >
                    <XCircle className="h-3 w-3 mr-1" /> Skip
                  </Button>
                </div>

                {todayLogs.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {todayLogs.map(log => (
                      <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {log.status === 'taken' ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-amber-600" />}
                        <span>{log.status === 'taken' ? 'Taken' : 'Skipped'} at {format(parseISO(log.taken_at || log.scheduled_time), 'h:mm a')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Recent history */}
      {logs.length > 0 && (
        <div className="pt-4">
          <h3 className="font-semibold text-sm mb-2">Recent History</h3>
          <div className="space-y-1">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {log.status === 'taken' ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-amber-600" />}
                  <span>{log.medication_name}</span>
                </div>
                <span className="text-muted-foreground">
                  {isToday(parseISO(log.scheduled_time)) ? 'Today' : isYesterday(parseISO(log.scheduled_time)) ? 'Yesterday' : format(parseISO(log.scheduled_time), 'MMM d')}
                  {' • '}{format(parseISO(log.scheduled_time), 'h:mm a')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
