import { useState, useMemo } from 'react';
import { useDrugRecalls } from '@/hooks/useOpenFda';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldAlert, ExternalLink, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const CLASS_OPTIONS = ['All', 'Class I', 'Class II', 'Class III'] as const;
type ClassFilter = typeof CLASS_OPTIONS[number];

const classColors: Record<string, string> = {
  'Class I': 'bg-destructive text-destructive-foreground',
  'Class II': 'bg-warning text-warning-foreground',
  'Class III': 'bg-muted text-muted-foreground',
};

export function FdaRecallAlerts() {
  const { data: recalls, isLoading, isError } = useDrugRecalls(25);
  const [filter, setFilter] = useState('');
  const [classFilter, setClassFilter] = useState<ClassFilter>('All');

  const filtered = useMemo(() => {
    if (!recalls) return [];
    let result = recalls;
    if (classFilter !== 'All') {
      result = result.filter(r => r.classification === classFilter);
    }
    if (filter.trim()) {
      const q = filter.toLowerCase();
      result = result.filter(r =>
        r.product_description.toLowerCase().includes(q) ||
        r.recalling_firm.toLowerCase().includes(q) ||
        r.reason_for_recall.toLowerCase().includes(q)
      );
    }
    return result;
  }, [recalls, filter, classFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            FDA Drug Recall Alerts
          </CardTitle>
          <a
            href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 shrink-0"
          >
            FDA.gov <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by drug name, manufacturer, or reason..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {CLASS_OPTIONS.map(cls => (
            <Button
              key={cls}
              size="sm"
              variant={classFilter === cls ? 'default' : 'outline'}
              className={cn('h-7 text-xs', classFilter === cls && cls === 'Class I' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground', classFilter === cls && cls === 'Class II' && 'bg-warning hover:bg-warning/90 text-warning-foreground', classFilter === cls && cls === 'Class III' && 'bg-muted hover:bg-muted/80 text-muted-foreground')}
              onClick={() => setClassFilter(cls)}
            >
              {cls}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : isError || !recalls || recalls.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Unable to load recall data</p>
            <p className="text-xs mt-1">Check your connection or try again later.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No recalls match "{filter}"</p>
            <p className="text-xs mt-1">Try a different drug name or manufacturer.</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              <p className="text-xs text-muted-foreground">{filtered.length} of {recalls.length} alerts</p>
              {filtered.map((recall) => (
                <div key={recall.recall_number} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug flex-1">
                      {recall.product_description.slice(0, 200)}
                      {recall.product_description.length > 200 && '…'}
                    </p>
                    <Badge className={cn('text-xs shrink-0', classColors[recall.classification] ?? 'bg-muted text-muted-foreground')}>
                      {recall.classification}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{recall.reason_for_recall}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{recall.recall_number}</span>
                    <span>{recall.recalling_firm}</span>
                    {recall.city && <span>{recall.city}, {recall.state}</span>}
                    <Badge variant="outline" className="text-xs ml-auto">{recall.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <p className="text-xs text-muted-foreground text-center mt-3">
          Source: FDA Enforcement Reports via openFDA. Updated in real-time.
        </p>
      </CardContent>
    </Card>
  );
}
