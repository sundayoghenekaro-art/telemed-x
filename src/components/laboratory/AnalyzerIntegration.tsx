import { useState } from 'react';
import { format, parseISO, formatDistanceToNow, isPast } from 'date-fns';
import { LabAnalyzer, LabSample, AnalyzerStatus } from '@/types/dhos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Cpu,
  Wifi,
  WifiOff,
  Wrench,
  AlertTriangle,
  RotateCcw,
  Play,
  Power,
  MoreVertical,
  Activity,
  Clock,
  Gauge,
  TestTube2,
  Zap,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ProcessingIndicators, ProcessingSample } from './ProcessingIndicators';

interface AnalyzerIntegrationProps {
  analyzers: LabAnalyzer[];
  samples: LabSample[];
  processingSamples: ProcessingSample[];
  onAnalyzerStatusChange: (analyzerId: string, status: AnalyzerStatus) => void;
  onRunSample: (sampleId: string, analyzerId: string) => void;
}

const statusConfig: Record<AnalyzerStatus, { icon: React.ReactNode; color: string; label: string; dotColor: string }> = {
  online: {
    icon: <Wifi className="h-4 w-4" />,
    color: 'bg-success/10 text-success border-success/20',
    label: 'Online',
    dotColor: 'bg-success',
  },
  offline: {
    icon: <WifiOff className="h-4 w-4" />,
    color: 'bg-muted text-muted-foreground border-border',
    label: 'Offline',
    dotColor: 'bg-muted-foreground',
  },
  maintenance: {
    icon: <Wrench className="h-4 w-4" />,
    color: 'bg-warning/10 text-warning border-warning/20',
    label: 'Maintenance',
    dotColor: 'bg-warning',
  },
  error: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    label: 'Error',
    dotColor: 'bg-destructive',
  },
  calibrating: {
    icon: <RotateCcw className="h-4 w-4 animate-spin" />,
    color: 'bg-info/10 text-info border-info/20',
    label: 'Calibrating',
    dotColor: 'bg-info',
  },
};

