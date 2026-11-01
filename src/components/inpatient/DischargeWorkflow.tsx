import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowRightFromLine, CheckCircle2, Clock, FileText, AlertTriangle, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DischargeTask, Bed } from '@/data/inpatientMockData';
import { toast } from 'sonner';
import { openDischargeSummary } from '@/lib/dischargeSummaryReport';

const dischargeStatus = {
  planning: { label: 'Planning', color: 'bg-muted text-muted-foreground' },
  'pending-approval': { label: 'Pending Approval', color: 'bg-warning text-warning-foreground' },
  approved: { label: 'Approved', color: 'bg-success text-success-foreground' },
  discharged: { label: 'Discharged', color: 'bg-info text-info-foreground' },
};

interface DischargeWorkflowProps {
  discharges: DischargeTask[];
  onUpdateDischarge: (id: string, updates: Partial<DischargeTask>) => void;
  canDischarge?: boolean;
}

export function DischargeWorkflow({ discharges, onUpdateDischarge, canDischarge = false }: DischargeWorkflowProps) {
  const [completedItems, setCompletedItems] = useState<Record<string, Set<number>>>({});
  const [summaryDialog, setSummaryDialog] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState('');

  const toggleItem = (dcId: string, idx: number) => {
    setCompletedItems(prev => {
      const set = new Set(prev[dcId] || []);
      if (set.has(idx)) set.delete(idx); else set.add(idx);
      return { ...prev, [dcId]: set };
    });
  };

  const allItemsDone = (dc: DischargeTask) => {
    const done = completedItems[dc.id] || new Set();
    return dc.pendingItems.length === 0 || done.size === dc.pendingItems.length;
  };

  const handleApprove = (dc: DischargeTask) => {
    onUpdateDischarge(dc.id, { status: 'approved' });
    toast.success(`${dc.patientName} discharge approved`);
  };

  const handleDischarge = (dcId: string) => {
    onUpdateDischarge(dcId, { status: 'discharged' });
    setSummaryDialog(null);
    toast.success('Patient discharged successfully');
  };

  const sorted = [...discharges].sort((a, b) => {
    const order = { 'pending-approval': 0, planning: 1, approved: 2, discharged: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightFromLine className="h-5 w-5 text-success" />
              Discharge Workflow
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {discharges.filter(d => d.status !== 'discharged').length} active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px]">
            <div className="space-y-4">
              {sorted.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pending discharges</p>
              ) : (
                sorted.map(dc => {
                  const sCfg = dischargeStatus[dc.status];
                  const done = completedItems[dc.id] || new Set();
                  const allDone = allItemsDone(dc);

                  return (
                    <div key={dc.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{dc.patientName}</p>
                          <p className="text-xs text-muted-foreground">{dc.ward} — Bed {dc.bed}</p>
                        </div>
                        <Badge className={cn("text-xs", sCfg.color)}>{sCfg.label}</Badge>
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>Admitted: {format(new Date(dc.admissionDate), 'MMM d')}</span>
                        <span>·</span>
                        <span>Expected: {format(new Date(dc.expectedDischarge), 'MMM d, h:mm a')}</span>
                      </div>

                      {dc.pendingItems.length > 0 && dc.status !== 'discharged' && (
                        <>
                          <Separator />
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Checklist ({done.size}/{dc.pendingItems.length})
                            </p>
                            {dc.pendingItems.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <Checkbox
                                  checked={done.has(i)}
                                  onCheckedChange={() => toggleItem(dc.id, i)}
                                  className="h-3.5 w-3.5"
                                />
                                <span className={done.has(i) ? 'line-through text-muted-foreground' : ''}>{item}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {dc.status === 'discharged' && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            onClick={() => {
                              const bed: Bed = {
                                id: dc.id,
                                wardId: 'W1',
                                bedNumber: dc.bed,
                                wardName: dc.ward,
                                status: 'occupied',
                                patientName: dc.patientName,
                                admissionDate: dc.admissionDate,
                                physician: dc.physician,
                                acuity: 'medium',
                              };
                              openDischargeSummary(bed);
                            }}
                          >
                            <Printer className="h-3 w-3" />
                            Print Summary
                          </Button>
                        </div>
                      )}

                      {canDischarge && dc.status !== 'discharged' && (
                        <div className="flex gap-2 pt-1">
                          {dc.status === 'planning' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              disabled={!allDone}
                              onClick={() => onUpdateDischarge(dc.id, { status: 'pending-approval' })}
                            >
                              Submit for Approval
                            </Button>
                          )}
                          {dc.status === 'pending-approval' && (
                            <Button size="sm" className="text-xs gap-1" onClick={() => handleApprove(dc)}>
                              <CheckCircle2 className="h-3 w-3" />
                              Approve Discharge
                            </Button>
                          )}
                          {dc.status === 'approved' && (
                            <Button size="sm" className="text-xs gap-1" onClick={() => setSummaryDialog(dc.id)}>
                              <FileText className="h-3 w-3" />
                              Discharge Patient
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Discharge Summary Dialog */}
      <Dialog open={!!summaryDialog} onOpenChange={(v) => { if (!v) setSummaryDialog(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Discharge Summary
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Provide a brief discharge summary before completing the discharge.
            </p>
            <Textarea
              value={summaryText}
              onChange={e => setSummaryText(e.target.value)}
              placeholder="Discharge summary, follow-up instructions, medications..."
              className="h-32 text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSummaryDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={() => summaryDialog && handleDischarge(summaryDialog)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Complete Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
