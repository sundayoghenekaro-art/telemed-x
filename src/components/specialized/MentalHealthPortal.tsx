import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Brain, Heart, Smile, Meh, Frown, CloudRain, Sun,
  TrendingUp, ClipboardList, Loader2, Calendar, CheckCircle, Users,
} from 'lucide-react';
import { MentalHealthProviderDirectory } from './MentalHealthProviderDirectory';
import { toast } from 'sonner';
import { format, parseISO, subDays } from 'date-fns';

interface MentalHealthPortalProps {
  patientUserId: string;
  patientName: string;
  patientAccountId?: string;
  onBookingComplete?: () => void;
}

const MOODS = [
  { score: 1, label: 'Very Low', emoji: '😢', icon: CloudRain, color: 'text-red-400' },
  { score: 2, label: 'Low', emoji: '😟', icon: Frown, color: 'text-orange-400' },
  { score: 3, label: 'Okay', emoji: '😐', icon: Meh, color: 'text-yellow-400' },
  { score: 4, label: 'Good', emoji: '😊', icon: Smile, color: 'text-green-400' },
  { score: 5, label: 'Great', emoji: '🌟', icon: Sun, color: 'text-emerald-400' },
];

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure',
  'Trouble concentrating on things',
  'Moving or speaking slowly, or being fidgety/restless',
  'Thoughts that you would be better off dead, or of hurting yourself',
];

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it\'s hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid as if something awful might happen',
];

const SEVERITY_MAP_PHQ9 = (s: number) =>
  s <= 4 ? 'Minimal' : s <= 9 ? 'Mild' : s <= 14 ? 'Moderate' : s <= 19 ? 'Moderately Severe' : 'Severe';
const SEVERITY_MAP_GAD7 = (s: number) =>
  s <= 4 ? 'Minimal' : s <= 9 ? 'Mild' : s <= 14 ? 'Moderate' : 'Severe';

