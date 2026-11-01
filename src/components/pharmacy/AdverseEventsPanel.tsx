import { useAdverseEvents } from '@/hooks/useOpenFda';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AdverseEventsPanelProps {
  genericName: string;
}

export function AdverseEventsPanel({ genericName }: AdverseEventsPanelProps) {
  const { data: events, isLoading, isError } = useAdverseEvents(genericName);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (isError || !events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No adverse event data available for this medication.</p>
      </div>
    );
  }

  const maxCount = events[0]?.count ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Top Reported Adverse Reactions</p>
        <Badge variant="outline" className="text-xs">FDA FAERS Database</Badge>
      </div>
      <div className="space-y-2">
        {events.map((event, i) => (
          <div key={event.term} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{event.term.toLowerCase()}</span>
                <span className="text-xs text-muted-foreground font-mono">{event.count.toLocaleString()}</span>
              </div>
              <Progress value={(event.count / maxCount) * 100} className="h-1.5" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Source: FDA Adverse Event Reporting System (FAERS). Counts represent total reports, not incidence rates.
      </p>
    </div>
  );
}
