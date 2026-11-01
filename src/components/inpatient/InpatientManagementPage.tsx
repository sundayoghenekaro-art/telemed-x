import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Building, LayoutGrid, ClipboardList, ArrowRightFromLine, UserPlus, ArrowRightLeft, Users, Pill, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BedManagementBoard } from './BedManagementBoard';
import { InteractiveWardRounds } from './InteractiveWardRounds';
import { DischargeWorkflow } from './DischargeWorkflow';
import { AdmissionDialog } from './AdmissionDialog';
import { TransferDialog } from './TransferDialog';
import { BedNotificationsPanel } from './BedNotificationsPanel';
import { NurseAssignmentDialog } from './NurseAssignmentDialog';
import { PatientTimeline } from './PatientTimeline';
import { NurseWorkloadDashboard } from './NurseWorkloadDashboard';
import { MedicationAdministrationPanel } from './MedicationAdministrationPanel';
import { EmergencyTriagePanel } from './EmergencyTriagePanel';
import { useBedNotifications } from '@/hooks/useBedNotifications';
import { useWardNotificationPreferences } from '@/hooks/useWardNotificationPreferences';
import {
  mockBeds, mockWardRounds, mockDischargeTasks,
  Bed, WardRound, DischargeTask, Admission, Transfer,
} from '@/data/inpatientMockData';

