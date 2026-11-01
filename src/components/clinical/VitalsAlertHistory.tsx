import { useState, useMemo } from 'react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { AlertTriangle, HeartPulse, Thermometer, Wind, Droplets, Activity, Filter, X, Download, FileText, FileSpreadsheet, CalendarIcon, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { VitalSigns, Patient } from '@/types/dhos';
import { cn } from '@/lib/utils';
import {
  VitalsProfileId, VITALS_PROFILES, VITAL_META,
  getThresholds, getSeverity,
} from '@/lib/vitalsThresholds';
import { getAllProfiles } from '@/lib/customProfiles';
import { exportCsv, exportPdf } from '@/lib/exportAlerts';
import { EmailReportDialog } from './EmailReportDialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type AlertLevel = 'warning' | 'critical';

const VITAL_ICONS: Record<string, React.ElementType> = {
  hr: HeartPulse, bpSys: Activity, bpDia: Activity,
  temp: Thermometer, spo2: Droplets, rr: Wind, pain: HeartPulse,
};

interface AlertEntry {
  patientName: string;
  patientUpid: string;
  profileLabel: string;
  timestamp: string;
  vitalKey: string;
  value: number;
  level: AlertLevel;
}

function getAlerts(
  vitalsHistory: Record<string, VitalSigns[]>,
  patients: Patient[],
  patientProfiles: Record<string, string>,
): AlertEntry[] {
  const alerts: AlertEntry[] = [];
  const patientMap = new Map(patients.map(p => [p.upid, p]));
  const profiles = getAllProfiles();

  for (const [upid, readings] of Object.entries(vitalsHistory)) {
    const patient = patientMap.get(upid);
    if (!patient) continue;
    const name = `${patient.firstName} ${patient.lastName}`;
    const profileId = patientProfiles[upid] || 'adult';
    const profile = profiles.find(p => p.id === profileId) || VITALS_PROFILES[0];
    const thresholds = profile.thresholds;
    const profileLabel = profile.label;

    for (const v of readings) {
      const checks: [string, number | undefined][] = [
        ['hr', v.heartRate], ['bpSys', v.bloodPressureSystolic], ['bpDia', v.bloodPressureDiastolic],
        ['temp', v.temperature], ['spo2', v.oxygenSaturation], ['rr', v.respiratoryRate], ['pain', v.painLevel],
      ];
      for (const [key, val] of checks) {
        if (val === undefined) continue;
        const severity = getSeverity(key, val, thresholds);
        if (severity === 'critical') alerts.push({ patientName: name, patientUpid: upid, profileLabel, timestamp: v.timestamp, vitalKey: key, value: val, level: 'critical' });
        else if (severity === 'warning') alerts.push({ patientName: name, patientUpid: upid, profileLabel, timestamp: v.timestamp, vitalKey: key, value: val, level: 'warning' });
      }
    }
  }

  return alerts.sort((a, b) => {
    if (a.level === 'critical' && b.level !== 'critical') return -1;
    if (b.level === 'critical' && a.level !== 'critical') return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

interface VitalsAlertHistoryProps {
  vitalsHistory: Record<string, VitalSigns[]>;
  patients: Patient[];
  patientProfiles: Record<string, string>;
}

export function VitalsAlertHistory({ vitalsHistory, patients, patientProfiles }: VitalsAlertHistoryProps) {
  const allAlerts = getAlerts(vitalsHistory, patients, patientProfiles);
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [vitalFilter, setVitalFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Unique patients and vital types from alerts
  const uniquePatients = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of allAlerts) map.set(a.patientUpid, a.patientName);
    return Array.from(map.entries());
  }, [allAlerts]);

  const uniqueVitals = useMemo(() => {
    const set = new Set<string>();
    for (const a of allAlerts) set.add(a.vitalKey);
    return Array.from(set);
  }, [allAlerts]);

  const filtered = useMemo(() => {
    return allAlerts.filter(a => {
      if (patientFilter !== 'all' && a.patientUpid !== patientFilter) return false;
      if (severityFilter !== 'all' && a.level !== severityFilter) return false;
      if (vitalFilter !== 'all' && a.vitalKey !== vitalFilter) return false;
      if (dateFrom || dateTo) {
        const dt = new Date(a.timestamp);
        if (dateFrom && dt < startOfDay(dateFrom)) return false;
        if (dateTo && dt > endOfDay(dateTo)) return false;
      }
      return true;
    });
  }, [allAlerts, patientFilter, severityFilter, vitalFilter, dateFrom, dateTo]);

  const criticalCount = filtered.filter(a => a.level === 'critical').length;
  const warningCount = filtered.filter(a => a.level === 'warning').length;
  const hasFilters = patientFilter !== 'all' || severityFilter !== 'all' || vitalFilter !== 'all' || !!dateFrom || !!dateTo;

  const clearFilters = () => {
    setPatientFilter('all');
    setSeverityFilter('all');
    setVitalFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  if (allAlerts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Abnormal Vitals Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="text-[10px] px-2 py-0.5 bg-warning text-warning-foreground border-transparent">
                {warningCount} Warning
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1">
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem onClick={() => exportCsv(filtered)} className="text-xs gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPdf(filtered)} className="text-xs gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEmailDialogOpen(true)} className="text-xs gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  Email Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

          <Select value={patientFilter} onValueChange={setPatientFilter}>
            <SelectTrigger className="h-7 text-xs w-[150px]">
              <SelectValue placeholder="All patients" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All patients</SelectItem>
              {uniquePatients.map(([upid, name]) => (
                <SelectItem key={upid} value={upid}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-7 text-xs w-[120px]">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="critical">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  Critical
                </span>
              </SelectItem>
              <SelectItem value="warning">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  Warning
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-7 text-xs px-2 gap-1 w-[130px] justify-start", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3" />
                {dateFrom ? format(dateFrom, 'MMM d') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-7 text-xs px-2 gap-1 w-[130px] justify-start", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3" />
                {dateTo ? format(dateTo, 'MMM d') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1 border-l pl-2 ml-1">
            {[
              { label: 'Today', from: new Date(), to: new Date() },
              { label: '7d', from: subDays(new Date(), 7), to: new Date() },
              { label: '30d', from: subDays(new Date(), 30), to: new Date() },
            ].map(preset => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-1.5"
                onClick={() => { setDateFrom(preset.from); setDateTo(preset.to); }}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Select value={vitalFilter} onValueChange={setVitalFilter}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue placeholder="All vitals" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All vitals</SelectItem>
              {uniqueVitals.map(key => (
                <SelectItem key={key} value={key}>{VITAL_META[key]?.label || key}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1" onClick={clearFilters}>
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}

          {hasFilters && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {filtered.length} of {allAlerts.length} alerts
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No alerts match the selected filters.
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-3">
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />

              <div className="space-y-3">
                {filtered.map((alert, i) => {
                  const meta = VITAL_META[alert.vitalKey];
                  const Icon = VITAL_ICONS[alert.vitalKey] || HeartPulse;
                  const profileId = patientProfiles[alert.patientUpid] || 'adult';
                  const profile = getAllProfiles().find(p => p.id === profileId) || VITALS_PROFILES[0];
                  const thresholds = profile.thresholds;
                  const t = thresholds[alert.vitalKey];
                  return (
                    <div key={i} className="relative">
                      <div className={cn(
                        "absolute -left-[17px] top-2 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                        alert.level === 'critical' ? 'bg-destructive' : 'bg-warning',
                      )} />

                      <div className={cn(
                        "rounded-lg border p-3 text-sm",
                        alert.level === 'critical' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5',
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-3.5 w-3.5", alert.level === 'critical' ? 'text-destructive' : 'text-warning')} />
                            <span className="font-medium text-xs">{alert.patientName}</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">{alert.profileLabel}</Badge>
                          </div>
                          <span className={cn(
                            "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                            alert.level === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
                          )}>
                            {alert.level}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{meta?.label}: {alert.value} {meta?.unit}</span>
                          {t && <> · Normal: {t.low}–{t.high}</>}
                          {' '}· {format(new Date(alert.timestamp), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <EmailReportDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen} alerts={filtered} />
    </Card>
  );
}
