import { useMemo } from 'react';
import { Users, AlertTriangle, CheckCircle2, Building, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Bed } from '@/data/inpatientMockData';
import { ShiftSchedulePanel } from './ShiftSchedulePanel';

interface NurseWorkloadDashboardProps {
  beds: Bed[];
}

interface NurseStats {
  name: string;
  totalPatients: number;
  criticalPatients: number;
  highPatients: number;
  wards: Map<string, number>;
}

interface WardStaffing {
  wardId: string;
  wardName: string;
  patients: number;
  nurses: number;
  ratio: number;
  criticalCount: number;
}

// Safe ratios: general ≤6, ICU/CCU/ER ≤2
const MAX_RATIO_GENERAL = 6;
const MAX_RATIO_CRITICAL_WARD = 2;
const CRITICAL_WARDS = ['ICU', 'CCU', 'Emergency'];

function getRatioStatus(ratio: number, wardName: string) {
  const max = CRITICAL_WARDS.includes(wardName) ? MAX_RATIO_CRITICAL_WARD : MAX_RATIO_GENERAL;
  if (ratio <= max * 0.6) return 'safe';
  if (ratio <= max) return 'caution';
  return 'overloaded';
}

function getNurseStatus(total: number, critical: number) {
  if (total > 8 || critical > 2) return 'overloaded';
  if (total > 5 || critical > 1) return 'caution';
  return 'safe';
}

const statusColors = {
  safe: { text: 'text-success', bg: 'bg-success', bar: 'bg-success' },
  caution: { text: 'text-warning', bg: 'bg-warning', bar: 'bg-warning' },
  overloaded: { text: 'text-destructive', bg: 'bg-destructive', bar: 'bg-destructive' },
};