export function AnalyzerIntegration({
  analyzers,
  samples,
  processingSamples,
  onAnalyzerStatusChange,
  onRunSample,
}: AnalyzerIntegrationProps) {
  const { toast } = useToast();
  const [selectedAnalyzer, setSelectedAnalyzer] = useState<LabAnalyzer | null>(null);

  const onlineCount = analyzers.filter(a => a.status === 'online').length;
  const errorCount = analyzers.filter(a => a.status === 'error').length;
  const totalQueue = analyzers.reduce((sum, a) => sum + a.currentQueue, 0);
  const totalProcessed = analyzers.reduce((sum, a) => sum + a.samplesProcessed, 0);

  // Find samples that can be sent to an analyzer (received or processing status)
  const queueableSamples = samples.filter(
    s => s.status === 'received' || s.status === 'processing'
  );

  const handleRunOnAnalyzer = (sample: LabSample, analyzer: LabAnalyzer) => {
    if (analyzer.status !== 'online') {
      toast({
        title: 'Analyzer Unavailable',
        description: `${analyzer.name} is currently ${analyzer.status}`,
        variant: 'destructive',
      });
      return;
    }
    onRunSample(sample.id, analyzer.id);
    toast({
      title: 'Sample Queued',
      description: `${sample.barcode} sent to ${analyzer.name}`,
    });
  };

  const handleStatusChange = (analyzer: LabAnalyzer, newStatus: AnalyzerStatus) => {
    onAnalyzerStatusChange(analyzer.id, newStatus);
    toast({
      title: 'Analyzer Status Updated',
      description: `${analyzer.name} is now ${newStatus}`,
    });
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Wifi className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineCount}/{analyzers.length}</p>
                <p className="text-xs text-muted-foreground">Instruments Online</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalQueue}</p>
                <p className="text-xs text-muted-foreground">In Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <BarChart3 className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProcessed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Processed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {errorCount > 0 && (
          <Card className="border-destructive/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{errorCount}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {errorCount === 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Analyzer Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyzers.map(analyzer => {
          const config = statusConfig[analyzer.status];
          const calibrationDue = isPast(parseISO(analyzer.nextCalibration));

          return (
            <Card
              key={analyzer.id}
              className={cn(
                'cursor-pointer hover:shadow-md transition-all',
                analyzer.status === 'error' && 'border-destructive/40',
                analyzer.status === 'online' && 'border-success/20'
              )}
              onClick={() => setSelectedAnalyzer(analyzer)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full animate-pulse', config.dotColor)} />
                    <CardTitle className="text-base">{analyzer.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                      {analyzer.status !== 'online' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(analyzer, 'online')}>
                          <Play className="h-4 w-4 mr-2" />
                          Bring Online
                        </DropdownMenuItem>
                      )}
                      {analyzer.status === 'online' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(analyzer, 'maintenance')}>
                          <Wrench className="h-4 w-4 mr-2" />
                          Set Maintenance
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleStatusChange(analyzer, 'calibrating')}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Start Calibration
                      </DropdownMenuItem>
                      {analyzer.status !== 'offline' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(analyzer, 'offline')}>
                          <Power className="h-4 w-4 mr-2" />
                          Take Offline
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground">
                  {analyzer.manufacturer} {analyzer.model}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('gap-1', config.color)}>
                    {config.icon}
                    {config.label}
                  </Badge>
                  {calibrationDue && analyzer.status === 'online' && (
                    <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/20 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      Cal Due
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold">{analyzer.currentQueue}</p>
                    <p className="text-xs text-muted-foreground">Queue</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold">{analyzer.avgProcessingTime}m</p>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold">{analyzer.errorRate}%</p>
                    <p className="text-xs text-muted-foreground">Error</p>
                  </div>
                </div>

                {/* Supported tests */}
                <div className="flex flex-wrap gap-1">
                  {analyzer.supportedTests.map(code => (
                    <Badge key={code} variant="secondary" className="text-xs font-mono">
                      {code}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  {analyzer.location} · {analyzer.samplesProcessed.toLocaleString()} processed
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Processing Indicators */}
      <ProcessingIndicators processingSamples={processingSamples} />

      {/* Queueable Samples Section */}
      {queueableSamples.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Samples Ready for Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[250px]">
              <div className="space-y-2">
                {queueableSamples.map(sample => {
                  const compatibleAnalyzers = analyzers.filter(
                    a => a.status === 'online'
                  );
                  return (
                    <div
                      key={sample.id}
                      className="flex items-center justify-between border border-border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <TestTube2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{sample.patientName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{sample.barcode}</p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{sample.sampleType}</Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Cpu className="h-3.5 w-3.5" />
                            Send to Analyzer
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {compatibleAnalyzers.length === 0 ? (
                            <DropdownMenuItem disabled>
                              <XCircle className="h-4 w-4 mr-2" />
                              No analyzers online
                            </DropdownMenuItem>
                          ) : (
                            compatibleAnalyzers.map(analyzer => (
                              <DropdownMenuItem
                                key={analyzer.id}
                                onClick={() => handleRunOnAnalyzer(sample, analyzer)}
                              >
                                <Cpu className="h-4 w-4 mr-2" />
                                {analyzer.name}
                                <span className="ml-auto text-xs text-muted-foreground">
                                  Q:{analyzer.currentQueue}
                                </span>
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Analyzer Detail Dialog */}
      <Dialog open={!!selectedAnalyzer} onOpenChange={() => setSelectedAnalyzer(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              {selectedAnalyzer?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedAnalyzer?.manufacturer} {selectedAnalyzer?.model}
            </DialogDescription>
          </DialogHeader>

          {selectedAnalyzer && (
            <div className="space-y-4">
              {/* Status & Location */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant="outline" className={cn('gap-1 mt-1', statusConfig[selectedAnalyzer.status].color)}>
                    {statusConfig[selectedAnalyzer.status].icon}
                    {statusConfig[selectedAnalyzer.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Location</p>
                  <p className="font-medium mt-1">{selectedAnalyzer.location}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Serial Number</p>
                  <p className="font-mono text-xs mt-1">{selectedAnalyzer.serialNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Current Queue</p>
                  <p className="font-medium mt-1">{selectedAnalyzer.currentQueue} samples</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Samples Processed</p>
                    <p className="text-xl font-bold">{selectedAnalyzer.samplesProcessed.toLocaleString()}</p>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Avg Processing Time</p>
                    <p className="text-xl font-bold">{selectedAnalyzer.avgProcessingTime} min</p>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Error Rate</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold">{selectedAnalyzer.errorRate}%</p>
                      <Progress value={100 - selectedAnalyzer.errorRate} className="flex-1 h-2" />
                    </div>
                  </div>
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Supported Tests</p>
                    <p className="text-xl font-bold">{selectedAnalyzer.supportedTests.length}</p>
                  </div>
                </div>
              </div>

              {/* Calibration */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Calibration
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Last Calibration</p>
                    <p>{formatDistanceToNow(parseISO(selectedAnalyzer.lastCalibration), { addSuffix: true })}</p>
                  </div>
                  <div className={cn(
                    "border rounded-lg p-3",
                    isPast(parseISO(selectedAnalyzer.nextCalibration))
                      ? "border-warning/40 bg-warning/5"
                      : "border-border"
                  )}>
                    <p className="text-xs text-muted-foreground">Next Calibration</p>
                    <p>{format(parseISO(selectedAnalyzer.nextCalibration), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
              </div>

              {/* Supported Tests */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Supported Tests</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedAnalyzer.supportedTests.map(code => (
                    <Badge key={code} variant="secondary" className="font-mono">{code}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
