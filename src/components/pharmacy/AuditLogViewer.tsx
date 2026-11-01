import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Clock, User, Pill, AlertTriangle, Download, CalendarIcon, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AllergyOverrideEntry {
  id: string;
  timestamp: Date;
  pharmacistName: string;
  patientName: string;
  prescriptionId: string;
  medications: string[];
  allergies: string[];
  severity: 'critical' | 'warning';
  action: 'dispensed' | 'prescribed';
}

interface AuditLogViewerProps {
  entries: AllergyOverrideEntry[];
}

function exportToCsv(entries: AllergyOverrideEntry[]) {
  const headers = ['Timestamp', 'Pharmacist', 'Patient', 'Prescription ID', 'Action', 'Severity', 'Medications', 'Allergies'];
  const rows = entries
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .map(e => [
      format(e.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      e.pharmacistName,
      e.patientName,
      e.prescriptionId,
      e.action,
      e.severity,
      `"${e.medications.join('; ')}"`,
      `"${e.allergies.join('; ')}"`,
    ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `allergy-override-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditLogViewer({ entries }: AuditLogViewerProps) {
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'prescribed' | 'dispensed'>('all');

  const filtered = useMemo(() => {
    let result = [...entries];
    if (fromDate || toDate) {
      result = result.filter(e => {
        const ts = e.timestamp;
        if (fromDate && ts < startOfDay(fromDate)) return false;
        if (toDate && ts > endOfDay(toDate)) return false;
        return true;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(e =>
        e.patientName.toLowerCase().includes(q) ||
        e.prescriptionId.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== 'all') {
      result = result.filter(e => e.severity === severityFilter);
    }
    if (actionFilter !== 'all') {
      result = result.filter(e => e.action === actionFilter);
    }
    return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [entries, fromDate, toDate, searchQuery, severityFilter, actionFilter]);

  const hasFilter = fromDate || toDate || searchQuery.trim() || severityFilter !== 'all' || actionFilter !== 'all';

  const clearAll = () => {
    setFromDate(undefined); setToDate(undefined); setSearchQuery('');
    setSeverityFilter('all'); setActionFilter('all');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Allergy Override Audit Log
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={filtered.length === 0}
              onClick={() => exportToCsv(filtered)}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Badge variant="outline" className="text-xs">
              {filtered.length}{hasFilter ? ` / ${entries.length}` : ''} record{filtered.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Search and date range filter */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search patient or Rx ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 pl-8 text-xs"
            />
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1">
            {(['all', 'critical', 'warning'] as const).map(s => (
              <Button
                key={s}
                variant={severityFilter === s ? 'default' : 'outline'}
                size="sm"
                className={cn("text-xs h-7 px-2.5", severityFilter === s && s === 'critical' && "bg-destructive text-destructive-foreground hover:bg-destructive/90", severityFilter === s && s === 'warning' && "bg-warning text-warning-foreground hover:bg-warning/90")}
                onClick={() => setSeverityFilter(s)}
              >
                {s === 'all' ? 'All Severity' : s === 'critical' ? 'Critical' : 'Warning'}
              </Button>
            ))}
          </div>

          {/* Action filter */}
          <div className="flex items-center gap-1">
            {(['all', 'prescribed', 'dispensed'] as const).map(a => (
              <Button
                key={a}
                variant={actionFilter === a ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setActionFilter(a)}
              >
                {a === 'all' ? 'All Actions' : a.charAt(0).toUpperCase() + a.slice(1)}
              </Button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8", !fromDate && "text-muted-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {fromDate ? format(fromDate, 'MMM d, yyyy') : 'From date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                disabled={(date) => (toDate ? date > toDate : false) || date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8", !toDate && "text-muted-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {toDate ? format(toDate, 'MMM d, yyyy') : 'To date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                disabled={(date) => (fromDate ? date < fromDate : false) || date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs h-8 text-muted-foreground"
              onClick={clearAll}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {hasFilter ? (
                <>
                  <p>No overrides found in this date range</p>
                  <p className="text-xs mt-1">Try adjusting the date filters or clear them to see all records</p>
                </>
              ) : (
                <>
                  <p>No allergy overrides recorded</p>
                  <p className="text-xs mt-1">Overrides will appear here when a pharmacist dispenses or prescribes despite allergy warnings</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => (
                <div
                  key={entry.id}
                  className={cn(
                    "border rounded-lg p-4 space-y-2",
                    entry.severity === 'critical'
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-warning/30 bg-warning/5"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs",
                        entry.severity === 'critical'
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-warning text-warning-foreground"
                      )}>
                        {entry.severity === 'critical' ? 'CONTRAINDICATED' : 'CROSS-REACTIVITY'}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {entry.action}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {entry.prescriptionId}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>Patient: <strong className="text-foreground">{entry.patientName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>By: <strong className="text-foreground">{entry.pharmacistName}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Pill className="h-3 w-3 shrink-0" />
                    <span>Medications: {entry.medications.join(', ')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>Allergies: {entry.allergies.join(', ')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{format(entry.timestamp, 'MMM d, yyyy · h:mm:ss a')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
