import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Banknote,
  ClipboardCheck,
  Download,
  PackageSearch,
  Radio,
  ScanLine,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  mockPharmacovigilanceCases,
  mockReferencePricing,
  mockShortages,
  mockUdiDevices,
} from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
});

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  serious: 'bg-destructive/10 text-destructive border-destructive/30',
  moderate: 'bg-warning/10 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-border',
  'non-serious': 'bg-muted text-muted-foreground border-border',
};

const SHORTAGE_STYLE: Record<string, string> = {
  reported: 'bg-destructive/10 text-destructive border-destructive/30',
  monitoring: 'bg-warning/10 text-warning border-warning/30',
  resolved: 'bg-success/10 text-success border-success/30',
};

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MedicinesSafetyPanel({ canManage = false }: { canManage?: boolean }) {
  const [shortages, setShortages] = useState(mockShortages);
  const [cases, setCases] = useState(mockPharmacovigilanceCases);

  const openShortages = useMemo(
    () => shortages.filter((entry) => entry.status !== 'resolved').length,
    [shortages],
  );
  const draftCases = cases.filter((entry) => entry.status === 'draft').length;
  const priceGaps = mockReferencePricing.filter((entry) => entry.status === 'above').length;

  const resolveShortage = (id: string) => {
    setShortages((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, status: 'resolved' } : entry)),
    );
    toast.success('Shortage resolved', {
      description: `${id} closed. The national shortage register is updated.`,
    });
  };

  const submitCase = (id: string) => {
    setCases((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, status: 'submitted' } : entry)),
    );
    toast.success('Pharmacovigilance case submitted', {
      description: `${id} transmitted to the national competent authority.`,
    });
  };

  const exportSafetyPack = () => {
    downloadJson('eu-medicines-safety-pack.json', {
      generatedAt: new Date().toISOString(),
      shortages,
      referencePricing: mockReferencePricing,
      pharmacovigilance: cases,
      devices: mockUdiDevices,
    });
    toast.success('Medicines safety pack exported', {
      description: 'Shortages, reference prices, pharmacovigilance and UDI records in one JSON file.',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="h-5 w-5 text-primary" />
            EU medicines safety
          </h2>
          <p className="text-sm text-muted-foreground">
            Shortage reporting, reference pricing, pharmacovigilance and device traceability
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportSafetyPack}>
          <Download className="h-4 w-4" /> Export safety pack
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-destructive">{openShortages}</p>
            <p className="text-xs text-muted-foreground">Open shortages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-warning">{priceGaps}</p>
            <p className="text-xs text-muted-foreground">Products above reference</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{cases.length}</p>
            <p className="text-xs text-muted-foreground">Pharmacovigilance cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{mockUdiDevices.length}</p>
            <p className="text-xs text-muted-foreground">Implanted devices tracked</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="shortages">
        <TabsList>
          <TabsTrigger value="shortages" className="gap-2">
            <PackageSearch className="h-4 w-4" /> Shortages
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <Banknote className="h-4 w-4" /> Reference pricing
          </TabsTrigger>
          <TabsTrigger value="pv" className="gap-2">
            <AlertTriangle className="h-4 w-4" /> Pharmacovigilance
            {draftCases > 0 && (
              <span className="ml-1 rounded-full bg-warning px-1.5 py-0.5 text-xs text-warning-foreground">{draftCases}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="udi" className="gap-2">
            <ScanLine className="h-4 w-4" /> Device register
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shortages" className="mt-4 space-y-2">
          {shortages.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {entry.medication}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {entry.id}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      ATC <span className="font-mono">{entry.atc}</span> · reported {format(new Date(entry.since), 'dd MMM yyyy')} ·
                      alternative: {entry.alternative}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', SEVERITY_STYLE[entry.severity])}>
                      {entry.severity}
                    </span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', SHORTAGE_STYLE[entry.status])}>
                      {entry.status}
                    </span>
                  </div>
                </div>
                {entry.status !== 'resolved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={!canManage}
                    onClick={() => resolveShortage(entry.id)}
                  >
                    <ClipboardCheck className="h-3 w-3" /> Mark resolved
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Medication</th>
                      <th className="py-2 pr-3 font-medium">ATC</th>
                      <th className="py-2 pr-3 text-right font-medium">Price</th>
                      <th className="py-2 pr-3 text-right font-medium">Reference</th>
                      <th className="py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockReferencePricing.map((entry) => (
                      <tr key={entry.medication} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3">{entry.medication}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{entry.atc}</td>
                        <td className="py-2 pr-3 text-right">{naira.format(entry.price)}</td>
                        <td className="py-2 pr-3 text-right">{naira.format(entry.reference)}</td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={entry.status === 'above' ? 'destructive' : 'secondary'}
                            className="text-[10px]"
                          >
                            {entry.status === 'above'
                              ? `+${naira.format(entry.price - entry.reference)}`
                              : 'within'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Products above the reference price are dispensed with the patient co-payment shown at the counter.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pv" className="mt-4 space-y-2">
          {cases.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {entry.medication}
                    <span className="ml-1.5 font-normal text-muted-foreground">· {entry.reaction}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.id} · reported {format(new Date(entry.reportedAt), 'dd MMM yyyy')} ·{' '}
                    <span className={cn(entry.severity === 'serious' ? 'text-destructive' : '')}>{entry.severity}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={entry.status === 'submitted' ? 'secondary' : 'outline'} className="text-[10px] capitalize">
                    {entry.status}
                  </Badge>
                  {entry.status === 'draft' && (
                    <Button
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={!canManage}
                      onClick={() => submitCase(entry.id)}
                    >
                      <Radio className="h-3 w-3" /> Submit to authority
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="udi" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Device</th>
                      <th className="py-2 pr-3 font-medium">UDI-DI</th>
                      <th className="py-2 pr-3 font-medium">Lot</th>
                      <th className="py-2 pr-3 font-medium">Patient</th>
                      <th className="py-2 text-right font-medium">Implanted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockUdiDevices.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3">{entry.device}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{entry.udiDi}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{entry.lot}</td>
                        <td className="py-2 pr-3">{entry.patientName}</td>
                        <td className="py-2 text-right text-xs">{format(new Date(entry.implantedAt), 'dd MMM yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Device identifiers support field safety notices and recall traceability to the implanted patient.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