export function InpatientManagementPage({
  canAdmit = false,
  canDischarge = false,
  canAdminister = false,
  clinicianName,
}: {
  canAdmit?: boolean;
  canDischarge?: boolean;
  canAdminister?: boolean;
  clinicianName?: string;
}) {
  const [activeTab, setActiveTab] = useState('beds');
  const [beds, setBeds] = useState<Bed[]>(mockBeds);
  const [rounds, setRounds] = useState<WardRound[]>(mockWardRounds);
  const [discharges, setDischarges] = useState<DischargeTask[]>(mockDischargeTasks);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [nurseAssignOpen, setNurseAssignOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const { subscribedWards, toggleWard, subscribeAll, unsubscribeAll, allWards } = useWardNotificationPreferences();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useBedNotifications(beds, subscribedWards);

  const availableBeds = beds.filter(b => b.status === 'available');
  const occupiedBeds = beds.filter(b => b.status === 'occupied' && b.patientName);
  const pendingRounds = rounds.filter(r => r.status !== 'completed').length;
  const activeDischarges = discharges.filter(d => d.status !== 'discharged').length;

  const handleAdmit = (admission: Omit<Admission, 'id'>) => {
    setBeds(prev => prev.map(b =>
      b.id === admission.bedId
        ? { ...b, status: 'occupied' as const, patientUpid: admission.patientUpid, patientName: admission.patientName, physician: admission.admittingPhysician, admissionDate: admission.admissionDate, acuity: admission.priority === 'emergency' ? 'critical' : 'medium' }
        : b
    ));
  };

  const handleTransfer = (transfer: Omit<Transfer, 'id'>) => {
    // Free the old bed
    setBeds(prev => prev.map(b => {
      if (b.bedNumber === transfer.fromBed && b.wardName === transfer.fromWard) {
        return { ...b, status: 'cleaning' as const, patientUpid: undefined, patientName: undefined, physician: undefined, acuity: undefined, admissionDate: undefined };
      }
      if (b.bedNumber === transfer.toBed && b.wardName === transfer.toWard) {
        return { ...b, status: 'occupied' as const, patientUpid: transfer.patientUpid, patientName: transfer.patientName, physician: transfer.requestedBy, acuity: 'medium' as const };
      }
      return b;
    }));
  };

  const handleUpdateRound = (roundId: string, updates: Partial<WardRound>) => {
    setRounds(prev => prev.map(r => r.id === roundId ? { ...r, ...updates } : r));
  };

  const handleUpdateDischarge = (id: string, updates: Partial<DischargeTask>) => {
    setDischarges(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    // When discharged, free the bed so it triggers a notification
    if (updates.status === 'discharged') {
      const discharge = discharges.find(d => d.id === id);
      if (discharge) {
        setBeds(prev => prev.map(b =>
          b.bedNumber === discharge.bed && b.wardName === discharge.ward
            ? { ...b, status: 'available' as const, patientUpid: undefined, patientName: undefined, physician: undefined, acuity: undefined, admissionDate: undefined }
            : b
        ));
      }
    }
  };

  const handleNurseAssign = (assignments: { bedId: string; nurse: string | undefined }[]) => {
    setBeds(prev => prev.map(b => {
      const assignment = assignments.find(a => a.bedId === b.id);
      return assignment ? { ...b, nurse: assignment.nurse } : b;
    }));
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            In-Patient Management
          </h1>
          <p className="text-muted-foreground">
            Admissions, bed management, ward rounds, and discharge workflows
          </p>
        </div>
        <div className="flex gap-2">
          <BedNotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onClearAll={clearAll}
            subscribedWards={subscribedWards}
            allWards={allWards}
            onToggleWard={toggleWard}
            onSubscribeAll={subscribeAll}
            onUnsubscribeAll={unsubscribeAll}
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNurseAssignOpen(true)}>
            <Users className="h-4 w-4" />
            Nurses
          </Button>
          {canAdmit && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="h-4 w-4" />
                Transfer
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setAdmissionOpen(true)}>
                <UserPlus className="h-4 w-4" />
                New Admission
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="beds" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Bed Board
          </TabsTrigger>
          <TabsTrigger value="rounds" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Ward Rounds
            {pendingRounds > 0 && (
              <span className="ml-1 bg-info text-info-foreground text-xs px-1.5 py-0.5 rounded-full">{pendingRounds}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="discharge" className="gap-2">
            <ArrowRightFromLine className="h-4 w-4" />
            Discharge
            {activeDischarges > 0 && (
              <span className="ml-1 bg-warning text-warning-foreground text-xs px-1.5 py-0.5 rounded-full">{activeDischarges}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="staffing" className="gap-2">
            <Users className="h-4 w-4" />
            Staffing
          </TabsTrigger>
          <TabsTrigger value="medications" className="gap-2">
            <Pill className="h-4 w-4" />
            Medications
          </TabsTrigger>
          <TabsTrigger value="emergency" className="gap-2">
            <Siren className="h-4 w-4" />
            Emergency
          </TabsTrigger>
        </TabsList>

        <TabsContent value="beds" className="mt-6">
          <div className="flex gap-4">
            <div className={cn(selectedBed ? "flex-1 min-w-0" : "w-full")}>
              <BedManagementBoard
                beds={beds}
                onSelectBed={(bed) => setSelectedBed(bed.status === 'occupied' ? bed : null)}
              />
            </div>
            {selectedBed && selectedBed.status === 'occupied' && (
              <div className="w-[380px] flex-shrink-0">
                <PatientTimeline bed={selectedBed} onClose={() => setSelectedBed(null)} />
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="rounds" className="mt-6">
          <InteractiveWardRounds rounds={rounds} onUpdateRound={handleUpdateRound} />
        </TabsContent>
        <TabsContent value="discharge" className="mt-6">
          <DischargeWorkflow discharges={discharges} onUpdateDischarge={handleUpdateDischarge} canDischarge={canDischarge} />
        </TabsContent>
        <TabsContent value="staffing" className="mt-6">
          <NurseWorkloadDashboard beds={beds} />
        </TabsContent>
        <TabsContent value="medications" className="mt-6">
          <MedicationAdministrationPanel canAdminister={canAdminister} clinicianName={clinicianName} />
        </TabsContent>
        <TabsContent value="emergency" className="mt-6">
          <EmergencyTriagePanel canTreat={canAdmit || canAdminister} canAdmit={canAdmit} />
        </TabsContent>
      </Tabs>

      <AdmissionDialog
        open={admissionOpen}
        onOpenChange={setAdmissionOpen}
        availableBeds={availableBeds}
        onAdmit={handleAdmit}
      />
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        occupiedBeds={occupiedBeds}
        availableBeds={availableBeds}
        onTransfer={handleTransfer}
      />
      <NurseAssignmentDialog
        open={nurseAssignOpen}
        onOpenChange={setNurseAssignOpen}
        beds={beds}
        onAssign={handleNurseAssign}
      />
    </div>
  );
}
