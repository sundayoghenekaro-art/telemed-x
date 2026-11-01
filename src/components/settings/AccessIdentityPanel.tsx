import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Accessibility,
  Fingerprint,
  KeyRound,
  Link2,
  Link2Off,
  MonitorSmartphone,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  IdpProvider,
  accessibilityChecklist,
  mockIdpProviders,
  mockMfaPolicy,
} from '@/data/europeMockData';
import { cn } from '@/lib/utils';

const COMFORT_KEY = 'trika-comfort-mode';

const IDP_STYLE: Record<IdpProvider['status'], string> = {
  connected: 'bg-success/10 text-success border-success/30',
  configured: 'bg-info/10 text-info border-info/30',
  'not-configured': 'bg-muted text-muted-foreground border-border',
};

const CHECK_STYLE: Record<string, string> = {
  pass: 'bg-success/10 text-success border-success/30',
  partial: 'bg-warning/10 text-warning border-warning/30',
  gap: 'bg-destructive/10 text-destructive border-destructive/30',
};

const CHECK_LABEL: Record<string, string> = {
  pass: 'Pass',
  partial: 'Partial',
  gap: 'Gap',
};

export function AccessIdentityPanel({ canManage = false }: { canManage?: boolean }) {
  const [providers, setProviders] = useState<IdpProvider[]>(mockIdpProviders);
  const [comfortMode, setComfortMode] = useState(() => {
    try {
      return localStorage.getItem(COMFORT_KEY) === 'on';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (comfortMode) {
      root.style.fontSize = '18px';
      try {
        localStorage.setItem(COMFORT_KEY, 'on');
      } catch {
        // storage can be unavailable in private browsing
      }
    } else {
      root.style.fontSize = '';
      try {
        localStorage.removeItem(COMFORT_KEY);
      } catch {
        // ignore
      }
    }
  }, [comfortMode]);

  const toggleProvider = (entry: IdpProvider) => {
    const next: Record<IdpProvider['status'], IdpProvider['status']> = {
      'not-configured': 'configured',
      configured: 'connected',
      connected: 'configured',
    };
    const status = next[entry.status];
    setProviders((prev) =>
      prev.map((item) =>
        item.id === entry.id
          ? { ...item, status, lastSync: status === 'connected' ? new Date().toISOString() : null }
          : item,
      ),
    );
    toast.success(
      status === 'connected' ? `${entry.name} connected` : status === 'configured' ? `${entry.name} configured` : `${entry.name} disconnected`,
      { description: `${entry.country} · ${entry.protocol}` },
    );
  };

  const actionLabel = (status: IdpProvider['status']) =>
    status === 'not-configured' ? 'Configure' : status === 'configured' ? 'Connect' : 'Disconnect';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Fingerprint className="h-5 w-5 text-primary" />
          Access, identity &amp; accessibility
        </h2>
        <p className="text-sm text-muted-foreground">
          eIDAS identity providers, multi-factor policy and the accessibility conformance checklist
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{providers.filter((entry) => entry.status === 'connected').length}</p>
            <p className="text-xs text-muted-foreground">Identity providers connected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight">{mockMfaPolicy.filter((entry) => entry.enforcement === 'required').length}</p>
            <p className="text-xs text-muted-foreground">Roles with mandatory MFA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold leading-tight text-success">{accessibilityChecklist.filter((entry) => entry.status === 'pass').length}</p>
            <p className="text-xs text-muted-foreground">Accessibility checks passing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className={cn('text-xl font-bold leading-tight', comfortMode ? 'text-primary' : 'text-muted-foreground')}>
              {comfortMode ? 'On' : 'Off'}
            </p>
            <p className="text-xs text-muted-foreground">Comfort mode</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="idp">
        <TabsList>
          <TabsTrigger value="idp" className="gap-2">
            <KeyRound className="h-4 w-4" /> Identity providers
          </TabsTrigger>
          <TabsTrigger value="mfa" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> MFA policy
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="gap-2">
            <Accessibility className="h-4 w-4" /> Accessibility
          </TabsTrigger>
        </TabsList>

        <TabsContent value="idp" className="mt-4 space-y-2">
          {providers.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {entry.name}
                    <span className="ml-1.5 font-normal text-muted-foreground">· {entry.country}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.protocol}
                    {entry.lastSync && ` · last successful authentication ${new Date(entry.lastSync).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', IDP_STYLE[entry.status])}>
                    {entry.status.replace('-', ' ')}
                  </span>
                  <Button
                    size="sm"
                    variant={entry.status === 'connected' ? 'outline' : 'default'}
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={!canManage}
                    onClick={() => toggleProvider(entry)}
                  >
                    {entry.status === 'connected' ? <Link2Off className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                    {actionLabel(entry.status)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Cross-border authentication uses the eIDAS node; national providers such as itsme®, BankID and BundID are configured per market.
          </p>
        </TabsContent>

        <TabsContent value="mfa" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Role</th>
                      <th className="py-2 pr-3 font-medium">Allowed methods</th>
                      <th className="py-2 text-right font-medium">Enforcement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockMfaPolicy.map((entry) => (
                      <tr key={entry.role} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3 font-medium">{entry.role}</td>
                        <td className="py-2 pr-3 text-xs">{entry.method}</td>
                        <td className="py-2 text-right">
                          <Badge variant={entry.enforcement === 'required' ? 'destructive' : 'outline'} className="text-[10px]">
                            {entry.enforcement}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MonitorSmartphone className="h-3 w-3" />
                Passkeys are preferred; TOTP is the fallback for shared clinical workstations.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="mt-4 space-y-3">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Comfort mode</p>
                  <p className="text-[11px] text-muted-foreground">
                    Increases the base text size to 112.5% for patients and staff who need larger type.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={comfortMode ? 'default' : 'outline'}
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setComfortMode((prev) => !prev)}
                >
                  <Accessibility className="h-3.5 w-3.5" />
                  {comfortMode ? 'Disable comfort mode' : 'Enable comfort mode'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 pt-4">
              {accessibilityChecklist.map((entry) => (
                <div key={entry.item} className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 text-sm last:border-0 last:pb-0">
                  <span>{entry.item}</span>
                  <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', CHECK_STYLE[entry.status])}>
                    {CHECK_LABEL[entry.status]}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          <p className="text-[11px] text-muted-foreground">
            Checklist reflects WCAG 2.2 AA and the European Accessibility Act. Comfort mode persists on this browser only.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
