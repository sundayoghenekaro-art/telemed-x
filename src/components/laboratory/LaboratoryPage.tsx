import { useState, useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { LabOrder, LabSample, LabResult, SampleStatus, Patient, LabAnalyzer, AnalyzerStatus } from '@/types/dhos';
import { OrdersQueue } from './OrdersQueue';
import { SampleTracking } from './SampleTracking';
import { ResultsValidation } from './ResultsValidation';
import { AnalyzerIntegration } from './AnalyzerIntegration';
import { TATMonitor } from './TATMonitor';
import { LabDashboard } from './LabDashboard';
import { CriticalValuesBoard } from '@/components/clinical/CriticalValuesBoard';
import { NewLabOrderDialog } from './NewLabOrderDialog';
import { ProcessingSample } from './ProcessingIndicators';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  TestTube2, 
  Barcode, 
  FileCheck, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Activity,
  Cpu,
  Timer,
  BarChart3,
  Siren,
} from 'lucide-react';
import { labTestCatalog, patientNames } from '@/data/labMockData';

interface LaboratoryPageProps {
  orders: LabOrder[];
  samples: LabSample[];
  patients: Patient[];
  analyzers: LabAnalyzer[];
  pendingResults: Array<{ sample: LabSample; order: LabOrder; results: LabResult[] }>;
  processingSamples: ProcessingSample[];
  canCreateOrder?: boolean;
  canValidateResults?: boolean;
  canEscalateCritical?: boolean;
  onAddOrder: (order: Omit<LabOrder, 'id' | 'orderedAt'>) => void;
  onUpdateOrderStatus: (orderId: string, status: LabOrder['status']) => void;
  onUpdateSampleStatus: (sampleId: string, status: SampleStatus) => void;
  onValidateResults: (sampleId: string, approved: boolean, comments?: string) => void;
  onAnalyzerStatusChange: (analyzerId: string, status: AnalyzerStatus) => void;
  onRunSample: (sampleId: string, analyzerId: string) => void;
}

export function LaboratoryPage({
  orders,
  samples,
  patients,
  analyzers,
  pendingResults,
  processingSamples,
  canCreateOrder = false,
  canValidateResults = false,
  canEscalateCritical = false,
  onAddOrder,
  onUpdateOrderStatus,
  onUpdateSampleStatus,
  onValidateResults,
  onAnalyzerStatusChange,
  onRunSample,
}: LaboratoryPageProps) {
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Stats
  const stats = useMemo(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const inProgressOrders = orders.filter(o => o.status === 'in-progress').length;
    const statOrders = orders.filter(o => o.priority === 'stat' && o.status !== 'completed').length;
    const samplesInLab = samples.filter(s => 
      ['received', 'processing', 'analyzed'].includes(s.status)
    ).length;
    const pendingValidation = pendingResults.length;
    const completedToday = orders.filter(o => 
      o.status === 'completed' && 
      o.completedAt && 
      isSameDay(new Date(o.completedAt), new Date())
    ).length;
    const analyzersOnline = analyzers.filter(a => a.status === 'online').length;
    const analyzerErrors = analyzers.filter(a => a.status === 'error').length;

    return { pendingOrders, inProgressOrders, statOrders, samplesInLab, pendingValidation, completedToday, analyzersOnline, analyzerErrors };
  }, [orders, samples, analyzers]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laboratory (LIS)</h1>
          <p className="text-muted-foreground">
            Sample tracking, test ordering, analyzer integration, and results management
          </p>
        </div>
        {canCreateOrder && (
          <Button onClick={() => setIsNewOrderOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Lab Order
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 min-[1800px]:grid-cols-8">
        {[
          { label: 'Pending', value: stats.pendingOrders, icon: Clock, iconClass: 'bg-muted text-muted-foreground' },
          { label: 'Processing', value: stats.inProgressOrders, icon: Activity, iconClass: 'bg-primary/10 text-primary' },
          { label: 'STAT', value: stats.statOrders, icon: AlertTriangle, iconClass: 'bg-destructive/10 text-destructive' },
          { label: 'In Lab', value: stats.samplesInLab, icon: Barcode, iconClass: 'bg-info/10 text-info' },
          { label: 'Validation', value: stats.pendingValidation, icon: FileCheck, iconClass: 'bg-warning/10 text-warning' },
          { label: 'Completed', value: stats.completedToday, icon: CheckCircle2, iconClass: 'bg-success/10 text-success' },
          { label: 'Analyzers', value: `${stats.analyzersOnline}/${analyzers.length}`, icon: Cpu, iconClass: 'bg-primary/10 text-primary' },
          { label: 'Errors', value: stats.analyzerErrors, icon: AlertTriangle, iconClass: 'bg-destructive/10 text-destructive' },
        ].map(({ label, value, icon: Icon, iconClass }) => (
          <Card key={label} className={label === 'Errors' && stats.analyzerErrors > 0 ? 'border-destructive/30' : undefined}>
            <CardContent className="p-3.5">
              <div className="flex items-center gap-3">
                <div className={`shrink-0 rounded-lg p-2 ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
                  <p className="mt-1.5 whitespace-nowrap text-[11px] leading-none text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <TestTube2 className="h-4 w-4" />
            Orders Queue
          </TabsTrigger>
          <TabsTrigger value="samples" className="gap-2">
            <Barcode className="h-4 w-4" />
            Sample Tracking
          </TabsTrigger>
          <TabsTrigger value="analyzers" className="gap-2">
            <Cpu className="h-4 w-4" />
            Analyzers
            {stats.analyzerErrors > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                {stats.analyzerErrors}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Validation
            {stats.pendingValidation > 0 && (
              <span className="ml-1 bg-warning text-warning-foreground text-xs px-1.5 py-0.5 rounded-full">
                {stats.pendingValidation}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tat" className="gap-2">
            <Timer className="h-4 w-4" />
            TAT Monitor
          </TabsTrigger>
          <TabsTrigger value="critical" className="gap-2">
            <Siren className="h-4 w-4" />
            Critical Values
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <LabDashboard
            orders={orders}
            samples={samples}
            analyzers={analyzers}
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <OrdersQueue
            orders={orders}
            testCatalog={labTestCatalog}
            patientNames={patientNames}
            onUpdateStatus={onUpdateOrderStatus}
          />
        </TabsContent>

        <TabsContent value="samples" className="mt-6">
          <SampleTracking
            samples={samples}
            onUpdateStatus={onUpdateSampleStatus}
          />
        </TabsContent>

        <TabsContent value="analyzers" className="mt-6">
          <AnalyzerIntegration
            analyzers={analyzers}
            samples={samples}
            processingSamples={processingSamples}
            onAnalyzerStatusChange={onAnalyzerStatusChange}
            onRunSample={onRunSample}
          />
        </TabsContent>

        <TabsContent value="validation" className="mt-6">
          <ResultsValidation
            pendingResults={pendingResults}
            canValidate={canValidateResults}
            onValidate={onValidateResults}
          />
        </TabsContent>

        <TabsContent value="tat" className="mt-6">
          <TATMonitor
            samples={samples}
            orders={orders}
            testCatalog={labTestCatalog}
          />
        </TabsContent>
        <TabsContent value="critical" className="mt-6">
          <CriticalValuesBoard mode="notify" canAct={canEscalateCritical} />
        </TabsContent>
      </Tabs>

      {/* New Order Dialog */}
      <NewLabOrderDialog
        open={isNewOrderOpen}
        onOpenChange={setIsNewOrderOpen}
        patients={patients}
        testCatalog={labTestCatalog}
        onCreateOrder={onAddOrder}
      />
    </div>
  );
}
