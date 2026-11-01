import { useState, useEffect } from 'react';
import { Mail, Loader2, ArrowLeft, ArrowRight, Eye, Star, X, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildReportHtml } from '@/lib/exportAlerts';
import { VITAL_META } from '@/lib/vitalsThresholds';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const SAVED_EMAILS_KEY = 'vitals-report-saved-emails';
const MAX_RECIPIENTS = 10;

function loadSavedEmails(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_EMAILS_KEY) || '[]');
  } catch { return []; }
}

function persistEmails(emails: string[]) {
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(emails));
}

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

interface AlertExportEntry {
  patientName: string;
  profileLabel: string;
  timestamp: string;
  vitalKey: string;
  value: number;
  level: string;
}

interface EmailReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: AlertExportEntry[];
}

export function EmailReportDialog({ open, onOpenChange, alerts }: EmailReportDialogProps) {
  const [emailInput, setEmailInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<'email' | 'preview'>('email');
  const [savedEmails, setSavedEmails] = useState<string[]>([]);

  useEffect(() => {
    if (open) setSavedEmails(loadSavedEmails());
  }, [open]);

  const inputValid = isValidEmail(emailInput);
  const inputAlreadyAdded = recipients.includes(emailInput.trim());
  const canAdd = inputValid && !inputAlreadyAdded && recipients.length < MAX_RECIPIENTS;

  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  const addRecipient = (addr?: string) => {
    const email = (addr || emailInput).trim();
    if (!isValidEmail(email) || recipients.includes(email) || recipients.length >= MAX_RECIPIENTS) return;
    setRecipients(prev => [...prev, email]);
    if (!addr) setEmailInput('');
  };

  const removeRecipient = (addr: string) => {
    setRecipients(prev => prev.filter(e => e !== addr));
  };

  const toggleSave = () => {
    const email = emailInput.trim();
    let next: string[];
    if (savedEmails.includes(email)) {
      next = savedEmails.filter(e => e !== email);
    } else if (isValidEmail(email)) {
      next = [email, ...savedEmails].slice(0, 10);
    } else return;
    setSavedEmails(next);
    persistEmails(next);
  };

  const removeSaved = (addr: string) => {
    const next = savedEmails.filter(e => e !== addr);
    setSavedEmails(next);
    persistEmails(next);
  };

  const saveNewEmails = (addrs: string[]) => {
    let updated = [...savedEmails];
    for (const addr of addrs) {
      if (!updated.includes(addr)) updated = [addr, ...updated];
    }
    updated = updated.slice(0, 10);
    setSavedEmails(updated);
    persistEmails(updated);
  };

  const handleSend = async () => {
    if (recipients.length === 0) return;
    setSending(true);
    try {
      const html = buildReportHtml(alerts);
      const results = await Promise.allSettled(
        recipients.map(to =>
          supabase.functions.invoke('send-vitals-report', {
            body: { to, html, filters: `${alerts.length} alert(s)` },
          }).then(({ data, error }) => {
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
          })
        )
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      saveNewEmails(recipients);

      if (failed === 0) {
        toast.success(`Report sent to ${succeeded} recipient${succeeded !== 1 ? 's' : ''}`);
      } else if (succeeded > 0) {
        toast.warning(`Sent to ${succeeded}, failed for ${failed} recipient${failed !== 1 ? 's' : ''}`);
      } else {
        toast.error('Failed to send report to all recipients');
      }

      setRecipients([]);
      setEmailInput('');
      setStep('email');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send report');
    } finally {
      setSending(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setStep('email');
      setRecipients([]);
      setEmailInput('');
    }
    onOpenChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canAdd) addRecipient();
      else if (recipients.length > 0 && !emailInput.trim()) setStep('preview');
    }
  };

  const isSaved = savedEmails.includes(emailInput.trim());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            {step === 'email' ? (
              <><Mail className="h-4 w-4" /> Email Vitals Report</>
            ) : (
              <><Eye className="h-4 w-4" /> Report Preview</>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'email' ? (
          <>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Add recipients</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@hospital.org"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={!isValidEmail(emailInput.trim())}
                    onClick={toggleSave}
                    title={isSaved ? 'Remove from saved' : 'Save email'}
                  >
                    <Star className={cn("h-4 w-4", isSaved ? "fill-warning text-warning" : "text-muted-foreground")} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={!canAdd}
                    onClick={() => addRecipient()}
                    title="Add recipient"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {recipients.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Recipients ({recipients.length})
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {recipients.map(addr => (
                      <Badge
                        key={addr}
                        variant="default"
                        className="text-[11px] pl-2 pr-1 py-0.5 gap-1"
                      >
                        {addr}
                        <button
                          onClick={() => removeRecipient(addr)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-primary-foreground/20"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {savedEmails.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Saved recipients</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {savedEmails.map(addr => (
                      <Badge
                        key={addr}
                        variant="secondary"
                        className={cn(
                          "text-[11px] pl-2 pr-1 py-0.5 cursor-pointer gap-1 hover:bg-accent transition-colors",
                          recipients.includes(addr) && "opacity-50",
                        )}
                        onClick={() => addRecipient(addr)}
                      >
                        {addr}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSaved(addr); }}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''} will be sent to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => handleClose(false)}>Cancel</Button>
              <Button size="sm" disabled={recipients.length === 0} onClick={() => setStep('preview')}>
                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>To: <span className="font-medium text-foreground">{recipients.length} recipient{recipients.length !== 1 ? 's' : ''}</span></span>
                  <div className="flex items-center gap-1.5">
                    {criticalCount > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0">{criticalCount} Critical</Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-warning text-warning-foreground border-transparent">{warningCount} Warning</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recipients.map(addr => (
                    <Badge key={addr} variant="outline" className="text-[10px] px-1.5 py-0">{addr}</Badge>
                  ))}
                </div>
              </div>

              <ScrollArea className="h-[260px] rounded-md border bg-muted/30 p-3">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold">Abnormal Vitals Report</h3>
                  <p className="text-[10px] text-muted-foreground">{alerts.length} alert(s) · Generated {format(new Date(), 'PPpp')}</p>

                  <div className="rounded border bg-background overflow-hidden">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-muted/60">
                          <th className="text-left px-2 py-1.5 font-medium">Patient</th>
                          <th className="text-left px-2 py-1.5 font-medium">Vital</th>
                          <th className="text-left px-2 py-1.5 font-medium">Value</th>
                          <th className="text-left px-2 py-1.5 font-medium">Severity</th>
                          <th className="text-left px-2 py-1.5 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.map((a, i) => {
                          const meta = VITAL_META[a.vitalKey];
                          return (
                            <tr
                              key={i}
                              className={cn(
                                "border-t border-border/50",
                                a.level === 'critical' ? 'bg-destructive/5' : 'bg-warning/5',
                              )}
                            >
                              <td className="px-2 py-1">{a.patientName}</td>
                              <td className="px-2 py-1">{meta?.label || a.vitalKey}</td>
                              <td className="px-2 py-1">{a.value} {meta?.unit || ''}</td>
                              <td className="px-2 py-1">
                                <span className={cn(
                                  "text-[9px] font-semibold uppercase px-1 py-0.5 rounded",
                                  a.level === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
                                )}>
                                  {a.level}
                                </span>
                              </td>
                              <td className="px-2 py-1">{format(new Date(a.timestamp), 'h:mm a')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ScrollArea>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setStep('email')}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
              <Button size="sm" disabled={sending} onClick={handleSend}>
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
                Send to {recipients.length}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
