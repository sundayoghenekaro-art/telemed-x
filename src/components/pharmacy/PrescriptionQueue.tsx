import { useMemo } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Prescription, PrescriptionStatus } from '@/types/dhos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  MoreVertical,
  Eye,
  Package,
  XCircle,
  Pause,
  Search,
  HeartPulse,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { AllergyAlert } from '@/lib/allergyChecker';
import { AllergyConfirmDialog } from './AllergyConfirmDialog';
import { ControlledSubstanceConfirmDialog } from './ControlledSubstanceConfirmDialog';
import { mockInventory } from '@/data/pharmacyMockData';

const controlledMedIds = new Set(mockInventory.filter(m => m.controlled).map(m => m.id));

interface PrescriptionQueueProps {
  prescriptions: Prescription[];
  allergyAlerts: AllergyAlert[];
  canVerify?: boolean;
  canDispense?: boolean;
  onUpdateStatus: (id: string, status: PrescriptionStatus) => void;
  onViewPrescription: (rx: Prescription) => void;
  onAllergyOverride?: (rxId: string, patientName: string, medications: string[], allergies: string[], severity: 'critical' | 'warning', action: 'dispensed') => void;
}

const statusConfig: Record<PrescriptionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-warning/10 text-warning border-warning/20', icon: <Clock className="h-3 w-3" /> },
  verified: { label: 'Verified', color: 'bg-info/10 text-info border-info/20', icon: <CheckCircle2 className="h-3 w-3" /> },
  dispensed: { label: 'Dispensed', color: 'bg-success/10 text-success border-success/20', icon: <Package className="h-3 w-3" /> },
  'partially-dispensed': { label: 'Partial', color: 'bg-primary/10 text-primary border-primary/20', icon: <Package className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground border-border', icon: <XCircle className="h-3 w-3" /> },
  'on-hold': { label: 'On Hold', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: <Pause className="h-3 w-3" /> },
};

const priorityConfig = {
  routine: { label: 'ROUTINE', color: 'bg-muted text-muted-foreground' },
  urgent: { label: 'URGENT', color: 'bg-warning text-warning-foreground' },
  stat: { label: 'STAT', color: 'bg-destructive text-destructive-foreground' },
};