export function MentalHealthPortal({ patientUserId, patientName, patientAccountId, onBookingComplete }: MentalHealthPortalProps) {
  const [tab, setTab] = useState('mood');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Brain className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-foreground">Mental Health</h2>
          <p className="text-xs text-muted-foreground">Mood tracking, assessments & mental wellness</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mood">
            <Heart className="h-3 w-3 mr-1" /> Daily Mood
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-3 w-3 mr-1" /> Trends
          </TabsTrigger>
          <TabsTrigger value="assessments">
            <ClipboardList className="h-3 w-3 mr-1" /> PHQ-9 / GAD-7
          </TabsTrigger>
          <TabsTrigger value="providers">
            <Users className="h-3 w-3 mr-1" /> Providers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mood" className="mt-4">
          <MoodLogger patientUserId={patientUserId} />
        </TabsContent>
        <TabsContent value="trends" className="mt-4">
          <MoodTrends patientUserId={patientUserId} />
        </TabsContent>
        <TabsContent value="assessments" className="mt-4">
          <AssessmentPanel patientUserId={patientUserId} />
        </TabsContent>
        <TabsContent value="providers" className="mt-4">
          {patientAccountId && onBookingComplete ? (
            <MentalHealthProviderDirectory
              patientUserId={patientUserId}
              patientName={patientName}
              patientAccountId={patientAccountId}
              onBookingComplete={onBookingComplete}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm">Provider directory is not available in this context</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MoodLogger({ patientUserId }: { patientUserId: string }) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [journal, setJournal] = useState('');
  const [saving, setSaving] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase.from('mood_entries' as any).select('*')
      .eq('patient_user_id', patientUserId)
      .eq('logged_at', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTodayEntry(data);
          setSelectedMood((data as any).mood_score);
          setJournal((data as any).journal_notes || '');
        }
        setLoading(false);
      });
  }, [patientUserId]);

  const saveMood = async () => {
    if (!selectedMood) return;
    setSaving(true);
    const mood = MOODS.find(m => m.score === selectedMood)!;
    const today = new Date().toISOString().split('T')[0];

    try {
      if (todayEntry) {
        await supabase.from('mood_entries' as any)
          .update({ mood_score: selectedMood, mood_label: mood.label, journal_notes: journal || null } as any)
          .eq('id', (todayEntry as any).id);
      } else {
        await supabase.from('mood_entries' as any).insert({
          patient_user_id: patientUserId,
          mood_score: selectedMood,
          mood_label: mood.label,
          journal_notes: journal || null,
          logged_at: today,
        } as any);
      }
      setTodayEntry({ mood_score: selectedMood });
      toast.success('Mood logged!');
    } catch {
      toast.error('Failed to save mood');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-base">How are you feeling today?</CardTitle>
        <CardDescription>{format(new Date(), 'EEEE, MMMM d')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center gap-4">
          {MOODS.map(m => (
            <button key={m.score}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                selectedMood === m.score ? 'bg-accent scale-110 ring-2 ring-primary' : 'hover:bg-accent'
              }`}
              onClick={() => setSelectedMood(m.score)}>
              <span className="text-3xl">{m.emoji}</span>
              <span className={`text-xs font-medium ${m.color}`}>{m.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Journal (optional)</Label>
          <Textarea value={journal} onChange={(e) => setJournal(e.target.value)}
            placeholder="How are you feeling? What's on your mind..."
            className="min-h-[80px]" />
        </div>

        <Button onClick={saveMood} disabled={!selectedMood || saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Heart className="h-4 w-4 mr-2" />}
          {todayEntry ? 'Update Mood' : 'Log Mood'}
        </Button>

        {todayEntry && (
          <p className="text-xs text-center text-emerald-600 flex items-center justify-center gap-1">
            <CheckCircle className="h-3 w-3" /> You've already logged today
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MoodTrends({ patientUserId }: { patientUserId: string }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
    supabase.from('mood_entries' as any).select('*')
      .eq('patient_user_id', patientUserId)
      .gte('logged_at', thirtyDaysAgo)
      .order('logged_at', { ascending: true })
      .then(({ data }) => {
        if (data) setEntries(data as any[]);
        setLoading(false);
      });
  }, [patientUserId]);

  const avgMood = useMemo(() => {
    if (entries.length === 0) return 0;
    return entries.reduce((sum, e) => sum + e.mood_score, 0) / entries.length;
  }, [entries]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Days logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{avgMood.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg mood (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl">{entries.length > 0 ? MOODS.find(m => m.score === Math.round(avgMood))?.emoji || '😐' : '—'}</p>
            <p className="text-xs text-muted-foreground">Overall</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm">Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No mood data yet. Start logging daily!</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {entries.map((entry, i) => {
                const height = (entry.mood_score / 5) * 100;
                const mood = MOODS.find(m => m.score === entry.mood_score);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                    <div className="absolute -top-8 hidden group-hover:block bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow whitespace-nowrap z-10">
                      {format(parseISO(entry.logged_at), 'MMM d')} — {mood?.emoji} {mood?.label}
                    </div>
                    <div
                      className="w-full rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${height}%`,
                        background: entry.mood_score >= 4 ? 'hsl(150 60% 45%)' : entry.mood_score >= 3 ? 'hsl(50 80% 45%)' : 'hsl(0 70% 50%)',
                        minHeight: '4px',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm">Recent Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-60">
            <div className="space-y-3">
              {entries.filter(e => e.journal_notes).slice(-5).reverse().map((entry, i) => {
                const mood = MOODS.find(m => m.score === entry.mood_score);
                return (
                  <div key={i} className="p-3 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{mood?.emoji}</span>
                      <span className="text-xs text-muted-foreground">{format(parseISO(entry.logged_at), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-sm text-foreground">{entry.journal_notes}</p>
                  </div>
                );
              })}
              {entries.filter(e => e.journal_notes).length === 0 && (
                <p className="text-center text-muted-foreground py-4">No journal entries yet</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function AssessmentPanel({ patientUserId }: { patientUserId: string }) {
  const [assessmentType, setAssessmentType] = useState<'phq9' | 'gad7' | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const questions = assessmentType === 'phq9' ? PHQ9_QUESTIONS : assessmentType === 'gad7' ? GAD7_QUESTIONS : [];
  const severityFn = assessmentType === 'phq9' ? SEVERITY_MAP_PHQ9 : SEVERITY_MAP_GAD7;
  const maxScore = assessmentType === 'phq9' ? 27 : 21;

  useEffect(() => {
    supabase.from('mood_assessments' as any).select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setHistory(data as any[]);
        setLoadingHistory(false);
      });
  }, [patientUserId]);

  const startAssessment = (type: 'phq9' | 'gad7') => {
    setAssessmentType(type);
    setAnswers(new Array(type === 'phq9' ? 9 : 7).fill(-1));
  };

  const totalScore = answers.reduce((sum, a) => sum + (a >= 0 ? a : 0), 0);
  const allAnswered = answers.every(a => a >= 0);

  const submitAssessment = async () => {
    if (!assessmentType || !allAnswered) return;
    setSaving(true);
    try {
      const severity = severityFn(totalScore);
      await supabase.from('mood_assessments' as any).insert({
        patient_user_id: patientUserId,
        assessment_type: assessmentType,
        answers: answers,
        total_score: totalScore,
        severity,
      } as any);
      toast.success(`${assessmentType.toUpperCase()} assessment completed — ${severity}`);
      setHistory(prev => [{ assessment_type: assessmentType, total_score: totalScore, severity, created_at: new Date().toISOString() }, ...prev]);
      setAssessmentType(null);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (assessmentType) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">{assessmentType === 'phq9' ? 'PHQ-9 Depression' : 'GAD-7 Anxiety'} Screening</CardTitle>
          <CardDescription>Over the last 2 weeks, how often have you been bothered by:</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted border border-border space-y-2">
                  <p className="text-sm text-foreground">{i + 1}. {q}</p>
                  <div className="flex gap-2 flex-wrap">
                    {['Not at all', 'Several days', 'More than half', 'Nearly every day'].map((label, val) => (
                      <Button key={val} size="sm" variant={answers[i] === val ? 'default' : 'outline'}
                        onClick={() => {
                          const newAnswers = [...answers];
                          newAnswers[i] = val;
                          setAnswers(newAnswers);
                        }}>
                        {val} — {label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4">
                <div>
                  <p className="text-sm text-foreground">Score: <span className="font-bold">{totalScore}</span> / {maxScore}</p>
                  {allAnswered && <p className="text-xs text-primary">Severity: {severityFn(totalScore)}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAssessmentType(null)}>Cancel</Button>
                  <Button onClick={submitAssessment} disabled={!allAnswered || saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => startAssessment('phq9')}>
          <CardContent className="pt-6 text-center space-y-2">
            <div className="h-12 w-12 mx-auto rounded-xl bg-blue-100 flex items-center justify-center">
              <CloudRain className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-foreground">PHQ-9</h3>
            <p className="text-xs text-muted-foreground">Depression screening — 9 questions</p>
            <Button variant="outline" size="sm">Start Assessment</Button>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => startAssessment('gad7')}>
          <CardContent className="pt-6 text-center space-y-2">
            <div className="h-12 w-12 mx-auto rounded-xl bg-amber-100 flex items-center justify-center">
              <Brain className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-foreground">GAD-7</h3>
            <p className="text-xs text-muted-foreground">Anxiety screening — 7 questions</p>
            <Button variant="outline" size="sm">Start Assessment</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm">Assessment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
          ) : history.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No assessments taken yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {(a.assessment_type as string).toUpperCase()}
                    </Badge>
                    <span className="text-sm text-foreground">Score: {a.total_score}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className={`text-xs ${
                      a.severity === 'Minimal' ? 'bg-emerald-100 text-emerald-700' :
                      a.severity === 'Mild' ? 'bg-yellow-100 text-yellow-700' :
                      a.severity === 'Moderate' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>{a.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{format(parseISO(a.created_at), 'MMM d')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
