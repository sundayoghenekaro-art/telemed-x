import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Clock, Phone, MessageSquare, User } from 'lucide-react';
import { CriticalFindingNotification } from './CriticalFindingAlertDialog';
import { format, formatDistanceToNow } from 'date-fns';

interface Props {
  notifications: CriticalFindingNotification[];
  onAcknowledge: (id: string) => void;
}

const methodIcons: Record<string, React.ReactNode> = {
  phone: <Phone className="h-3.5 w-3.5" />,
  page: <MessageSquare className="h-3.5 w-3.5" />,
  'secure-message': <MessageSquare className="h-3.5 w-3.5" />,
  'in-person': <User className="h-3.5 w-3.5" />,
};

const methodLabels: Record<string, string> = {
  phone: 'Phone Call',
  page: 'Page',
  'secure-message': 'Secure Message',
  'in-person': 'In Person',
};

export function CriticalFindingsPanel({ notifications, onAcknowledge }: Props) {
  const pending = notifications.filter(n => !n.acknowledgedAt);
  const acknowledged = notifications.filter(n => n.acknowledgedAt);

  return (
    <div className="space-y-6">
      {/* Pending Acknowledgment */}
      <Card className={pending.length > 0 ? 'border-destructive/30' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Pending Acknowledgment
            </CardTitle>
            {pending.length > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                {pending.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending critical finding notifications
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map(n => (
                <div
                  key={n.id}
                  className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{n.patientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {n.modality} — {n.bodyPart}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 shrink-0">
                      CRITICAL
                    </Badge>
                  </div>

                  <p className="text-sm font-medium">{n.finding}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Radiologist: {n.radiologist}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Referring: {n.referringPhysician}
                    </div>
                    <div className="flex items-center gap-1">
                      {methodIcons[n.communicationMethod]}
                      {methodLabels[n.communicationMethod]}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(n.communicatedAt), { addSuffix: true })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Contacted: {n.communicatedTo}</span>
                      {n.readBackConfirmed && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                          Read-back ✓
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => onAcknowledge(n.id)}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Acknowledge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acknowledged */}
      {acknowledged.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Acknowledged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acknowledged.map(n => (
                <div
                  key={n.id}
                  className="border rounded-lg p-4 space-y-2 bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{n.patientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {n.modality} — {n.bodyPart}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 shrink-0">
                      Acknowledged
                    </Badge>
                  </div>
                  <p className="text-sm">{n.finding}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Communicated: {format(new Date(n.communicatedAt), 'MMM d, HH:mm')}</span>
                    <span>Acknowledged: {n.acknowledgedAt ? format(new Date(n.acknowledgedAt), 'MMM d, HH:mm') : '-'}</span>
                    <span>By: {n.acknowledgedBy || n.referringPhysician}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
