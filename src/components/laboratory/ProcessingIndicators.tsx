import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cpu, Timer, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProcessingSample {
  sampleId: string;
  analyzerId: string;
  analyzerName: string;
  patientName: string;
  barcode: string;
  startTime: number; // Date.now()
  duration: number; // ms
}

interface ProcessingIndicatorsProps {
  processingSamples: ProcessingSample[];
}

function ProcessingRow({ item }: { item: ProcessingSample }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  const elapsed = now - item.startTime;
  const progress = Math.min((elapsed / item.duration) * 100, 100);
  const remaining = Math.max(0, item.duration - elapsed);
  const remainingSec = Math.ceil(remaining / 1000);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full animate-pulse',
            progress >= 100 ? 'bg-success' : 'bg-primary'
          )} />
          <span className="text-sm font-medium">{item.patientName}</span>
          <Badge variant="secondary" className="text-xs font-mono">{item.barcode}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <Cpu className="h-3 w-3" />
            {item.analyzerName}
          </Badge>
          <span className="text-xs font-mono tabular-nums text-muted-foreground min-w-[40px] text-right">
            {progress >= 100 ? 'Done' : `${remainingSec}s`}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={progress} className="h-2 flex-1" />
        <span className="text-xs font-medium tabular-nums w-[38px] text-right">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

export function ProcessingIndicators({ processingSamples }: ProcessingIndicatorsProps) {
  if (processingSamples.length === 0) return null;

  return (
    <Card className="mt-6 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary animate-pulse" />
          Active Processing
          <Badge variant="secondary" className="ml-1">{processingSamples.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {processingSamples.map(item => (
              <ProcessingRow key={item.sampleId} item={item} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
