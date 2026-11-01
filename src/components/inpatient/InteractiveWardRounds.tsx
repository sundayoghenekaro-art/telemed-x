import { useState } from 'react';
import { format } from 'date-fns';
import { ClipboardList, CheckCircle2, Play, MessageSquare, Building, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { WardRound } from '@/data/inpatientMockData';

const roundStatus = {
  pending: { label: 'Pending', color: 'bg-warning/10 text-warning border-warning/20' },
  'in-progress': { label: 'In Progress', color: 'bg-info/10 text-info border-info/20' },
  completed: { label: 'Done', color: 'bg-success/10 text-success border-success/20' },
};

interface InteractiveWardRoundsProps {
  rounds: WardRound[];
  onUpdateRound: (roundId: string, updates: Partial<WardRound>) => void;
}

export function InteractiveWardRounds({ rounds, onUpdateRound }: InteractiveWardRoundsProps) {
  const [expandedRound, setExpandedRound] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [completedTasks, setCompletedTasks] = useState<Record<string, Set<number>>>({});

  const sortedRounds = [...rounds].sort((a, b) => {
    const order = { 'in-progress': 0, pending: 1, completed: 2 };
    return order[a.status] - order[b.status];
  });

  const activeCount = rounds.filter(r => r.status === 'in-progress').length;
  const pendingCount = rounds.filter(r => r.status === 'pending').length;

  const toggleTask = (roundId: string, taskIdx: number) => {
    setCompletedTasks(prev => {
      const set = new Set(prev[roundId] || []);
      if (set.has(taskIdx)) set.delete(taskIdx); else set.add(taskIdx);
      return { ...prev, [roundId]: set };
    });
  };

  const startRound = (roundId: string) => {
    onUpdateRound(roundId, { status: 'in-progress' });
  };

  const completeRound = (roundId: string) => {
    const notes = noteInputs[roundId]?.trim();
    onUpdateRound(roundId, {
      status: 'completed',
      completedTime: new Date().toISOString(),
      notes: notes || undefined,
    });
    setExpandedRound(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Ward Rounds
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-xs bg-info/10 text-info">{activeCount} active</Badge>
            <Badge variant="outline" className="text-xs">{pendingCount} pending</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px]">
          <div className="space-y-3">
            {sortedRounds.map(round => {
              const sCfg = roundStatus[round.status];
              const isExpanded = expandedRound === round.id;
              const doneTasks = completedTasks[round.id] || new Set();
              const allTasksDone = round.tasks.length > 0 && doneTasks.size === round.tasks.length;

              return (
                <div
                  key={round.id}
                  className={cn(
                    "border rounded-lg p-4 space-y-3 cursor-pointer transition-all",
                    round.status === 'in-progress' && "border-info/30 bg-info/5",
                    isExpanded && "ring-1 ring-primary/30",
                  )}
                  onClick={() => setExpandedRound(isExpanded ? null : round.id)}
                >
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

                  {/* Tasks with checkboxes */}
                  {round.tasks.length > 0 && (
                    <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                      {round.tasks.map((task, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={round.status === 'completed' || doneTasks.has(i)}
                            disabled={round.status === 'completed'}
                            onCheckedChange={() => toggleTask(round.id, i)}
                            className="h-4 w-4"
                          />
                          <span className={cn(
                            (round.status === 'completed' || doneTasks.has(i)) && 'text-muted-foreground line-through'
                          )}>{task}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {round.notes && (
                    <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-2">{round.notes}</p>
                  )}

                  {/* Expanded actions */}
                  {isExpanded && round.status !== 'completed' && (
                    <div className="space-y-2 border-t border-border/50 pt-3" onClick={e => e.stopPropagation()}>
                      <Textarea
                        placeholder="Add round notes..."
                        value={noteInputs[round.id] || ''}
                        onChange={e => setNoteInputs(prev => ({ ...prev, [round.id]: e.target.value }))}
                        className="h-16 text-xs"
                      />
                      <div className="flex gap-2">
                        {round.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => startRound(round.id)} className="text-xs gap-1">
                            <Play className="h-3 w-3" />
                            Start Round
                          </Button>
                        )}
                        {round.status === 'in-progress' && (
                          <Button size="sm" onClick={() => completeRound(round.id)} disabled={!allTasksDone} className="text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete Round
                          </Button>
                        )}
                      </div>
                      {round.status === 'in-progress' && !allTasksDone && (
                        <p className="text-[10px] text-muted-foreground">Complete all tasks to finish round</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
