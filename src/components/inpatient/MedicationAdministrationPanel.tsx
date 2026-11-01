import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlarmClock,
  Barcode,
  CheckCircle2,
  CircleSlash,
  Pill,
  ScanLine,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MedAdminStatus, MedicationAdministration, mockMedicationAdministrations } from '@/data/capabilityMockData';
import { cn } from '@/lib/utils';

interface MedicationAdministrationPanelProps {
  canAdminister?: boolean;
  clinicianName?: string;
}

const STATUS_STYLE: Record<MedAdminStatus, string> = {
  due: 'bg-warning/10 text-warning border-warning/30',
  given: 'bg-success/10 text-success border-success/30',
  held: 'bg-info/10 text-info border-info/30',
  refused: 'bg-destructive/10 text-destructive border-destructive/30',
};

const ROUTE_LABEL: Record<MedicationAdministration['route'], string> = {
  oral: 'Oral',
  iv: 'IV',
  im: 'IM',
  sc: 'Subcutaneous',
  topical: 'Topical',
  inhalation: 'Inhalation',
};

export function MedicationAdministrationPanel({
  canAdminister = false,
  clinicianName = 'Ward nurse',
}: MedicationAdministrationPanelProps) {
  const [administrations, setAdministrations] = useState<MedicationAdministration[]>(
    mockMedicationAdministrations,
  );
  const [wardFilter, setWardFilter] = useState('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState('');
  const [scanVerified, setScanVerified] = useState(false);
  const [outcome, setOutcome] = useState<Exclude<MedAdminStatus, 'due'>>('given');
  const [note, setNote] = useState('');

  const wards = useMemo(
    () => [...new Set(administrations.map((entry) => entry.ward))].sort(),
    [administrations],
  );

  const visible = administrations
    .filter((entry) => wardFilter === 'all' || entry.ward === wardFilter)
    .sort((a, b) => {
      if (a.status === 'due' && b.status !== 'due') return -1;
      if (a.status !== 'due' && b.status === 'due') return 1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

  const dueCount = administrations.filter((entry) => entry.status === 'due').length;
  const givenCount = administrations.filter((entry) => entry.status === 'given').length;
  const heldCount = administrations.filter((entry) => entry.status === 'held').length;
  const refusedCount = administrations.filter((entry) => entry.status === 'refused').length;

  const active = administrations.find((entry) => entry.id === activeId);

  const openDialog = (entry: MedicationAdministration) => {
    setActiveId(entry.id);
    setScannedCode('');
    setScanVerified(false);
    setOutcome('given');
    setNote('');
  };

  const verifyScan = () => {
    if (!active) return;
    if (scannedCode.trim().toUpperCase() === active.barcode) {
      setScanVerified(true);
      toast.success('Barcode match', { description: `${active.medication} ${active.dose} matched to ${active.patientName}.` });
    } else {
      setScanVerified(false);
      toast.error('Barcode mismatch', { description: 'Scan the medication label again before administering.' });
    }
  };

  const submit = () => {
    if (!active) return;
    if (outcome === 'given' && !scanVerified) {
      toast.error('Scan the medication barcode first');
      return;
    }
    if (outcome !== 'given' && !note.trim()) {
      toast.error('A reason is required to hold or refuse');
      return;
    }
    setAdministrations((prev) =>
      prev.map((entry) =>
        entry.id === active.id
          ? {
              ...entry,
              status: outcome,
              administeredBy: clinicianName,
              administeredAt: new Date().toISOString(),
              note: note.trim() || entry.note,
            }
          : entry,
      ),
    );
    setActiveId(null);
    toast.success(
      outcome === 'given' ? 'Administration recorded' : outcome === 'held' ? 'Dose held' : 'Refusal recorded',
      { description: `${active.patientName} · ${active.medication} ${active.dose} · ${ROUTE_LABEL[active.route]}` },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Pill className="h-5 w-5 text-primary" />
            Closed-loop medication administration
          </h2>
          <p className="text-sm text-muted-foreground">
            Wristband and medication barcode checks before every dose
          </p>
        </div>
        <Select value={wardFilter} onValueChange={setWardFilter}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All wards</SelectItem>
            {wards.map((ward) => (
              <SelectItem key={ward} value={ward}>{ward}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Due now', value: dueCount, icon: AlarmClock, tone: 'text-warning' },
          { label: 'Given', value: givenCount, icon: CheckCircle2, tone: 'text-success' },
          { label: 'Held', value: heldCount, icon: Undo2, tone: 'text-info' },
          { label: 'Refused', value: refusedCount, icon: CircleSlash, tone: 'text-destructive' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-4">
              <stat.icon className={cn('h-5 w-5', stat.tone)} />
              <div>
                <p className="text-xl font-bold leading-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Dose queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {visible.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No orders for this ward.</p>
          )}
          {visible.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {entry.patientName}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      · {entry.ward} {entry.bed}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.medication} {entry.dose} · {ROUTE_LABEL[entry.route]} · due{' '}
                    {format(new Date(entry.dueAt), 'dd MMM HH:mm')}
                  </p>
                  {entry.administeredBy && (
                    <p className="text-[11px] text-muted-foreground">
                      {entry.status === 'given' ? 'Given' : entry.status === 'held' ? 'Held' : 'Refused'} by{' '}
                      {entry.administeredBy}
                      {entry.administeredAt ? ` at ${format(new Date(entry.administeredAt), 'HH:mm')}` : ''}
                    </p>
                  )}
                  {entry.note && <p className="mt-0.5 text-[11px] text-muted-foreground">{entry.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLE[entry.status])}>
                    {entry.status}
                  </span>
                  {canAdminister && entry.status === 'due' && (
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => openDialog(entry)}>
                      <ScanLine className="mr-1 h-3 w-3" /> Administer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActiveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Administer medication</DialogTitle>
            <DialogDescription>
              {active?.patientName} · {active?.medication} {active?.dose} · {active ? ROUTE_LABEL[active.route] : ''}
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Barcode className="h-3.5 w-3.5" /> Expected barcode
                </p>
                <p className="font-mono text-sm font-semibold tracking-wide">{active.barcode}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Wristband: {active.patientUpid} · Bed {active.bed}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="scan-code">
                  Scan medication label
                </label>
                <div className="flex gap-2">
                  <Input
                    id="scan-code"
                    value={scannedCode}
                    onChange={(event) => {
                      setScannedCode(event.target.value);
                      setScanVerified(false);
                    }}
                    placeholder="Point the scanner or type the code"
                    className="font-mono"
                  />
                  <Button variant="outline" onClick={verifyScan} disabled={!scannedCode.trim()}>
                    <ShieldCheck className="mr-1 h-4 w-4" /> Verify
                  </Button>
                </div>
                {scanVerified && (
                  <p className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Barcode verified against the order
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="admin-outcome">Outcome</label>
                  <Select value={outcome} onValueChange={(value) => setOutcome(value as Exclude<MedAdminStatus, 'due'>)}>
                    <SelectTrigger id="admin-outcome"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="given">Given</SelectItem>
                      <SelectItem value="held">Held</SelectItem>
                      <SelectItem value="refused">Refused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="admin-note">
                    Note {outcome !== 'given' && <span className="text-destructive">*</span>}
                  </label>
                  <Input
                    id="admin-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={outcome === 'given' ? 'Optional' : 'Reason required'}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This action is written to the medication administration record and audit log, signed by{' '}
                <span className="font-medium text-foreground">{clinicianName}</span>.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveId(null)}>Cancel</Button>
            <Button onClick={submit} disabled={outcome === 'given' && !scanVerified}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
