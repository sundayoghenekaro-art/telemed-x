import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Building, Clock, CheckCircle2, Activity, User, ClipboardList, ArrowRightFromLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WardRound, DischargeTask } from '@/data/clinicalMockData';

interface InpatientPanelProps {
  rounds: WardRound[];
  discharges: DischargeTask[];
}

const roundStatus = {
  pending: { label: 'Pending', color: 'bg-warning/10 text-warning border-warning/20' },
  'in-progress': { label: 'In Progress', color: 'bg-info/10 text-info border-info/20' },
  completed: { label: 'Done', color: 'bg-success/10 text-success border-success/20' },
};

const dischargeStatus = {
  planning: { label: 'Planning', color: 'bg-muted text-muted-foreground' },
  'pending-approval': { label: 'Pending Approval', color: 'bg-warning text-warning-foreground' },
  approved: { label: 'Approved', color: 'bg-success text-success-foreground' },
  discharged: { label: 'Discharged', color: 'bg-info text-info-foreground' },
};

export function InpatientPanel({ rounds, discharges }: InpatientPanelProps) {
  const sortedRounds = [...rounds].sort((a, b) => {
    const order = { 'in-progress': 0, pending: 1, completed: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Ward Rounds */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Ward Rounds
              </CardTitle>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-xs bg-info/10 text-info">{rounds.filter(r => r.status === 'in-progress').length} active</Badge>
                <Badge variant="outline" className="text-xs">{rounds.filter(r => r.status === 'pending').length} pending</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {sortedRounds.map(round => {
                  const sCfg = roundStatus[round.status];
                  return (
                    <div key={round.id} className={cn("border rounded-lg p-4 space-y-3", round.status === 'in-progress' && "border-info/30 bg-info/5")}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{round.patientName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Building className="h-3 w-3" />
                            <span>{round.ward} — Bed {round.bed}</span>
                            <span>•</span>
                            <User className="h-3 w-3" />
                            <span>{round.physician}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs", sCfg.color)}>{sCfg.label}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(round.scheduledTime), 'h:mm a')}</span>
                        </div>
                      </div>

                      {round.tasks.length > 0 && (
                        <div className="space-y-1">
                          {round.tasks.map((task, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", round.status === 'completed' ? "bg-success" : "bg-muted-foreground/40")} />
                              <span className={round.status === 'completed' ? 'text-muted-foreground line-through' : ''}>{task}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {round.notes && (
                        <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-2">{round.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Discharge Planning */}
      <div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightFromLine className="h-5 w-5 text-success" />
              Discharge Planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {discharges.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pending discharges</p>
              ) : (
                discharges.map(dc => {
                  const sCfg = dischargeStatus[dc.status];
                  return (
                    <div key={dc.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{dc.patientName}</p>
                        <Badge className={cn("text-xs", sCfg.color)}>{sCfg.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>{dc.ward} — Bed {dc.bed}</p>
                        <p>Expected: {format(new Date(dc.expectedDischarge), 'MMM d, h:mm a')}</p>
                      </div>
                      {dc.pendingItems.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground">Pending Items</p>
                            {dc.pendingItems.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <Clock className="h-3 w-3 text-warning shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
