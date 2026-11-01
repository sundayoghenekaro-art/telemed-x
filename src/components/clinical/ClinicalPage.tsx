import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stethoscope, FileText, ClipboardList, HeartPulse, Building, Bot, Globe, Network, Siren, BookMarked, FileJson, Baby } from 'lucide-react';
import { EncountersList } from './EncountersList';
import { ClinicalOrdersPanel } from './ClinicalOrdersPanel';
import { VitalsPanel } from './VitalsPanel';
import { InpatientPanel } from './InpatientPanel';
import { ClinicalAssistant } from './ClinicalAssistant';
import { FhirExchangePanel } from './FhirExchangePanel';
import { CriticalValuesBoard } from './CriticalValuesBoard';
import { ReferralNetworkPanel } from './ReferralNetworkPanel';
import { TerminologyPanel } from './TerminologyPanel';
import { PatientSummaryPanel } from './PatientSummaryPanel';
import { MaternityScreeningPanel } from './MaternityScreeningPanel';
import { mockEncounters, mockClinicalOrders, mockVitalsHistory, mockWardRounds, mockDischargeTasks } from '@/data/clinicalMockData';
import { mockPatients } from '@/data/mockData';
import { mockPrescriptions } from '@/data/pharmacyMockData';
import { scopeByDepartment } from '@/lib/access';
import { Patient } from '@/types/dhos';

interface ClinicalPageProps {
  departmentScope?: string | null;
  patients?: Patient[];
  canAcknowledgeCritical?: boolean;
  canManageReferral?: boolean;
  clinicianName?: string;
}

export function ClinicalPage({
  departmentScope = null,
  patients = mockPatients,
  canAcknowledgeCritical = false,
  canManageReferral = false,
  clinicianName,
}: ClinicalPageProps) {
  const [activeTab, setActiveTab] = useState('encounters');

  const scopedEncounters = useMemo(
    () => scopeByDepartment(mockEncounters, departmentScope),
    [departmentScope],
  );
  const activeEncounters = scopedEncounters.filter(e => e.status === 'in-progress').length;
  const pendingOrders = mockClinicalOrders.filter(o => o.status === 'pending').length;
  const pendingRounds = mockWardRounds.filter(r => r.status !== 'completed').length;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          Clinical Desktop
        </h1>
        <p className="text-muted-foreground">
          Patient encounters, orders, vitals monitoring, and inpatient management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="encounters" className="gap-2">
            <FileText className="h-4 w-4" />
            Encounters
            {activeEncounters > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{activeEncounters}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Orders
            {pendingOrders > 0 && (
              <span className="ml-1 bg-warning text-warning-foreground text-xs px-1.5 py-0.5 rounded-full">{pendingOrders}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="vitals" className="gap-2">
            <HeartPulse className="h-4 w-4" />
            Vitals
          </TabsTrigger>
          <TabsTrigger value="terminology" className="gap-2">
            <BookMarked className="h-4 w-4" />
            Terminology
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileJson className="h-4 w-4" />
            Patient Summary
          </TabsTrigger>
          <TabsTrigger value="maternity" className="gap-2">
            <Baby className="h-4 w-4" />
            Maternity
          </TabsTrigger>
          <TabsTrigger value="inpatient" className="gap-2">
            <Building className="h-4 w-4" />
            Inpatient
            {pendingRounds > 0 && (
              <span className="ml-1 bg-info text-info-foreground text-xs px-1.5 py-0.5 rounded-full">{pendingRounds}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai-assistant" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="fhir-exchange" className="gap-2">
            <Globe className="h-4 w-4" />
            FHIR Exchange
          </TabsTrigger>
          <TabsTrigger value="critical" className="gap-2">
            <Siren className="h-4 w-4" />
            Critical Values
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <Network className="h-4 w-4" />
            Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="encounters" className="mt-6">
          <EncountersList encounters={scopedEncounters} />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <ClinicalOrdersPanel orders={mockClinicalOrders} />
        </TabsContent>
        <TabsContent value="vitals" className="mt-6">
          <VitalsPanel vitalsHistory={mockVitalsHistory} patients={patients} />
        </TabsContent>
        <TabsContent value="terminology" className="mt-6">
          <TerminologyPanel />
        </TabsContent>
        <TabsContent value="summary" className="mt-6">
          <PatientSummaryPanel canSend={canManageReferral} />
        </TabsContent>
        <TabsContent value="maternity" className="mt-6">
          <MaternityScreeningPanel canManage={canManageReferral} />
        </TabsContent>
        <TabsContent value="inpatient" className="mt-6">
          <InpatientPanel rounds={mockWardRounds} discharges={mockDischargeTasks} />
        </TabsContent>
        <TabsContent value="ai-assistant" className="mt-6">
          <ClinicalAssistant patients={patients} vitalsHistory={mockVitalsHistory} prescriptions={mockPrescriptions} />
        </TabsContent>
        <TabsContent value="fhir-exchange" className="mt-6">
          <FhirExchangePanel />
        </TabsContent>
        <TabsContent value="critical" className="mt-6">
          <CriticalValuesBoard
            mode="acknowledge"
            canAct={canAcknowledgeCritical}
            clinicianName={clinicianName}
          />
        </TabsContent>
        <TabsContent value="referrals" className="mt-6">
          <ReferralNetworkPanel canManage={canManageReferral} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
