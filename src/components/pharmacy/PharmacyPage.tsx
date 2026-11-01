import { useState, useMemo, useCallback } from 'react';
import { Prescription, PrescriptionStatus, PharmacyInventoryItem, Patient } from '@/types/dhos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  FileText,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pill,
  ShieldAlert,
  HeartPulse,
  XCircle,
  ClipboardList,
  ShieldCheck,
  Search,
  ShoppingCart,
  Repeat2,
  Euro,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrescriptionQueue } from './PrescriptionQueue';
import { PrescriptionDetailDialog } from './PrescriptionDetailDialog';
import { NewPrescriptionDialog } from './NewPrescriptionDialog';
import { InventoryManagement } from './InventoryManagement';
import { AuditLogViewer } from './AuditLogViewer';
import { FdaRecallAlerts } from './FdaRecallAlerts';
import { DrugInteractionPanel } from './DrugInteractionPanel';
import { ProcurementDeliveryPanel } from './ProcurementDeliveryPanel';
import { EPrescriptionPanel } from './EPrescriptionPanel';
import { MedicinesSafetyPanel } from './MedicinesSafetyPanel';
import { checkAllPrescriptions, AllergyAlert } from '@/lib/allergyChecker';
import { useAuditLog } from '@/hooks/useAuditLog';

interface PharmacyPageProps {
  prescriptions: Prescription[];
  inventory: PharmacyInventoryItem[];
  patients: Patient[];
  canCreatePrescription?: boolean;
  canVerify?: boolean;
  canDispense?: boolean;
  canManageProcurement?: boolean;
  onAddPrescription: (rx: Omit<Prescription, 'id' | 'prescribedAt'>) => void;
  onUpdatePrescriptionStatus: (id: string, status: PrescriptionStatus) => void;
}

