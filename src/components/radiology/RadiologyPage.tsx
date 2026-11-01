import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Radio, ClipboardList, FileText, BarChart3,
  AlertTriangle, Clock,
} from 'lucide-react';
import { RadiologyOrder, RadiologyStudy, RadiologyReport } from '@/types/dhos';
import { mockRadiologyOrders, mockRadiologyStudies } from '@/data/radiologyMockData';
import { RadiologyWorklist } from './RadiologyWorklist';
import { RadiologyStudyViewer } from './RadiologyStudyViewer';
import { RadiologyReporting } from './RadiologyReporting';
import { RadiologyDashboard } from './RadiologyDashboard';
import { NewRadiologyOrderDialog } from './NewRadiologyOrderDialog';
import { CriticalFindingAlertDialog, CriticalFindingNotification } from './CriticalFindingAlertDialog';
import { CriticalFindingsPanel } from './CriticalFindingsPanel';
import { useRadiologyPersistence } from '@/hooks/useRadiologyPersistence';
import { toast } from 'sonner';

export function RadiologyPage({ canCreateOrder = false, canWriteReport = false }: { canCreateOrder?: boolean; canWriteReport?: boolean }) {
  const [orders, setOrders] = useState<RadiologyOrder[]>(mockRadiologyOrders);
  const [studies, setStudies] = useState<RadiologyStudy[]>(mockRadiologyStudies);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<RadiologyStudy | null>(null);
  const [pendingCriticalReport, setPendingCriticalReport] = useState<RadiologyReport | null>(null);
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);

  const {
    reports, setReports,
    criticalNotifications, setCriticalNotifications,
    saveReport, saveNotification, acknowledgeNotification,
  } = useRadiologyPersistence();

  const scheduled = orders.filter(o => o.status === 'scheduled').length;
  const inProgress = orders.filter(o => o.status === 'in-progress').length;
  const pendingReport = studies.filter(s => s.status === 'completed').length;
  const statOrders = orders.filter(o => o.priority === 'stat' && o.status !== 'reported' && o.status !== 'verified' && o.status !== 'cancelled').length;
  const pendingCriticalCount = criticalNotifications.filter(n => !n.acknowledgedAt).length;

  const handleAddOrder = (order: Omit<RadiologyOrder, 'id' | 'orderedAt' | 'accessionNumber'>) => {
    const newOrder: RadiologyOrder = {
      ...order,
      id: `RAD-${Date.now()}`,
      orderedAt: new Date().toISOString(),
      accessionNumber: `ACC-${Date.now()}`,
    };
    setOrders(prev => [...prev, newOrder]);
  };

  const handleAssignStudy = (orderId: string, radiologist: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, assignedRadiologist: radiologist, status: 'in-progress' } : o));
  };

  const handleCompleteStudy = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const newStudy: RadiologyStudy = {
        id: `STD-${Date.now()}`,
        orderId,
        patientUpid: order.patientUpid,
        patientName: order.patientName,
        modality: order.modality,
        bodyPart: order.bodyPart,
        studyDate: new Date().toISOString(),
        studyInstanceUid: order.studyInstanceUid || `1.2.840.${Date.now()}`,
        accessionNumber: order.accessionNumber,
        seriesCount: Math.floor(Math.random() * 5) + 1,
        imageCount: Math.floor(Math.random() * 200) + 10,
        status: 'completed',
        assignedRadiologist: order.assignedRadiologist,
      };
      setStudies(prev => [...prev, newStudy]);
    }
  };

  const handleSaveReport = (report: Omit<RadiologyReport, 'id' | 'createdAt'>) => {
    const reportId = `RPT-${Date.now()}`;
    const fullReport: RadiologyReport = { ...report, id: reportId, createdAt: new Date().toISOString() };

    const existing = reports.find(r => r.studyId === report.studyId);
    if (existing) {
      fullReport.id = existing.id;
      setReports(prev => prev.map(r => r.studyId === report.studyId ? fullReport : r));
    } else {
      setReports(prev => [...prev, fullReport]);
    }

    // Persist to database
    saveReport(fullReport);

    if (report.status === 'final') {
      setStudies(prev => prev.map(s => s.id === report.studyId ? { ...s, status: 'reported', reportedAt: new Date().toISOString() } : s));
      setOrders(prev => prev.map(o => o.id === report.orderId ? { ...o, status: 'reported' } : o));

      // If critical finding, trigger the notification workflow
      if (report.critical) {
        setPendingCriticalReport(fullReport);
        setShowCriticalAlert(true);
      }
    }
  };

  const handleCriticalNotificationSubmit = (notification: Omit<CriticalFindingNotification, 'id' | 'acknowledgedAt' | 'acknowledgedBy'>) => {
    const newNotification: CriticalFindingNotification = {
      ...notification,
      id: crypto.randomUUID(),
    };
    setCriticalNotifications(prev => [newNotification, ...prev]);
    setShowCriticalAlert(false);
    setPendingCriticalReport(null);

    // Persist to database
    saveNotification(newNotification);

    toast.warning(`Critical finding communicated to ${notification.referringPhysician}`, {
      description: `${notification.patientName} — ${notification.modality} ${notification.bodyPart}`,
      duration: 6000,
    });
  };

  const handleAcknowledge = (id: string) => {
    acknowledgeNotification(id);
    toast.success('Critical finding acknowledged by physician');
  };

  if (selectedStudy) {
    return (
      <RadiologyStudyViewer
        study={selectedStudy}
        report={reports.find(r => r.studyId === selectedStudy.id)}
        canWriteReport={canWriteReport}
        onBack={() => setSelectedStudy(null)}
        onSaveReport={handleSaveReport}
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Radiology (RIS/PACS)</h1>
          <p className="text-muted-foreground">DICOM imaging workflow and structured reporting</p>
        </div>
        {canCreateOrder && (
          <Button onClick={() => setShowNewOrder(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Order
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{scheduled}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Radio className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingReport}</p>
              <p className="text-xs text-muted-foreground">Pending Report</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statOrders}</p>
              <p className="text-xs text-muted-foreground">STAT Orders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="worklist" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="worklist" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> Worklist
          </TabsTrigger>
          <TabsTrigger value="reporting" className="gap-1.5">
            <FileText className="h-4 w-4" /> Reporting
          </TabsTrigger>
          <TabsTrigger value="critical" className="gap-1.5 relative">
            <AlertTriangle className="h-4 w-4" /> Critical Findings
            {pendingCriticalCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                {pendingCriticalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="worklist">
          <RadiologyWorklist
            orders={orders}
            studies={studies}
            onAssign={handleAssignStudy}
            onComplete={handleCompleteStudy}
            onViewStudy={setSelectedStudy}
          />
        </TabsContent>

        <TabsContent value="reporting">
          <RadiologyReporting
            studies={studies}
            reports={reports}
            onViewStudy={setSelectedStudy}
            onSaveReport={handleSaveReport}
          />
        </TabsContent>

        <TabsContent value="critical">
          <CriticalFindingsPanel
            notifications={criticalNotifications}
            onAcknowledge={handleAcknowledge}
          />
        </TabsContent>

        <TabsContent value="dashboard">
          <RadiologyDashboard orders={orders} studies={studies} reports={reports} />
        </TabsContent>
      </Tabs>

      <NewRadiologyOrderDialog
        open={showNewOrder}
        onOpenChange={setShowNewOrder}
        onSubmit={handleAddOrder}
      />

      <CriticalFindingAlertDialog
        open={showCriticalAlert}
        onOpenChange={setShowCriticalAlert}
        report={pendingCriticalReport}
        onSubmit={handleCriticalNotificationSubmit}
      />
    </div>
  );
}