export function PrescriptionQueue({ prescriptions, allergyAlerts, canVerify = false, canDispense = false, onUpdateStatus, onViewPrescription, onAllergyOverride }: PrescriptionQueueProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'active' | 'pending' | 'dispensed' | 'all'>('active');
  const [confirmDispenseRx, setConfirmDispenseRx] = useState<Prescription | null>(null);
  const [controlledConfirmRx, setControlledConfirmRx] = useState<Prescription | null>(null);

  const filtered = useMemo(() => {
    let list = prescriptions;
    if (filter === 'active') list = list.filter(rx => ['pending', 'verified', 'on-hold'].includes(rx.status));
    else if (filter === 'pending') list = list.filter(rx => rx.status === 'pending');
    else if (filter === 'dispensed') list = list.filter(rx => rx.status === 'dispensed' || rx.status === 'partially-dispensed');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(rx =>
        rx.patientName.toLowerCase().includes(q) ||
        rx.id.toLowerCase().includes(q) ||
        rx.items.some(i => i.medicationName.toLowerCase().includes(q))
      );
    }
    // Sort: stat > urgent > routine, then by date
    return list.sort((a, b) => {
      const pOrder = { stat: 0, urgent: 1, routine: 2 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime();
    });
  }, [prescriptions, filter, search]);

  const hasInteractions = (rx: Prescription) => rx.items.some(i => i.interactions && i.interactions.length > 0);
  const hasMajorInteraction = (rx: Prescription) => rx.items.some(i => i.interactions?.some(int => int.severity === 'major' || int.severity === 'contraindicated'));
  const getAllergyAlertsForRx = (rx: Prescription) => allergyAlerts.filter(a => a.prescriptionId === rx.id);
  const hasAllergyAlert = (rx: Prescription) => getAllergyAlertsForRx(rx).length > 0;
  const hasControlledSubstance = (rx: Prescription) => rx.items.some(i => controlledMedIds.has(i.medicationId));
  const getControlledMeds = (rx: Prescription) => rx.items.filter(i => controlledMedIds.has(i.medicationId)).map(i => i.medicationName);

  const handleDispense = (rx: Prescription) => {
    const rxAlerts = getAllergyAlertsForRx(rx);
    if (rxAlerts.length > 0) {
      setConfirmDispenseRx(rx);
    } else if (hasControlledSubstance(rx)) {
      setControlledConfirmRx(rx);
    } else {
      onUpdateStatus(rx.id, 'dispensed');
      toast({ title: 'Medication Dispensed', description: `${rx.id} for ${rx.patientName}` });
    }
  };

  return (
    <>
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Prescription Queue
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search Rx..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-48 h-9"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {(['active', 'pending', 'dispensed', 'all'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="capitalize text-xs">
              {f}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No prescriptions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(rx => {
                const sConfig = statusConfig[rx.status];
                const pConfig = priorityConfig[rx.priority];
                return (
                  <div
                    key={rx.id}
                    className={cn(
                      "border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition-colors",
                      hasAllergyAlert(rx) && "border-l-4 border-l-destructive bg-destructive/5",
                      !hasAllergyAlert(rx) && hasMajorInteraction(rx) && "border-l-4 border-l-destructive",
                      !hasAllergyAlert(rx) && !hasMajorInteraction(rx) && rx.priority === 'stat' && "border-l-4 border-l-destructive/60",
                      !hasAllergyAlert(rx) && !hasMajorInteraction(rx) && rx.priority === 'urgent' && "border-l-4 border-l-warning"
                    )}
                    onClick={() => onViewPrescription(rx)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rx.patientName}</h4>
                          <Badge className={cn('text-xs gap-1', pConfig.color)}>
                            {rx.priority === 'stat' && <Zap className="h-3 w-3" />}
                            {rx.priority === 'urgent' && <AlertTriangle className="h-3 w-3" />}
                            {pConfig.label}
                          </Badge>
                          <Badge variant="outline" className={cn('text-xs gap-1', sConfig.color)}>
                            {sConfig.icon}
                            {sConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{rx.id}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => onViewPrescription(rx)}>
                            <Eye className="h-4 w-4 mr-2" />View Details
                          </DropdownMenuItem>
                          {canVerify && rx.status === 'pending' && (
                            <DropdownMenuItem onClick={() => { onUpdateStatus(rx.id, 'verified'); toast({ title: 'Prescription Verified', description: `${rx.id} for ${rx.patientName}` }); }}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />Verify
                            </DropdownMenuItem>
                          )}
                          {canDispense && rx.status === 'verified' && (
                            <DropdownMenuItem onClick={() => handleDispense(rx)}>
                              <Package className="h-4 w-4 mr-2" />Mark Dispensed
                            </DropdownMenuItem>
                          )}
                          {canDispense && (rx.status === 'pending' || rx.status === 'verified') && (
                            <DropdownMenuItem onClick={() => { onUpdateStatus(rx.id, 'on-hold'); toast({ title: 'Prescription On Hold', description: `${rx.id} placed on hold`, variant: 'destructive' }); }}>
                              <Pause className="h-4 w-4 mr-2" />Put On Hold
                            </DropdownMenuItem>
                          )}
                          {canDispense && rx.status === 'on-hold' && (
                            <DropdownMenuItem onClick={() => { onUpdateStatus(rx.id, 'pending'); toast({ title: 'Prescription Resumed', description: `${rx.id} moved back to pending` }); }}>
                              <Clock className="h-4 w-4 mr-2" />Resume
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Medication items */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {rx.items.map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {item.medicationName}
                        </Badge>
                      ))}
                    </div>

                    {/* Interaction warning */}
                    {hasInteractions(rx) && (
                      <div className={cn(
                        "flex items-center gap-2 text-xs p-1.5 rounded",
                        hasMajorInteraction(rx) ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                      )}>
                        <AlertTriangle className="h-3 w-3" />
                        Drug interaction detected
                      </div>
                    )}

                    {/* Allergy alert */}
                    {hasAllergyAlert(rx) && (
                      <div className="space-y-1">
                        {getAllergyAlertsForRx(rx).map((alert, ai) => (
                          <div
                            key={ai}
                            className={cn(
                              "flex items-center gap-2 text-xs p-1.5 rounded",
                              alert.severity === 'critical'
                                ? "bg-destructive/10 text-destructive"
                                : "bg-warning/10 text-warning"
                            )}
                          >
                            <HeartPulse className="h-3 w-3 shrink-0" />
                            <span className="font-medium">
                              {alert.severity === 'critical' ? '⛔' : '⚠️'} Allergy:
                            </span>
                            {alert.message}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{rx.prescribedBy}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(parseISO(rx.prescribedAt), { addSuffix: true })}</span>
                      <span>•</span>
                      <span>{rx.items.length} item(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>

    {confirmDispenseRx && (
      <AllergyConfirmDialog
        open={!!confirmDispenseRx}
        onOpenChange={(open) => { if (!open) setConfirmDispenseRx(null); }}
        alerts={getAllergyAlertsForRx(confirmDispenseRx)}
        patientName={confirmDispenseRx.patientName}
        onConfirm={() => {
          const rx = confirmDispenseRx;
          const alerts = getAllergyAlertsForRx(rx);
          const maxSeverity = alerts.some(a => a.severity === 'critical') ? 'critical' : 'warning' as const;
          onAllergyOverride?.(
            rx.id,
            rx.patientName,
            alerts.map(a => a.medication),
            [...new Set(alerts.map(a => a.allergy))],
            maxSeverity,
            'dispensed'
          );
          setConfirmDispenseRx(null);
          if (hasControlledSubstance(rx)) {
            setControlledConfirmRx(rx);
          } else {
            onUpdateStatus(rx.id, 'dispensed');
            toast({ title: 'Medication Dispensed (Override)', description: `${rx.id} for ${rx.patientName} — allergy warning acknowledged` });
          }
        }}
      />
    )}

    {controlledConfirmRx && (
      <ControlledSubstanceConfirmDialog
        open={!!controlledConfirmRx}
        onOpenChange={(open) => { if (!open) setControlledConfirmRx(null); }}
        patientName={controlledConfirmRx.patientName}
        medications={getControlledMeds(controlledConfirmRx)}
        onConfirm={() => {
          onUpdateStatus(controlledConfirmRx.id, 'dispensed');
          toast({ title: 'Controlled Substance Dispensed', description: `${controlledConfirmRx.id} for ${controlledConfirmRx.patientName} — double verification completed` });
          setControlledConfirmRx(null);
        }}
      />
    )}
    </>
  );
}
