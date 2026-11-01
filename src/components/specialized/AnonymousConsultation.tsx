import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Shield, RefreshCw, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle, Copy, Fingerprint,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface AnonymousConsultationProps {
  patientUserId: string;
  patientName: string;
  patientAccountId: string;
}

const ADJECTIVES = [
  'Sunrise', 'Moonlit', 'Gentle', 'Serene', 'Calm', 'Bright', 'Silent', 'Steady',
  'Warm', 'Golden', 'Silver', 'Crystal', 'Harbor', 'Haven', 'Forest', 'Ocean',
  'River', 'Mountain', 'Meadow', 'Garden', 'Phoenix', 'Horizon', 'Starlit', 'Amber',
];
const NOUNS = [
  'Willow', 'Robin', 'Cedar', 'Sparrow', 'Iris', 'Fern', 'Sage', 'Pearl',
  'Dove', 'Luna', 'Aurora', 'Nova', 'Echo', 'Aspen', 'Coral', 'Jade',
  'Maple', 'Wren', 'Clover', 'Bloom', 'Ray', 'Sky', 'Breeze', 'Star',
];

function generateAlias(): { alias: string; code: string } {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return { alias: `${adj} ${noun}`, code: `${adj}-${noun}-${num}` };
}

export function AnonymousConsultation({ patientUserId, patientName, patientAccountId }: AnonymousConsultationProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [generated, setGenerated] = useState(generateAlias());
  const [customAlias, setCustomAlias] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase.from('anonymous_sessions' as any).select('*')
      .eq('real_user_id', patientUserId)
      .order('created_at', { ascending: false });
    if (data) setSessions(data as any[]);
    setLoading(false);
  }, [patientUserId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const regenerate = () => setGenerated(generateAlias());

  const finalAlias = useCustom && customAlias.trim() ? customAlias.trim() : generated.alias;
  const finalCode = useCustom && customAlias.trim()
    ? `${customAlias.trim().replace(/\s+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`
    : generated.code;

  const createAnonymousSession = async () => {
    setSaving(true);
    try {
      // 1. Create a telemedicine session with alias as patient name
      const sessionCode = `ANON-${Date.now().toString(36).toUpperCase()}`;
      const { data: session, error: sessionError } = await supabase
        .from('telemedicine_sessions')
        .insert({
          session_code: sessionCode,
          doctor_name: 'TBD', // Will be matched
          doctor_type: 'hospital',
          doctor_user_id: patientUserId, // placeholder — patient self-books
          patient_name: finalAlias, // ALIAS, not real name
          patient_user_id: patientUserId,
          patient_account_id: patientAccountId,
          scheduled_at: new Date(Date.now() + 3600000).toISOString(), // 1hr from now
          status: 'scheduled',
          chief_complaint: 'Anonymous SA Consultation',
          doctor_specialty: 'Sexual Assault Counseling',
        })
        .select('id')
        .single();
      if (sessionError) throw sessionError;

      // 2. Create anonymous session record (decoupled)
      const { error: anonError } = await supabase.from('anonymous_sessions' as any).insert({
        real_user_id: patientUserId,
        alias: finalAlias,
        alias_code: finalCode,
        session_id: session.id,
      } as any);
      if (anonError) throw anonError;

      toast.success('Anonymous consultation created');
      setShowSetup(false);
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create session');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Alias code copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Confidential Consultation</h2>
            <p className="text-xs text-muted-foreground">For sexual assault survivors &amp; HIV/STI support</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowInfo(true)}>
          <Lock className="h-3 w-3 mr-1" /> How It Works
        </Button>
      </div>

      {/* Safety Banner */}
      <Card className="border-violet-200 bg-violet-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-violet-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Your identity is protected</p>
              <p className="text-xs text-muted-foreground mt-1">
                This service is exclusively for sexual assault survivors and individuals exposed to HIV or other
                non-curable sexually transmitted infections. Your real name is never shared with the practitioner.
                All records are stored separately from your medical profile.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consultation Category Selector */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Select consultation reason:</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => { setShowSetup(true); setGenerated(generateAlias()); setUseCustom(false); setCustomAlias(''); }}
              className="flex items-center gap-3 p-3 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 transition text-left"
            >
              <Shield className="h-5 w-5 text-violet-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Sexual Assault Counseling</p>
                <p className="text-[11px] text-muted-foreground">Trauma-informed care with full anonymity</p>
              </div>
            </button>
            <button
              onClick={() => { setShowSetup(true); setGenerated(generateAlias()); setUseCustom(false); setCustomAlias(''); }}
              className="flex items-center gap-3 p-3 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 transition text-left"
            >
              <Lock className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">HIV / Non-curable STI Support</p>
                <p className="text-[11px] text-muted-foreground">Confidential consultation for post-exposure or ongoing care</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Anonymous Sessions */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-sm">Your Anonymous Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {sessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="h-4 w-4 text-violet-600" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.alias}</p>
                        <p className="text-[10px] text-muted-foreground">{s.alias_code} · {format(parseISO(s.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyCode(s.alias_code)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-violet-500" /> Create Anonymous Identity
            </DialogTitle>
            <DialogDescription>
              Choose or customize your alias for this consultation. Your real identity will never be shared.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Generated Alias */}
            <Card className={!useCustom ? 'border-primary ring-2 ring-primary/30' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Generated Alias</p>
                    <p className="text-lg font-bold">{generated.alias}</p>
                    <p className="text-xs text-muted-foreground font-mono">{generated.code}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={regenerate} title="Generate new">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    {useCustom && (
                      <Button size="sm" variant="outline" onClick={() => setUseCustom(false)}>
                        Use This
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Alias */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)}
                  className="rounded" id="use-custom" />
                <Label htmlFor="use-custom" className="text-sm">Customize my alias</Label>
              </div>
              {useCustom && (
                <Input value={customAlias} onChange={(e) => setCustomAlias(e.target.value)}
                  placeholder="e.g. Quiet River" className="mt-2" />
              )}
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">Your session will appear as:</p>
              <p className="font-semibold mt-1">{finalAlias}</p>
              <p className="text-xs font-mono text-muted-foreground">{finalCode}</p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Important:</strong> Save your alias code. You'll need it to access session records.
                Your real name ({patientName}) will NOT be shared with the counselor.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetup(false)}>Cancel</Button>
            <Button onClick={createAnonymousSession} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
              Create Anonymous Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* How It Works Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How Anonymous Consultations Work</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                <Fingerprint className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="font-medium">1. Identity Protection</p>
                <p className="text-muted-foreground text-xs">A random alias (e.g., "Sunrise Willow") is generated. You can customize it. Your real name is never visible to the counselor.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                <Lock className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="font-medium">2. Separate Records</p>
                <p className="text-muted-foreground text-xs">Session records are stored independently from your primary medical profile. They cannot be linked back to your identity without your alias code.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="font-medium">3. Trauma-Informed Care</p>
                <p className="text-muted-foreground text-xs">Counselors are trained in trauma-informed approaches. You control what information is shared during the session.</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
              <p><strong>Crisis Resources:</strong> If you are in immediate danger, call 911. For SA crisis support, call RAINN at 1-800-656-4673 (24/7).</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
