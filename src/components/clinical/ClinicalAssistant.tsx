import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Send, Loader2, Trash2, AlertTriangle, User, Heart, Pill, ShieldAlert, X, Plus, MessageSquare, Clock, FileDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Markdown from 'react-markdown';
import { Patient, VitalSigns, Prescription } from '@/types/dhos';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { formatDistanceToNow } from 'date-fns';
import { exportChatAsPdf } from '@/lib/exportChatPdf';
import { supabase } from '@/integrations/supabase/client';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clinical-assistant`;

const QUICK_PROMPTS = [
  "Differential diagnosis for acute chest pain in a 55-year-old male with hypertension",
  "First-line treatment options for community-acquired pneumonia",
  "Drug interaction check: Warfarin + Amoxicillin",
  "Workup recommendations for new-onset atrial fibrillation",
];

interface ClinicalAssistantProps {
  patients?: Patient[];
  vitalsHistory?: Record<string, VitalSigns[]>;
  prescriptions?: Prescription[];
}

function buildPatientContext(
  patient: Patient,
  vitals?: VitalSigns[],
  prescriptions?: Prescription[]
): string {
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
  const lines: string[] = [
    `--- PATIENT CONTEXT (for clinical decision support) ---`,
    `Name: ${patient.firstName} ${patient.lastName} | Age: ${age} | Gender: ${patient.gender} | Blood Type: ${patient.bloodType || 'Unknown'}`,
    `Status: ${patient.status} | Ward: ${patient.wardLocation || 'N/A'} | Bed: ${patient.bedNumber || 'N/A'}`,
  ];

  if (patient.allergies.length > 0) {
    lines.push(`⚠️ ALLERGIES: ${patient.allergies.join(', ')}`);
  } else {
    lines.push(`Allergies: NKDA (No Known Drug Allergies)`);
  }

  if (vitals && vitals.length > 0) {
    const latest = vitals[vitals.length - 1];
    const vitalParts: string[] = [];
    if (latest.heartRate) vitalParts.push(`HR: ${latest.heartRate} bpm`);
    if (latest.bloodPressureSystolic && latest.bloodPressureDiastolic)
      vitalParts.push(`BP: ${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic} mmHg`);
    if (latest.temperature) vitalParts.push(`Temp: ${latest.temperature}°C`);
    if (latest.respiratoryRate) vitalParts.push(`RR: ${latest.respiratoryRate}/min`);
    if (latest.oxygenSaturation) vitalParts.push(`SpO2: ${latest.oxygenSaturation}%`);
    if (latest.painLevel !== undefined) vitalParts.push(`Pain: ${latest.painLevel}/10`);
    lines.push(`Latest Vitals: ${vitalParts.join(' | ')}`);
  }

  if (prescriptions && prescriptions.length > 0) {
    const activeMeds = prescriptions
      .filter(rx => rx.status !== 'cancelled')
      .flatMap(rx => rx.items.map(item => `${item.medicationName} ${item.dosage} ${item.frequency} (${item.route})`));
    if (activeMeds.length > 0) {
      lines.push(`Current Medications: ${activeMeds.join('; ')}`);
    }
  }

  lines.push(`--- END PATIENT CONTEXT ---`);
  return lines.join('\n');
}

export function ClinicalAssistant({ patients = [], vitalsHistory = {}, prescriptions = [] }: ClinicalAssistantProps) {
  const persistence = useChatPersistence();
  const { conversations, activeConversationId, messages, setMessages, userId, loading: historyLoading } = persistence;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatientUpid, setSelectedPatientUpid] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedPatient = useMemo(
    () => patients.find(p => p.upid === selectedPatientUpid) || null,
    [patients, selectedPatientUpid]
  );

  const patientVitals = useMemo(
    () => (selectedPatientUpid ? vitalsHistory[selectedPatientUpid] : undefined),
    [vitalsHistory, selectedPatientUpid]
  );

  const patientPrescriptions = useMemo(
    () => (selectedPatientUpid ? prescriptions.filter(rx => rx.patientUpid === selectedPatientUpid) : []),
    [prescriptions, selectedPatientUpid]
  );

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Ensure we have a conversation ID (create one if needed)
    let convId = activeConversationId;
    if (!convId && userId) {
      convId = await persistence.createConversation(
        selectedPatientUpid,
        selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : null
      );
    }

    // Build messages with patient context
    let apiMessages = [...updatedMessages];
    if (selectedPatient) {
      const context = buildPatientContext(selectedPatient, patientVitals, patientPrescriptions);
      apiMessages = [
        { role: 'user' as const, content: context },
        { role: 'assistant' as const, content: 'Understood. I have the patient context loaded. How can I help with this patient?' },
        ...updatedMessages,
      ];
    }

    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in to use the clinical assistant');
        setIsLoading(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        const errorMsg = errorData.error || `Request failed (${resp.status})`;
        if (resp.status === 429) toast.warning('Rate limit reached. Please wait a moment.');
        else if (resp.status === 402) toast.error('AI credits exhausted. Add credits in workspace settings.');
        else toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const updateAssistant = (content: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '' || !line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              updateAssistant(assistantContent);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (const raw of buffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              updateAssistant(assistantContent);
            }
          } catch { /* ignore */ }
        }
      }

      // Persist the exchange
      if (convId && assistantContent) {
        await persistence.saveMessages(convId, text.trim(), assistantContent);
      }
    } catch (err) {
      console.error('Chat error:', err);
      toast.error('Failed to get a response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    persistence.startNewChat();
    setInput('');
  };

  return (
    <div className="flex gap-4">
      {/* Conversation History Sidebar */}
      {userId && (
        <Card className="w-64 shrink-0 border-border">
          <CardHeader className="py-3 px-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                History
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearChat} title="New conversation">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="h-7 text-xs pl-7 pr-2"
                />
              </div>
            </div>
            <ScrollArea className="h-[490px]">
              <div className="px-2 pb-2 space-y-1">
                {(() => {
                  const q = historySearch.toLowerCase().trim();
                  const filtered = q
                    ? conversations.filter(c =>
                        c.title.toLowerCase().includes(q) ||
                        (c.patient_name && c.patient_name.toLowerCase().includes(q))
                      )
                    : conversations;

                  if (filtered.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground/60 text-center py-4">
                        {q ? 'No matching conversations' : 'No past conversations'}
                      </p>
                    );
                  }

                  return filtered.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-start gap-1.5 p-2 rounded-md cursor-pointer text-xs transition-colors ${
                        conv.id === activeConversationId
                          ? 'bg-primary/10 text-foreground'
                          : 'hover:bg-muted/60 text-muted-foreground'
                      }`}
                      onClick={() => persistence.loadConversation(conv.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.title}</p>
                        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                        </p>
                        {conv.patient_name && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 mt-1 font-normal">
                            {conv.patient_name}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => { e.stopPropagation(); persistence.deleteConversation(conv.id); }}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ));
                })()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Patient Context Selector */}
        <Card className="border-border">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
                <User className="h-4 w-4" />
                Patient Context
              </div>
              <Select
                value={selectedPatientUpid || ''}
                onValueChange={(val) => setSelectedPatientUpid(val || null)}
              >
                <SelectTrigger className="flex-1 max-w-xs h-8 text-sm">
                  <SelectValue placeholder="No patient selected (general query)" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.upid} value={p.upid}>
                      <span className="flex items-center gap-2">
                        {p.firstName} {p.lastName}
                        <Badge variant={p.status === 'critical' ? 'destructive' : p.status === 'monitoring' ? 'secondary' : 'outline'} className="text-[10px] px-1 py-0">
                          {p.status}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPatientUpid && (
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setSelectedPatientUpid(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {selectedPatient && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                <Badge variant="outline" className="text-xs gap-1 font-normal">
                  <User className="h-3 w-3" />
                  {selectedPatient.firstName} {selectedPatient.lastName}, {selectedPatient.gender}, {new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()}y
                </Badge>
                {selectedPatient.allergies.length > 0 ? (
                  <Badge variant="destructive" className="text-xs gap-1 font-normal">
                    <ShieldAlert className="h-3 w-3" />
                    Allergies: {selectedPatient.allergies.join(', ')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1 font-normal text-muted-foreground">
                    <ShieldAlert className="h-3 w-3" />
                    NKDA
                  </Badge>
                )}
                {patientVitals && patientVitals.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 font-normal">
                    <Heart className="h-3 w-3" />
                    Vitals: HR {patientVitals[patientVitals.length - 1].heartRate}, BP {patientVitals[patientVitals.length - 1].bloodPressureSystolic}/{patientVitals[patientVitals.length - 1].bloodPressureDiastolic}
                  </Badge>
                )}
                {patientPrescriptions.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 font-normal">
                    <Pill className="h-3 w-3" />
                    {patientPrescriptions.flatMap(rx => rx.items).length} active medication(s)
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5 text-primary" />
                AI Clinical Assistant
                <Badge variant="outline" className="text-xs font-normal">Beta</Badge>
              </CardTitle>
              {messages.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportChatAsPdf({
                      messages,
                      patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : null,
                      conversationTitle: conversations.find(c => c.id === activeConversationId)?.title,
                    })}
                    className="text-muted-foreground"
                  >
                    <FileDown className="h-4 w-4 mr-1" /> Export PDF
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground">
                    <Trash2 className="h-4 w-4 mr-1" /> Clear
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20 text-xs text-warning-foreground">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
              <span>AI-assisted clinical decision support only. All recommendations must be validated by the treating physician.</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-[400px] pr-3" ref={scrollRef as any}>
              <div className="space-y-4">
                {historyLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!historyLoading && messages.length === 0 && (
                  <div className="text-center py-8 space-y-4">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground/40" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {selectedPatient
                          ? `Patient context loaded: ${selectedPatient.firstName} ${selectedPatient.lastName}`
                          : 'Clinical Assistant Ready'}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {selectedPatient
                          ? 'Ask about this patient\'s diagnosis, treatment options, or drug interactions — the AI has their vitals, allergies, and medications.'
                          : 'Select a patient above for targeted recommendations, or ask a general clinical question.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                      {(selectedPatient
                        ? [
                            `What are the recommended next steps for this patient?`,
                            `Are there any drug interaction risks with current medications?`,
                            `Suggest a diagnostic workup based on current vitals`,
                            `Review allergy safety for potential prescriptions`,
                          ]
                        : QUICK_PROMPTS
                      ).map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(prompt)}
                          className="text-left text-xs p-2.5 rounded-md border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-muted-foreground"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedPatient
                  ? `Ask about ${selectedPatient.firstName}'s diagnosis, treatment, interactions…`
                  : 'Describe symptoms, ask for differential diagnosis, treatment options…'}
                className="min-h-[44px] max-h-[120px] resize-none text-sm"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 h-[44px] w-[44px]"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