export function PharmacyPage({
  prescriptions,
  inventory,
  patients,
  canCreatePrescription = false,
  canVerify = false,
  canDispense = false,
  canManageProcurement = false,
  onAddPrescription,
  onUpdatePrescriptionStatus,
}: PharmacyPageProps) {
  const [isNewRxOpen, setIsNewRxOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [interactionDrugs, setInteractionDrugs] = useState<{ name: string; id: string }[]>([]);
  const [drugSearchQuery, setDrugSearchQuery] = useState('');
  const { auditLog, addAuditEntry } = useAuditLog();

  const handleAllergyOverride = useCallback((
    rxId: string, patientName: string, medications: string[], allergies: string[],
    severity: 'critical' | 'warning', action: 'dispensed' | 'prescribed'
  ) => {
    addAuditEntry(rxId, patientName, medications, allergies, severity, action);
  }, [addAuditEntry]);

  const allergyAlerts = useMemo(() => 
    checkAllPrescriptions(prescriptions.filter(rx => !['dispensed', 'cancelled'].includes(rx.status)), patients),
    [prescriptions, patients]
  );

  const stats = useMemo(() => {
    const pending = prescriptions.filter(rx => rx.status === 'pending').length;
    const verified = prescriptions.filter(rx => rx.status === 'verified').length;
    const dispensedToday = prescriptions.filter(rx => rx.status === 'dispensed').length;
    const onHold = prescriptions.filter(rx => rx.status === 'on-hold').length;
    const interactions = prescriptions.filter(rx =>
      rx.items.some(i => i.interactions && i.interactions.some(int => int.severity === 'major' || int.severity === 'contraindicated'))
    ).length;
    const lowStock = inventory.filter(i => i.stockQuantity <= i.reorderLevel).length;
    const allergyConflicts = allergyAlerts.filter(a => a.severity === 'critical').length;
    return { pending, verified, dispensedToday, onHold, interactions, lowStock, allergyConflicts };
  }, [prescriptions, inventory, allergyAlerts]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pharmacy</h1>
          <p className="text-muted-foreground">
            E-prescriptions, medication dispensing, and inventory management
          </p>
        </div>
        {canCreatePrescription && (
          <Button onClick={() => setIsNewRxOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Prescription
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><CheckCircle2 className="h-5 w-5 text-info" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.verified}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><Package className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.dispensedToday}</p>
                <p className="text-xs text-muted-foreground">Dispensed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.onHold > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.onHold}</p>
                <p className="text-xs text-muted-foreground">On Hold</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.interactions > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><ShieldAlert className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.interactions}</p>
                <p className="text-xs text-muted-foreground">Interactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.allergyConflicts > 0 ? 'border-destructive/40' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><HeartPulse className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.allergyConflicts}</p>
                <p className="text-xs text-muted-foreground">Allergy Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowStock > 0 ? 'border-warning/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Package className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.lowStock}</p>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allergy Alerts Banner */}
      {allergyAlerts.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <HeartPulse className="h-5 w-5 animate-pulse" />
              Drug-Allergy Alerts — {allergyAlerts.length} Conflict{allergyAlerts.length > 1 ? 's' : ''} Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allergyAlerts.map((alert, i) => (
                <div
                  key={`${alert.prescriptionId}-${alert.medication}-${i}`}
                  className={cn(
                    "flex items-center justify-between bg-background/80 border rounded-lg p-3",
                    alert.severity === 'critical'
                      ? "border-destructive/30"
                      : "border-warning/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {alert.severity === 'critical' ? (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{alert.patientName}</span>
                        <Badge className={cn(
                          "text-xs",
                          alert.severity === 'critical'
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-warning text-warning-foreground"
                        )}>
                          {alert.severity === 'critical' ? 'CONTRAINDICATED' : 'CAUTION'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-xs font-mono">{alert.prescriptionId}</Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allergy: <strong>{alert.allergy}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="prescriptions" className="gap-2">
            <FileText className="h-4 w-4" />
            Prescriptions
            {stats.pending > 0 && (
              <span className="ml-1 bg-warning text-warning-foreground text-xs px-1.5 py-0.5 rounded-full">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory
            {stats.lowStock > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                {stats.lowStock}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="e-prescription" className="gap-2">
            <Repeat2 className="h-4 w-4" />
            e-Prescription
          </TabsTrigger>
          <TabsTrigger value="eu-safety" className="gap-2">
            <Euro className="h-4 w-4" />
            EU Safety
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Audit Log
            {auditLog.length > 0 && (
              <span className="ml-1 bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">
                {auditLog.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="interactions" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Drug Interactions
          </TabsTrigger>
          <TabsTrigger value="fda-alerts" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            FDA Alerts
          </TabsTrigger>
          <TabsTrigger value="procurement" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Procurement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="mt-6">
          <PrescriptionQueue
            prescriptions={prescriptions}
            allergyAlerts={allergyAlerts}
            canVerify={canVerify}
            canDispense={canDispense}
            onUpdateStatus={onUpdatePrescriptionStatus}
            onViewPrescription={setSelectedRx}
            onAllergyOverride={handleAllergyOverride}
          />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryManagement inventory={inventory} />
        </TabsContent>

        <TabsContent value="e-prescription" className="mt-6">
          <EPrescriptionPanel canPrescribe={canCreatePrescription} canDispense={canDispense} />
        </TabsContent>

        <TabsContent value="eu-safety" className="mt-6">
          <MedicinesSafetyPanel canManage={canManageProcurement} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogViewer entries={auditLog} />
        </TabsContent>

        <TabsContent value="interactions" className="mt-6">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ad-Hoc Interaction Checker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Search and add medications to check for drug-drug interactions using the clinical interaction database.</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={drugSearchQuery}
                    onChange={e => setDrugSearchQuery(e.target.value)}
                    placeholder="Search inventory medications…"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-8 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {drugSearchQuery.length >= 2 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {inventory
                        .filter(med => med.name.toLowerCase().includes(drugSearchQuery.toLowerCase()) && !interactionDrugs.some(d => d.id === med.id))
                        .slice(0, 10)
                        .map(med => (
                          <button
                            key={med.id}
                            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent flex items-center justify-between gap-2"
                            onClick={() => {
                              setInteractionDrugs(prev => [...prev, { name: med.name, id: med.id }]);
                              setDrugSearchQuery('');
                            }}
                          >
                            <span className="truncate">{med.name}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">{med.category}</Badge>
                          </button>
                        ))}
                      {inventory.filter(med => med.name.toLowerCase().includes(drugSearchQuery.toLowerCase()) && !interactionDrugs.some(d => d.id === med.id)).length === 0 && (
                        <p className="p-3 text-sm text-muted-foreground text-center">No matching medications</p>
                      )}
                    </div>
                  )}
                </div>
                {interactionDrugs.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {interactionDrugs.map(drug => (
                      <Badge key={drug.id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setInteractionDrugs(prev => prev.filter(d => d.id !== drug.id))}>
                        {drug.name} ×
                      </Badge>
                    ))}
                    {interactionDrugs.length >= 2 && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setInteractionDrugs([])}>
                        Clear All
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            {interactionDrugs.length >= 2 && (
              <DrugInteractionPanel medications={interactionDrugs.map(d => d.name)} />
            )}
            {interactionDrugs.length === 1 && (
              <p className="text-sm text-muted-foreground text-center py-4">Add at least one more medication to check interactions.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fda-alerts" className="mt-6">
          <FdaRecallAlerts />
        </TabsContent>
        <TabsContent value="procurement" className="mt-6">
          <ProcurementDeliveryPanel inventory={inventory} canManage={canManageProcurement} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewPrescriptionDialog
        open={isNewRxOpen}
        onOpenChange={setIsNewRxOpen}
        patients={patients}
        onCreatePrescription={onAddPrescription}
        onAllergyOverride={handleAllergyOverride}
      />

      <PrescriptionDetailDialog
        prescription={selectedRx}
        onClose={() => setSelectedRx(null)}
        canVerify={canVerify}
        canDispense={canDispense}
        onUpdateStatus={onUpdatePrescriptionStatus}
        allergyAlerts={allergyAlerts}
        onAllergyOverride={handleAllergyOverride}
      />
    </div>
  );
}
