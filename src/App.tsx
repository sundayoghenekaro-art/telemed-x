import { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useStaffMessaging } from '@/hooks/useStaffMessaging';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useReadReceipts } from '@/hooks/useReadReceipts';

import { LoginScreen } from '@/components/auth/LoginScreen';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/settings/UserManagement';
import { CompliancePanel } from '@/components/settings/CompliancePanel';
import { AccessIdentityPanel } from '@/components/settings/AccessIdentityPanel';
import { GovernanceRegistersPanel } from '@/components/settings/GovernanceRegistersPanel';
import { STAFF_ROLE_PRIORITY, canAccessRoute, canPerformAction, canSeeWidget, getDepartmentScope, scopeByDepartment } from '@/lib/access';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteFallback } from '@/components/RouteFallback';

const Dashboard = lazy(() => import('@/components/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const PatientIndex = lazy(() => import('@/components/patients/PatientIndex').then((m) => ({ default: m.PatientIndex })));
const PatientDetail = lazy(() => import('@/components/patients/PatientDetail').then((m) => ({ default: m.PatientDetail })));
const AppointmentsPage = lazy(() => import('@/components/appointments/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
const LaboratoryPage = lazy(() => import('@/components/laboratory/LaboratoryPage').then((m) => ({ default: m.LaboratoryPage })));
const PharmacyPage = lazy(() => import('@/components/pharmacy/PharmacyPage').then((m) => ({ default: m.PharmacyPage })));
const ClinicalPage = lazy(() => import('@/components/clinical/ClinicalPage').then((m) => ({ default: m.ClinicalPage })));
const InpatientManagementPage = lazy(() => import('@/components/inpatient/InpatientManagementPage').then((m) => ({ default: m.InpatientManagementPage })));
const RadiologyPage = lazy(() => import('@/components/radiology/RadiologyPage').then((m) => ({ default: m.RadiologyPage })));
const BillingPage = lazy(() => import('@/components/billing/BillingPage').then((m) => ({ default: m.BillingPage })));
const OperationsCockpit = lazy(() => import('@/pages/OperationsCockpit').then((m) => ({ default: m.OperationsCockpit })));
const MessagesPage = lazy(() => import('@/components/messaging/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const ChatPanel = lazy(() => import('@/components/messaging/ChatPanel').then((m) => ({ default: m.ChatPanel })));
const TelemedicinePage = lazy(() => import('@/components/telemedicine/TelemedicinePage').then((m) => ({ default: m.TelemedicinePage })));
const RemotePatientMonitoring = lazy(() => import('@/components/clinical/RemotePatientMonitoring').then((m) => ({ default: m.RemotePatientMonitoring })));
const ProviderCredentialsPage = lazy(() => import('@/components/clinical/ProviderCredentialsPage').then((m) => ({ default: m.ProviderCredentialsPage })));
const ExternalDoctorAuth = lazy(() => import('@/pages/ExternalDoctorAuth').then((m) => ({ default: m.ExternalDoctorAuth })));
const PatientPortal = lazy(() => import('@/pages/PatientPortal').then((m) => ({ default: m.PatientPortal })));
const TelemedXLanding = lazy(() => import('@/pages/TelemedXLanding').then((m) => ({ default: m.TelemedXLanding })));
const AmbulanceConsole = lazy(() => import('@/pages/AmbulanceConsole').then((m) => ({ default: m.AmbulanceConsole })));
const HospitalOnboardingPage = lazy(() => import('@/components/hospitals/HospitalOnboardingPage').then((m) => ({ default: m.HospitalOnboardingPage })));
const HospitalDirectoryPage = lazy(() => import('@/components/hospitals/HospitalDirectoryPage').then((m) => ({ default: m.HospitalDirectoryPage })));
const SuperAdminHospitalsPage = lazy(() => import('@/components/hospitals/SuperAdminHospitalsPage').then((m) => ({ default: m.SuperAdminHospitalsPage })));
const VendorOnboardingPage = lazy(() => import('@/components/vendors/VendorOnboardingPage').then((m) => ({ default: m.VendorOnboardingPage })));
const VendorDirectoryPage = lazy(() => import('@/components/vendors/VendorDirectoryPage').then((m) => ({ default: m.VendorDirectoryPage })));
const SuperAdminVendorsPage = lazy(() => import('@/components/vendors/SuperAdminVendorsPage').then((m) => ({ default: m.SuperAdminVendorsPage })));
const VendorAdminPortal = lazy(() => import('@/components/vendors/VendorAdminPortal').then((m) => ({ default: m.VendorAdminPortal })));
const DefenseHealthPage = lazy(() => import('@/pages/DefenseHealthPage').then((m) => ({ default: m.DefenseHealthPage })));
const DefenceLearningHub = lazy(() => import('@/components/defence/learning/DefenceLearningHub').then((m) => ({ default: m.DefenceLearningHub })));
const DefenseSuperAdminPage = lazy(() => import('@/pages/DefenseSuperAdminPage').then((m) => ({ default: m.DefenseSuperAdminPage })));
import { User, Patient, UserRole, Appointment, LabOrder, LabSample, LabResult, SampleStatus, LabAnalyzer, AnalyzerStatus, Prescription, PrescriptionStatus } from '@/types/dhos';
import {
  mockCurrentUser,
  mockPatients,
  mockAppointments as initialAppointments,
  mockDashboardStats,
  mockBedOccupancy,
  mockNotifications,
  mockVitalSigns
} from '@/data/mockData';
import {
  mockLabOrders as initialLabOrders,
  mockLabSamples as initialLabSamples,
  mockAnalyzers as initialLabAnalyzers,
  mockPendingResults as initialPendingResults,
} from '@/data/labMockData';
import { generateResultsForTests } from '@/lib/labResultsGenerator';
import {
  mockPrescriptions as initialPrescriptions,
  mockInventory,
} from '@/data/pharmacyMockData';
import { mockInvoices, mockPayments } from '@/data/billingMockData';
import {
  mockRadiologyOrders,
  mockRadiologyReports,
  mockRadiologyStudies,
} from '@/data/radiologyMockData';

const queryClient = new QueryClient();

function SettingsPage({ canManage }: { canManage: boolean }) {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">System configuration, access control and data governance</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users &amp; access</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="identity">Access &amp; identity</TabsTrigger>
          <TabsTrigger value="governance">Governance registers</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4">
          <UserManagement />
        </TabsContent>
        <TabsContent value="compliance" className="mt-4">
          <CompliancePanel canManage={canManage} />
        </TabsContent>
        <TabsContent value="identity" className="mt-4">
          <AccessIdentityPanel canManage={canManage} />
        </TabsContent>
        <TabsContent value="governance" className="mt-4">
          <GovernanceRegistersPanel canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [labOrders, setLabOrders] = useState<LabOrder[]>(initialLabOrders);
  const [labSamples, setLabSamples] = useState<LabSample[]>(initialLabSamples);
  const [labAnalyzers, setLabAnalyzers] = useState<LabAnalyzer[]>(initialLabAnalyzers);
  const [pendingResults, setPendingResults] = useState<Array<{
    sample: LabSample;
    order: LabOrder;
    results: LabResult[];
  }>>(initialPendingResults);
  const simulationTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [processingSamples, setProcessingSamples] = useState<Array<{
    sampleId: string;
    analyzerId: string;
    analyzerName: string;
    patientName: string;
    barcode: string;
    startTime: number;
    duration: number;
  }>>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(initialPrescriptions);

  const departmentScope = getDepartmentScope(currentUser);
  const scopedAppointments = useMemo(
    () => scopeByDepartment(appointments, departmentScope),
    [appointments, departmentScope],
  );
  const scopedPatients = useMemo(() => {
    if (!departmentScope) return mockPatients;
    const upids = new Set(scopedAppointments.map((appointment) => appointment.patientUpid));
    return mockPatients.filter((patient) => upids.has(patient.upid));
  }, [scopedAppointments, departmentScope]);
  const scopedPatientUpids = useMemo(
    () => new Set(scopedPatients.map((patient) => patient.upid)),
    [scopedPatients],
  );
  const scopedLabOrders = useMemo(
    () => (departmentScope ? labOrders.filter((order) => scopedPatientUpids.has(order.patientUpid)) : labOrders),
    [labOrders, departmentScope, scopedPatientUpids],
  );
  const scopedLabSamples = useMemo(
    () => (departmentScope ? labSamples.filter((sample) => scopedPatientUpids.has(sample.patientUpid)) : labSamples),
    [labSamples, departmentScope, scopedPatientUpids],
  );
  const scopedPrescriptions = useMemo(
    () => (departmentScope ? prescriptions.filter((rx) => scopedPatientUpids.has(rx.patientUpid)) : prescriptions),
    [prescriptions, departmentScope, scopedPatientUpids],
  );

  // Pharmacists work from prescriptions, not the hospital directory: they only
  // receive the patients named on an authorized prescription.
  const pharmacyPatients = useMemo(() => {
    if (canAccessRoute(currentUser?.role, '/patients')) return scopedPatients;
    const upids = new Set(scopedPrescriptions.map((rx) => rx.patientUpid));
    return mockPatients.filter((patient) => upids.has(patient.upid));
  }, [currentUser?.role, scopedPatients, scopedPrescriptions]);

  const messaging = useStaffMessaging(currentUser?.id, currentUser?.role);
  const typing = useTypingIndicator(messaging.activeChannelId, currentUser?.id, currentUser?.name);
  const readReceipts = useReadReceipts(messaging.activeChannelId, currentUser?.id);

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedPatient(null);
  };

  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message === 'Email not confirmed') {
        toast.info('Please check your email to confirm your account before signing in.');
      }
      console.error('Login error:', error);
      throw error;
    }

    if (!data.user) throw new Error('Sign in failed');

    // Role comes from user_roles, never from the client
    const { data: roleRows, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id);

    if (roleError) {
      await supabase.auth.signOut();
      toast.error('Could not verify your access. Please try again.');
      throw roleError;
    }

    const assigned = (roleRows ?? []).map((row) => row.role as UserRole);
    const role = STAFF_ROLE_PRIORITY.find((candidate) => assigned.includes(candidate));

    if (!role) {
      await supabase.auth.signOut();
      toast.error('This account has no staff role assigned. Contact an administrator.');
      throw new Error('No staff role assigned');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, department')
      .eq('user_id', data.user.id)
      .maybeSingle();

    setCurrentUser({
      id: data.user.id,
      name: profile?.full_name || email.split('@')[0],
      email,
      role,
      department: profile?.department ?? undefined,
    });

    toast.success('Signed in successfully');
  };

  const handleDemoLogin = (role: UserRole) => {
    const demoUser = { ...mockCurrentUser, role };
    setCurrentUser(demoUser);
    toast.success(`Demo mode: Logged in as ${role}`);
  };

  const handleAppointmentUpdate = useCallback((updatedAppointment: Appointment) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === updatedAppointment.id ? updatedAppointment : apt))
    );
  }, []);

  const handleNewAppointment = useCallback((newAppointment: Appointment) => {
    setAppointments((prev) => [...prev, newAppointment]);
  }, []);

  const handleDeleteAppointment = useCallback((appointmentId: string) => {
    setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
  }, []);

  const handleNewLabOrder = useCallback((newOrder: LabOrder) => {
    setLabOrders((prev) => [...prev, newOrder]);

    const newSample: LabSample = {
      id: `S-${Date.now()}`,
      orderId: newOrder.id,
      patientUpid: newOrder.patientUpid,
      patientName: mockPatients.find((p) => p.upid === newOrder.patientUpid)?.firstName + ' ' +
        mockPatients.find((p) => p.upid === newOrder.patientUpid)?.lastName || 'Unknown',
      sampleType: 'blood',
      collectedAt: new Date().toISOString(),
      collectedBy: currentUser?.name || 'Lab Tech',
      status: 'collected',
      location: 'Collection Point',
      barcode: `BAR${Date.now()}`,
    };
    setLabSamples((prev) => [...prev, newSample]);
  }, [currentUser]);

  const handleSampleStatusChange = useCallback((sampleId: string, newStatus: SampleStatus) => {
    setLabSamples((prev) =>
      prev.map((sample) =>
        sample.id === sampleId
          ? {
              ...sample,
              status: newStatus,
              receivedAt: newStatus === 'received' && !sample.receivedAt ? new Date().toISOString() : sample.receivedAt,
              processedAt: newStatus === 'processing' && !sample.processedAt ? new Date().toISOString() : sample.processedAt,
              analyzedAt: newStatus === 'analyzed' && !sample.analyzedAt ? new Date().toISOString() : sample.analyzedAt,
              validatedAt: newStatus === 'validated' && !sample.validatedAt ? new Date().toISOString() : sample.validatedAt,
              validatedBy: newStatus === 'validated' && !sample.validatedBy ? currentUser?.name : sample.validatedBy,
            }
          : sample
      )
    );

    if (newStatus === 'analyzed') {
      const sample = labSamples.find((s) => s.id === sampleId);
      const order = labOrders.find((o) => o.id === sample?.orderId);
      if (sample && order) {
        const results = generateResultsForTests(order.tests);
        setPendingResults((prev) => [...prev, { sample, order, results }]);
      }
    }

    if (newStatus === 'reported') {
      const sample = labSamples.find((s) => s.id === sampleId);
      if (sample) {
        setLabOrders((prev) =>
          prev.map((order) =>
            order.id === sample.orderId
              ? { ...order, status: 'completed', completedAt: new Date().toISOString() }
              : order
          )
        );
        setPendingResults((prev) => prev.filter((pr) => pr.sample.id !== sampleId));
      }
    }
  }, [labSamples, labOrders, currentUser]);

  const handleProcessOnAnalyzer = useCallback((sampleId: string, analyzerId: string) => {
    const sample = labSamples.find((s) => s.id === sampleId);
    const analyzer = labAnalyzers.find((a) => a.id === analyzerId);

    if (!sample || !analyzer) return;

    handleSampleStatusChange(sampleId, 'processing');

    const duration = analyzer.avgProcessingTime;
    const processingInfo = {
      sampleId,
      analyzerId,
      analyzerName: analyzer.name,
      patientName: sample.patientName,
      barcode: sample.barcode,
      startTime: Date.now(),
      duration: duration * 60 * 1000,
    };

    setProcessingSamples((prev) => [...prev, processingInfo]);
    setLabAnalyzers((prev) =>
      prev.map((a) =>
        a.id === analyzerId
          ? { ...a, currentQueue: a.currentQueue + 1, samplesProcessed: a.samplesProcessed + 1 }
          : a
      )
    );

    const timer = setTimeout(() => {
      handleSampleStatusChange(sampleId, 'analyzed');
      setProcessingSamples((prev) => prev.filter((p) => p.sampleId !== sampleId));
      setLabAnalyzers((prev) =>
        prev.map((a) =>
          a.id === analyzerId
            ? { ...a, currentQueue: Math.max(0, a.currentQueue - 1) }
            : a
        )
      );
      simulationTimers.current.delete(sampleId);
    }, duration * 60 * 1000);

    simulationTimers.current.set(sampleId, timer);
  }, [labSamples, labAnalyzers, handleSampleStatusChange]);

  const handleValidateResults = useCallback((sampleId: string, approved: boolean, _comments?: string) => {
    if (!approved) return;
    const resultEntry = pendingResults.find((pr) => pr.sample.id === sampleId);
    if (!resultEntry) return;

    setLabOrders((prev) =>
      prev.map((order) =>
        order.id === resultEntry.order.id
          ? { ...order, results: resultEntry.results, completedAt: new Date().toISOString(), status: 'completed' }
          : order
      )
    );

    handleSampleStatusChange(sampleId, 'reported');
  }, [pendingResults, handleSampleStatusChange]);

  const handleNewPrescription = useCallback((prescription: Prescription) => {
    setPrescriptions((prev) => [...prev, prescription]);
  }, []);

  const handleUpdatePrescriptionStatus = useCallback((prescriptionId: string, status: PrescriptionStatus) => {
    setPrescriptions((prev) =>
      prev.map((presc) =>
        presc.id === prescriptionId
          ? {
              ...presc,
              status,
              verifiedBy: status === 'verified' ? currentUser?.name : presc.verifiedBy,
              verifiedAt: status === 'verified' ? new Date().toISOString() : presc.verifiedAt,
              dispensedBy: status === 'dispensed' ? currentUser?.name : presc.dispensedBy,
              dispensedAt: status === 'dispensed' ? new Date().toISOString() : presc.dispensedAt,
            }
          : presc
      )
    );
  }, [currentUser]);

  const handleDispensePrescription = useCallback((prescriptionId: string, itemIndex: number, quantity: number) => {
    setPrescriptions((prev) =>
      prev.map((presc) => {
        if (presc.id !== prescriptionId) return presc;

        const updatedItems = [...presc.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          dispensedQuantity: (updatedItems[itemIndex].dispensedQuantity || 0) + quantity,
        };

        const allDispensed = updatedItems.every(
          (item) => (item.dispensedQuantity || 0) >= item.quantity
        );
        const someDispensed = updatedItems.some(
          (item) => (item.dispensedQuantity || 0) > 0
        );

        return {
          ...presc,
          items: updatedItems,
          status: allDispensed ? 'dispensed' : someDispensed ? 'partially-dispensed' : presc.status,
          dispensedBy: currentUser?.name,
          dispensedAt: new Date().toISOString(),
        };
      })
    );
  }, [currentUser]);

  useEffect(() => {
    return () => {
      simulationTimers.current.forEach((timer) => clearTimeout(timer));
      simulationTimers.current.clear();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <AppRoutes
                currentUser={currentUser}
                onLogin={handleLogin}
                onDemoLogin={handleDemoLogin}
                onLogout={handleLogout}
                appointments={appointments}
                scopedAppointments={scopedAppointments}
                scopedPatients={scopedPatients}
                departmentScope={departmentScope}
                labOrders={labOrders}
                scopedLabOrders={scopedLabOrders}
                scopedLabSamples={scopedLabSamples}
                scopedPrescriptions={scopedPrescriptions}
                pharmacyPatients={pharmacyPatients}
                labSamples={labSamples}
                labAnalyzers={labAnalyzers}
                pendingResults={pendingResults}
                processingSamples={processingSamples}
                prescriptions={prescriptions}
                messaging={messaging}
                typing={typing}
                readReceipts={readReceipts}
                handleNewAppointment={handleNewAppointment}
                handleAppointmentUpdate={handleAppointmentUpdate}
                handleNewLabOrder={handleNewLabOrder}
                setLabOrders={setLabOrders}
                handleSampleStatusChange={handleSampleStatusChange}
                handleValidateResults={handleValidateResults}
                setLabAnalyzers={setLabAnalyzers}
                handleProcessOnAnalyzer={handleProcessOnAnalyzer}
                handleNewPrescription={handleNewPrescription}
                handleUpdatePrescriptionStatus={handleUpdatePrescriptionStatus}
                setSelectedPatient={setSelectedPatient}
                selectedPatient={selectedPatient}
              />
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Separate component so we can use useLocation inside BrowserRouter
function AppRoutes({
  currentUser, onLogin, onDemoLogin, onLogout,
  appointments, scopedAppointments, scopedPatients, departmentScope,
  labOrders, scopedLabOrders, scopedLabSamples, scopedPrescriptions,
  pharmacyPatients,
  labSamples, labAnalyzers, pendingResults, processingSamples,
  prescriptions, messaging, typing, readReceipts,
  handleNewAppointment, handleAppointmentUpdate, handleNewLabOrder,
  setLabOrders, handleSampleStatusChange, handleValidateResults, setLabAnalyzers,
  handleProcessOnAnalyzer, handleNewPrescription, handleUpdatePrescriptionStatus,
  setSelectedPatient, selectedPatient,
}: any) {
  return (
    <Routes>
      {/* Telemed-X standalone portals */}
      <Route path="/telemed-x" element={<TelemedXLanding />} />
      <Route path="/telemed-x/doctor" element={<ExternalDoctorAuth onApprovedLogin={() => {}} />} />
      <Route path="/telemed-x/patient" element={<PatientPortal />} />
      <Route path="/telemed-x/ambulance" element={<AmbulanceConsole />} />
      <Route path="/telemed-x/hospitals" element={<HospitalDirectoryPage />} />
      <Route path="/telemed-x/hospital-onboarding" element={<HospitalOnboardingPage />} />
      <Route path="/telemed-x/vendors" element={<VendorDirectoryPage />} />
      <Route path="/telemed-x/vendor-onboarding" element={<VendorOnboardingPage />} />
      <Route path="/telemed-x/vendor-portal" element={<VendorAdminPortal />} />
      <Route path="/defense-health" element={<DefenseHealthPage />} />
      <Route path="/defense-health/learning" element={<DefenceLearningHub />} />
      <Route path="/defense-health/super-admin" element={<DefenseSuperAdminPage />} />

      {/* Legacy routes — redirect to new Telemed-X paths */}
      <Route path="/telemedicine/doctor-login" element={<ExternalDoctorAuth onApprovedLogin={() => {}} />} />
      <Route path="/telemedicine/patient" element={<PatientPortal />} />

      {/* Hospital staff routes */}
      <Route path="*" element={
        !currentUser ? (
          <LoginScreen onLogin={onLogin} onDemoLogin={import.meta.env.DEV ? onDemoLogin : undefined} />
        ) : (
          <AppLayout user={currentUser} onLogout={onLogout} notifications={mockNotifications}>
            <ProtectedRoute currentRole={currentUser.role}>
            <Routes>
              <Route path="/dashboard" element={
                <Dashboard
                  role={currentUser.role}
                  stats={mockDashboardStats}
                  bedOccupancy={canSeeWidget(currentUser.role, 'widget:bed_occupancy') ? mockBedOccupancy : []}
                  appointments={canSeeWidget(currentUser.role, 'widget:today_appointments') ? scopedAppointments : []}
                  criticalPatients={canSeeWidget(currentUser.role, 'widget:critical_patients') ? scopedPatients.filter((p: any) => p.status === 'critical') : []}
                  notifications={canSeeWidget(currentUser.role, 'widget:alerts') ? mockNotifications : []}
                  departmentScope={departmentScope}
                  prescriptions={canAccessRoute(currentUser.role, '/pharmacy') ? scopedPrescriptions : []}
                  inventory={canAccessRoute(currentUser.role, '/pharmacy') ? mockInventory : []}
                  labOrders={canAccessRoute(currentUser.role, '/laboratory') ? scopedLabOrders : []}
                  labSamples={canAccessRoute(currentUser.role, '/laboratory') ? scopedLabSamples : []}
                  labAnalyzers={canAccessRoute(currentUser.role, '/laboratory') ? labAnalyzers : []}
                  pendingResults={canAccessRoute(currentUser.role, '/laboratory') ? pendingResults : []}
                  processingSamples={canAccessRoute(currentUser.role, '/laboratory') ? processingSamples : []}
                  radiologyOrders={canAccessRoute(currentUser.role, '/radiology') ? mockRadiologyOrders : []}
                  radiologyStudies={canAccessRoute(currentUser.role, '/radiology') ? mockRadiologyStudies : []}
                  radiologyReports={canAccessRoute(currentUser.role, '/radiology') ? mockRadiologyReports : []}
                  invoices={canAccessRoute(currentUser.role, '/billing') ? mockInvoices : []}
                  payments={canAccessRoute(currentUser.role, '/billing') ? mockPayments : []}
                />
              } />
              <Route path="/patients" element={
                <PatientIndex
                  patients={scopedPatients}
                  onSelectPatient={setSelectedPatient}
                  canRegister={canPerformAction(currentUser.role, 'action:register_patient')}
                />
              } />
              <Route path="/patients/:upid" element={
                selectedPatient
                  ? <PatientDetail patient={selectedPatient} vitals={mockVitalSigns} onBack={() => setSelectedPatient(null)} />
                  : <Navigate to="/patients" replace />
              } />
              <Route path="/appointments" element={
                <AppointmentsPage
                  appointments={scopedAppointments}
                  patients={scopedPatients}
                  departmentScope={departmentScope}
                  canCreate={canPerformAction(currentUser.role, 'action:book_appointment')}
                  canManageQueue={canPerformAction(currentUser.role, 'action:manage_queue')}
                  onAddAppointment={(apt: any) => handleNewAppointment({ ...apt, id: `APT-${Date.now()}` })}
                  onUpdateStatus={(id: string, status: any) => handleAppointmentUpdate({ ...appointments.find((a: any) => a.id === id)!, status })}
                  onUpdateSeries={() => {}}
                  onCancelSeries={() => {}}
                />
              } />
              <Route path="/laboratory" element={
                <LaboratoryPage
                  orders={scopedLabOrders}
                  samples={scopedLabSamples}
                  patients={scopedPatients}
                  analyzers={labAnalyzers}
                  pendingResults={pendingResults}
                  processingSamples={processingSamples}
                  canCreateOrder={canPerformAction(currentUser.role, 'action:order_lab_test')}
                  canValidateResults={canPerformAction(currentUser.role, 'action:validate_lab_result')}
                  canEscalateCritical={canPerformAction(currentUser.role, 'action:acknowledge_critical_value')}
                  onAddOrder={(order: any) => handleNewLabOrder({ ...order, id: `LAB-${Date.now()}`, orderedAt: new Date().toISOString() })}
                  onUpdateOrderStatus={(orderId: string, status: any) => setLabOrders((prev: any) => prev.map((o: any) => o.id === orderId ? { ...o, status } : o))}
                  onUpdateSampleStatus={handleSampleStatusChange}
                  onValidateResults={handleValidateResults}
                  onAnalyzerStatusChange={(analyzerId: string, status: any) => setLabAnalyzers((prev: any) => prev.map((a: any) => a.id === analyzerId ? { ...a, status } : a))}
                  onRunSample={handleProcessOnAnalyzer}
                />
              } />
              <Route path="/pharmacy" element={
                <PharmacyPage
                  prescriptions={scopedPrescriptions}
                  inventory={mockInventory}
                  patients={pharmacyPatients}
                  canCreatePrescription={canPerformAction(currentUser.role, 'action:prescribe_medication')}
                  canVerify={canPerformAction(currentUser.role, 'action:verify_prescription')}
                  canDispense={canPerformAction(currentUser.role, 'action:dispense_medication')}
                  canManageProcurement={canPerformAction(currentUser.role, 'action:manage_procurement')}
                  onAddPrescription={(rx: any) => handleNewPrescription({ ...rx, id: `RX-${Date.now()}`, prescribedAt: new Date().toISOString() })}
                  onUpdatePrescriptionStatus={handleUpdatePrescriptionStatus}
                />
              } />
              <Route path="/clinical" element={
                <ClinicalPage
                  departmentScope={departmentScope}
                  patients={scopedPatients}
                  canAcknowledgeCritical={canPerformAction(currentUser.role, 'action:acknowledge_critical_value')}
                  canManageReferral={canPerformAction(currentUser.role, 'action:manage_referral')}
                  canCreateOrder={
                    canPerformAction(currentUser.role, 'action:order_lab_test') ||
                    canPerformAction(currentUser.role, 'action:order_imaging')
                  }
                  clinicianName={currentUser?.name}
                />
              } />
              <Route path="/inpatient" element={
                <InpatientManagementPage
                  canAdmit={canPerformAction(currentUser.role, 'action:admit_patient')}
                  canDischarge={canPerformAction(currentUser.role, 'action:discharge_patient')}
                  canAdminister={canPerformAction(currentUser.role, 'action:administer_medication')}
                  clinicianName={currentUser?.name}
                />
              } />
              <Route path="/radiology" element={
                <RadiologyPage
                  canCreateOrder={canPerformAction(currentUser.role, 'action:order_imaging')}
                  canWriteReport={canPerformAction(currentUser.role, 'action:write_radiology_report')}
                />
              } />
              <Route path="/billing" element={
                <BillingPage
                  canManage={canPerformAction(currentUser.role, 'action:manage_billing')}
                  canCreateInvoice={canPerformAction(currentUser.role, 'action:create_invoice')}
                  canCheckInsurance={canPerformAction(currentUser.role, 'action:check_insurance')}
                  canSettleInsurance={canPerformAction(currentUser.role, 'action:settle_insurance')}
                  canRecordPayment={canPerformAction(currentUser.role, 'action:record_payment')}
                />
              } />
              <Route path="/operations" element={<OperationsCockpit canSubmitReturns={canPerformAction(currentUser.role, 'action:report_public_health')} />} />
              <Route path="/messages" element={
                <MessagesPage
                  channels={messaging.channels}
                  activeChannelId={messaging.activeChannelId}
                  messages={messaging.messages}
                  currentUserId={currentUser?.id || ''}
                  loading={messaging.loading}
                  onSelectChannel={messaging.selectChannel}
                  onSendMessage={messaging.sendMessage}
                  onStartDM={messaging.startDirectMessage}
                  onTyping={typing.sendTyping}
                  typingText={typing.typingText}
                  getMessageStatus={readReceipts.getMessageStatus}
                />
              } />
              <Route path="/telemedicine" element={<TelemedicinePage currentUser={currentUser} />} />
              <Route path="/monitoring" element={<RemotePatientMonitoring clinicianUserId={currentUser?.id || ''} />} />
              <Route path="/credentials" element={<ProviderCredentialsPage clinicianUserId={currentUser?.id || ''} />} />
              <Route path="/hospitals" element={<SuperAdminHospitalsPage />} />
              <Route path="/vendors" element={<SuperAdminVendorsPage />} />
              <Route path="/settings" element={<SettingsPage canManage={canPerformAction(currentUser.role, 'action:manage_staff')} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </ProtectedRoute>
            {canAccessRoute(currentUser.role, '/messages') && (
              <ChatPanel
                channels={messaging.channels}
                activeChannelId={messaging.activeChannelId}
                messages={messaging.messages}
                currentUserId={currentUser?.id || ''}
                totalUnread={messaging.totalUnread}
                onSelectChannel={messaging.selectChannel}
                onSendMessage={messaging.sendMessage}
                onStartDM={messaging.startDirectMessage}
                onTyping={typing.sendTyping}
                typingText={typing.typingText}
                getMessageStatus={readReceipts.getMessageStatus}
              />
            )}
          </AppLayout>
        )
      } />
    </Routes>
  );
}

export default App;

