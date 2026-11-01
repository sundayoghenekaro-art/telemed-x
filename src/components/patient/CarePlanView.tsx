import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ClipboardList, Plus, CheckCircle2, Circle, Loader2, Target, Activity, Calendar } from 'lucide-react';

interface CarePlan {
  id: string;
  title: string;
  diagnosis: string | null;
  goals: string;
  interventions: string;
  status: string;
  created_at: string;
}

interface CarePlanTask {
  id: string;
  care_plan_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  completed_at: string | null;
}

export function CarePlanView({ patientUserId }: { patientUserId: string }) {
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [tasks, setTasks] = useState<Record<string, CarePlanTask[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [goals, setGoals] = useState('');
  const [interventions, setInterventions] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => { fetchPlans(); }, [patientUserId]);

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('care_plans')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false });
    if (data) {
      setPlans(data as CarePlan[]);
      for (const plan of data as CarePlan[]) {
        fetchTasks(plan.id);
      }
    }
    setLoading(false);
  };

  const fetchTasks = async (planId: string) => {
    const { data } = await supabase
      .from('care_plan_tasks')
      .select('*')
      .eq('care_plan_id', planId)
      .order('created_at', { ascending: true });
    if (data) setTasks(prev => ({ ...prev, [planId]: data as CarePlanTask[] }));
  };

  const handleCreate = async () => {
    if (!title.trim() || !goals.trim() || !interventions.trim()) {
      toast.error('Title, goals, and interventions are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('care_plans').insert({
      patient_user_id: patientUserId,
      title,
      diagnosis: diagnosis || null,
      goals,
      interventions,
      status: 'active',
    });
    if (error) {
      toast.error('Could not create care plan');
    } else {
      toast.success('Care plan created');
      setShowCreate(false);
      setTitle(''); setDiagnosis(''); setGoals(''); setInterventions('');
      fetchPlans();
    }
    setSaving(false);
  };

  const toggleTask = async (task: CarePlanTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('care_plan_tasks')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', task.id);
    if (error) { toast.error('Could not update task'); return; }
    if (task.care_plan_id) fetchTasks(task.care_plan_id);
  };

  const addTask = async (planId: string) => {
    const taskTitle = prompt('Task title:');
    if (!taskTitle?.trim()) return;
    const { error } = await supabase.from('care_plan_tasks').insert({
      care_plan_id: planId,
      patient_user_id: patientUserId,
      title: taskTitle,
      status: 'pending',
    });
    if (error) toast.error('Could not add task');
    else fetchTasks(planId);
  };

  const progress = (planId: string) => {
    const planTasks = tasks[planId] || [];
    if (planTasks.length === 0) return 0;
    return Math.round((planTasks.filter(t => t.status === 'completed').length / planTasks.length) * 100);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" /> Care Plans
        </h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Care Plan</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Diabetes Management" /></div>
              <div><Label>Diagnosis</Label><Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Type 2 Diabetes" /></div>
              <div><Label>Goals *</Label><Textarea value={goals} onChange={e => setGoals(e.target.value)} placeholder="e.g. Maintain HbA1c below 7.0" rows={2} /></div>
              <div><Label>Interventions *</Label><Textarea value={interventions} onChange={e => setInterventions(e.target.value)} placeholder="e.g. Daily walks, low-carb diet, metformin" rows={3} /></div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Create Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <ClipboardList className="h-12 w-12 mx-auto opacity-50" />
            <p className="font-medium">No care plans yet</p>
            <p className="text-sm">Create a care plan to track your health goals and tasks</p>
          </CardContent>
        </Card>
      ) : (
        plans.map(plan => (
          <Card key={plan.id} className="hover:border-primary/30 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className="text-xs">{plan.status}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}>
                  {expandedPlan === plan.id ? 'Collapse' : 'Expand'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {plan.diagnosis && (
                <p className="text-xs text-muted-foreground mb-2">Diagnosis: {plan.diagnosis}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Goals</p>
                    <p className="text-sm">{plan.goals}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Activity className="h-4 w-4 text-accent-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Interventions</p>
                    <p className="text-sm">{plan.interventions}</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress(plan.id)}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{progress(plan.id)}%</span>
              </div>

              {expandedPlan === plan.id && (
                <div className="space-y-2 mt-3 border-t pt-3">
                  {(tasks[plan.id] || []).map(task => (
                    <div key={task.id} className="flex items-center gap-2 group">
                      <Checkbox checked={task.status === 'completed'} onCheckedChange={() => toggleTask(task)} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {format(parseISO(task.due_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addTask(plan.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
