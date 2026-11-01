import { useState } from 'react';
import { Bell, BellRing, Check, CheckCheck, Trash2, BedDouble, AlertTriangle, Settings2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { BedNotification } from '@/hooks/useBedNotifications';

interface WardInfo {
  id: string;
  name: string;
}

interface BedNotificationsPanelProps {
  notifications: BedNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  subscribedWards?: Set<string>;
  allWards?: WardInfo[];
  onToggleWard?: (wardName: string) => void;
  onSubscribeAll?: () => void;
  onUnsubscribeAll?: () => void;
}

const typeConfig = {
  'critical-freed': { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  available: { icon: BedDouble, color: 'text-success', bg: 'bg-success/10' },
  'status-change': { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
};

export function BedNotificationsPanel({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  subscribedWards,
  allWards,
  onToggleWard,
  onSubscribeAll,
  onUnsubscribeAll,
}: BedNotificationsPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const hasPreferences = subscribedWards && allWards && onToggleWard;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-1.5">
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4 text-warning animate-pulse" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          Alerts
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-[10px] bg-destructive text-destructive-foreground">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="text-sm font-semibold">
            {showSettings ? 'Ward Preferences' : 'Bed Notifications'}
          </h4>
          <div className="flex gap-1">
            {!showSettings && unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onMarkAllRead}>
                <CheckCheck className="h-3 w-3" />
                Read all
              </Button>
            )}
            {!showSettings && notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={onClearAll}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            {hasPreferences && (
              <Button
                variant={showSettings ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowSettings(s => !s)}
              >
                <Settings2 className="h-3 w-3" />
                {showSettings ? 'Done' : ''}
              </Button>
            )}
          </div>
        </div>

        {showSettings && hasPreferences ? (
          <div className="p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Choose which wards trigger notifications. Unsubscribed wards are silenced.
            </p>
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={onSubscribeAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={onUnsubscribeAll}>
                Clear All
              </Button>
            </div>
            <div className="space-y-1">
              {allWards.map(ward => {
                const isCritical = ['ICU', 'CCU', 'Emergency'].includes(ward.name);
                const checked = subscribedWards.has(ward.name);
                return (
                  <label
                    key={ward.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                      checked && "bg-primary/5"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggleWard(ward.name)}
                    />
                    <span className="text-sm flex-1">{ward.name}</span>
                    {isCritical && (
                      <Badge variant="outline" className="text-[9px] py-0 h-4 border-destructive/30 text-destructive">
                        Critical
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              {subscribedWards.size}/{allWards.length} wards active
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No notifications yet</p>
                <p className="text-xs mt-1">Alerts appear when bed statuses change</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(n => {
                  const cfg = typeConfig[n.type];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => onMarkRead(n.id)}
                      className={cn(
                        "w-full text-left p-3 hover:bg-muted/50 transition-colors flex gap-3",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <div className={cn("mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", cfg.bg)}>
                        <Icon className={cn("h-4 w-4", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", !n.read && "font-medium")}>{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
