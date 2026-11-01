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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
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
                <p className="text-2xl font-bold">{stats.inProgressOrders}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.statOrders}</p>
                <p className="text-xs text-muted-foreground">STAT</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Barcode className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.samplesInLab}</p>
                <p className="text-xs text-muted-foreground">In Lab</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <FileCheck className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingValidation}</p>
                <p className="text-xs text-muted-foreground">Validation</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.analyzersOnline}/{analyzers.length}</p>
                <p className="text-xs text-muted-foreground">Analyzers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.analyzerErrors > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.analyzerErrors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
