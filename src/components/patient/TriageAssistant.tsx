import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Stethoscope, Loader2, AlertTriangle, Clock, ArrowRight, Lightbulb } from 'lucide-react';

interface TriageResult {
  id: string;
  symptoms: string;
  ai_summary: string | null;
  urgency_level: string;
  recommendations: string | null;
  recommended_specialty: string | null;
  created_at: string;
}

const URGENCY_CONFIG: Record<string, { color: string; label: string; icon: typeof AlertTriangle }> = {
  low: { color: 'text-green-600 bg-green-500/10 border-green-500/30', label: 'Low Priority', icon: Clock },
  moderate: { color: 'text-amber-600 bg-amber-500/10 border-amber-500/30', label: 'Moderate', icon: Clock },
  high: { color: 'text-orange-600 bg-orange-500/10 border-orange-500/30', label: 'High Priority', icon: AlertTriangle },
  emergency: { color: 'text-red-600 bg-red-500/10 border-red-500/30', label: 'Emergency', icon: AlertTriangle },
};

const SPECIALTY_MAP: Record<string, string[]> = {
  cardiology: ['chest pain', 'heart', 'palpitation', 'shortness of breath'],
  dermatology: ['rash', 'skin', 'itch', 'mole', 'acne'],
  neurology: ['headache', 'seizure', 'numbness', 'tingling', 'dizziness'],
  psychiatry: ['depression', 'anxiety', 'mental', 'mood', 'stress'],
  orthopedics: ['joint', 'bone', 'fracture', 'back pain', 'knee', 'hip'],
  endocrinology: ['diabetes', 'thyroid', 'hormone', 'weight'],
  gastroenterology: ['stomach', 'abdominal', 'nausea', 'vomit', 'diarrhea', 'constipation'],
  pulmonology: ['cough', 'breathing', 'asthma', 'lung', 'wheezing'],
  'general practice': [],
};

function analyzeSymptoms(symptoms: string): { urgency: string; summary: string; recommendations: string; specialty: string } {
  const lower = symptoms.toLowerCase();
  let urgency = 'low';
  let specialty = 'general practice';

  if (/chest pain|can't breathe|unconscious|severe bleeding|stroke|suicid/.test(lower)) {
    urgency = 'emergency';
  } else if (/severe|high fever|persistent|worsening|unable to|swelling|fainting/.test(lower)) {
    urgency = 'high';
  } else if (/pain|fever|nausea|dizz|fatigue|infection/.test(lower)) {
    urgency = 'moderate';
  }

  for (const [spec, keywords] of Object.entries(SPECIALTY_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) {
      specialty = spec;
      break;
    }
  }

  const summary = `Based on your reported symptoms, this appears to be a ${urgency} priority case${specialty !== 'general practice' ? ` best suited for ${specialty}` : ''}. ${urgency === 'emergency' ? 'Seek immediate medical attention.' : urgency === 'high' ? 'Schedule a consultation promptly.' : 'A routine consultation is recommended.'}`;

  const recs = [
    urgency === 'emergency' ? 'Call emergency services or visit the nearest emergency room immediately.' : '',
    urgency === 'high' ? 'Book a consultation within 24-48 hours.' : '',
    urgency === 'moderate' ? 'Schedule a consultation within the next week.' : '',
    'Monitor your symptoms and note any changes.',
    'Keep a record of when symptoms occur and what triggers them.',
    specialty !== 'general practice' ? `Consider booking with a ${specialty} specialist.` : '',
  ].filter(Boolean).join(' ');

  return { urgency, summary, recommendations: recs, specialty };
}

export function TriageAssistant({ patientUserId, onBookConsult }: { patientUserId: string; onBookConsult?: () => void }) {
  const [symptoms, setSymptoms] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<TriageResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('triage_assessments')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setResults(data as TriageResult[]);
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim()) { toast.error('Please describe your symptoms'); return; }
    setAnalyzing(true);
    const analysis = analyzeSymptoms(symptoms);

    const { data, error } = await supabase.from('triage_assessments').insert({
      patient_user_id: patientUserId,
      symptoms,
      ai_summary: analysis.summary,
      urgency_level: analysis.urgency,
      recommendations: analysis.recommendations,
      recommended_specialty: analysis.specialty,
      created_by_ai: true,
    }).select().single();

    if (error) {
      toast.error('Could not save triage assessment');
    } else {
      setResults(prev => [data as TriageResult, ...prev]);
      toast.success('Triage assessment complete');
      setSymptoms('');
    }
    setAnalyzing(false);
  };

  if (results.length === 0 && !loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" /> AI Symptom Checker
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Describe your symptoms</Label>
              <Textarea
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                placeholder="e.g. I've been having headaches and feeling dizzy for the past three days..."
                rows={5}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              The AI will assess urgency and recommend a specialist. This is not a substitute for professional medical advice.
            </div>
            <Button onClick={handleAnalyze} disabled={analyzing} className="w-full">
              {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : <>Analyze Symptoms</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" /> AI Symptom Checker
        </h2>
        <Button variant="outline" size="sm" onClick={fetchHistory}>Refresh</Button>
      </div>

      {/* New assessment input */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label>Describe your symptoms</Label>
            <Textarea
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              placeholder="e.g. I've been having headaches and feeling dizzy..."
              rows={3}
            />
          </div>
          <Button onClick={handleAnalyze} disabled={analyzing} size="sm">
            {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : <>Analyze</>}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {results.map(result => {
        const config = URGENCY_CONFIG[result.urgency_level] || URGENCY_CONFIG.low;
        const Icon = config.icon;
        return (
          <Card key={result.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className={config.color}>
                  <Icon className="h-3 w-3 mr-1" /> {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{format(parseISO(result.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Your Symptoms</p>
                  <p className="text-sm">{result.symptoms}</p>
                </div>
                {result.ai_summary && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">AI Assessment</p>
                    <p className="text-sm">{result.ai_summary}</p>
                  </div>
                )}
                {result.recommendations && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Recommendations</p>
                    <p className="text-sm">{result.recommendations}</p>
                  </div>
                )}
                {result.recommended_specialty && result.recommended_specialty !== 'general practice' && (
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="secondary" className="text-xs">Recommended: {result.recommended_specialty}</Badge>
                    {onBookConsult && (
                      <Button size="sm" variant="outline" onClick={onBookConsult}>
                        Book Consult <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