export function NurseWorkloadDashboard({ beds }: NurseWorkloadDashboardProps) {
  const occupiedBeds = useMemo(() => beds.filter(b => b.status === 'occupied'), [beds]);

  const nurseStats = useMemo(() => {
    const map = new Map<string, NurseStats>();
    for (const b of occupiedBeds) {
      if (!b.nurse) continue;
      let stats = map.get(b.nurse);
      if (!stats) {
        stats = { name: b.nurse, totalPatients: 0, criticalPatients: 0, highPatients: 0, wards: new Map() };
        map.set(b.nurse, stats);
      }
      stats.totalPatients++;
      if (b.acuity === 'critical') stats.criticalPatients++;
      if (b.acuity === 'high') stats.highPatients++;
      stats.wards.set(b.wardName, (stats.wards.get(b.wardName) || 0) + 1);
    }
    return Array.from(map.values()).sort((a, b) => b.totalPatients - a.totalPatients);
  }, [occupiedBeds]);

  const wardStaffing = useMemo(() => {
    const wardPatients = new Map<string, { wardName: string; patients: number; nurses: Set<string>; critical: number }>();
    for (const b of occupiedBeds) {
      let ws = wardPatients.get(b.wardId);
      if (!ws) {
        ws = { wardName: b.wardName, patients: 0, nurses: new Set(), critical: 0 };
        wardPatients.set(b.wardId, ws);
      }
      ws.patients++;
      if (b.nurse) ws.nurses.add(b.nurse);
      if (b.acuity === 'critical') ws.critical++;
    }
    return Array.from(wardPatients.entries()).map(([wardId, ws]): WardStaffing => ({
      wardId,
      wardName: ws.wardName,
      patients: ws.patients,
      nurses: ws.nurses.size,
      ratio: ws.nurses.size > 0 ? Math.round((ws.patients / ws.nurses.size) * 10) / 10 : ws.patients,
      criticalCount: ws.critical,
    })).sort((a, b) => b.ratio - a.ratio);
  }, [occupiedBeds]);

  const overloadedNurses = nurseStats.filter(n => getNurseStatus(n.totalPatients, n.criticalPatients) === 'overloaded').length;
  const cautionNurses = nurseStats.filter(n => getNurseStatus(n.totalPatients, n.criticalPatients) === 'caution').length;
  const unassignedBeds = occupiedBeds.filter(b => !b.nurse).length;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Nurses</div>
          <div className="text-2xl font-bold">{nurseStats.length}</div>
          <div className="text-xs text-muted-foreground">on duty</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Overloaded</div>
          <div className={cn("text-2xl font-bold", overloadedNurses > 0 ? "text-destructive" : "text-success")}>
            {overloadedNurses}
          </div>
          <div className="text-xs text-muted-foreground">nurses &gt;8 patients</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Caution</div>
          <div className={cn("text-2xl font-bold", cautionNurses > 0 ? "text-warning" : "text-success")}>
            {cautionNurses}
          </div>
          <div className="text-xs text-muted-foreground">nurses 6–8 patients</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Unassigned</div>
          <div className={cn("text-2xl font-bold", unassignedBeds > 0 ? "text-warning" : "text-success")}>
            {unassignedBeds}
          </div>
          <div className="text-xs text-muted-foreground">beds without nurse</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Ward Staffing Ratios */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Ward Staffing Ratios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {wardStaffing.map(ws => {
                  const status = getRatioStatus(ws.ratio, ws.wardName);
                  const colors = statusColors[status];
                  const isCriticalWard = CRITICAL_WARDS.includes(ws.wardName);
                  const maxRatio = isCriticalWard ? MAX_RATIO_CRITICAL_WARD : MAX_RATIO_GENERAL;
                  const pct = Math.min((ws.ratio / (maxRatio * 1.5)) * 100, 100);

                  return (
                    <div key={ws.wardId} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{ws.wardName}</span>
                          {isCriticalWard && (
                            <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive">Critical Ward</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {status === 'overloaded' && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                          <span className={cn("text-sm font-bold", colors.text)}>
                            {ws.ratio}:1
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", colors.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{ws.patients} patients · {ws.nurses} nurses</span>
                        <span>
                          {ws.criticalCount > 0 && (
                            <span className="text-destructive">{ws.criticalCount} critical</span>
                          )}
                          {ws.criticalCount === 0 && `Target ≤${maxRatio}:1`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Individual Nurse Workloads */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Nurse Workloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {nurseStats.map(nurse => {
                  const status = getNurseStatus(nurse.totalPatients, nurse.criticalPatients);
                  const colors = statusColors[status];
                  const pct = Math.min((nurse.totalPatients / 12) * 100, 100);
                  const wardList = Array.from(nurse.wards.entries());

                  return (
                    <div
                      key={nurse.name}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        status === 'overloaded' && "border-destructive/30 bg-destructive/5",
                        status === 'caution' && "border-warning/30 bg-warning/5",
                        status === 'safe' && "border-border",
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white", colors.bg)}>
                            {nurse.name.replace('Nurse ', '').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{nurse.name}</p>
                            <div className="flex gap-1 mt-0.5">
                              {wardList.map(([ward, count]) => (
                                <Badge key={ward} variant="outline" className="text-[8px] py-0 h-4">
                                  {ward}: {count}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn("text-lg font-bold", colors.text)}>{nurse.totalPatients}</span>
                          <span className="text-xs text-muted-foreground ml-0.5">pts</span>
                        </div>
                      </div>

                      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", colors.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {(nurse.criticalPatients > 0 || nurse.highPatients > 0) && (
                        <div className="flex gap-2 mt-1.5 text-[10px]">
                          {nurse.criticalPatients > 0 && (
                            <span className="text-destructive flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {nurse.criticalPatients} critical
                            </span>
                          )}
                          {nurse.highPatients > 0 && (
                            <span className="text-warning">{nurse.highPatients} high acuity</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Shift Schedule */}
      <ShiftSchedulePanel />
    </div>
  );
}
