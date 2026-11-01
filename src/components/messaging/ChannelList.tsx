import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageSquare, User, Users } from 'lucide-react';
import { StaffChannel } from '@/hooks/useStaffMessaging';
import { formatDistanceToNow } from 'date-fns';

interface ChannelListProps {
  channels: StaffChannel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
}

export function ChannelList({ channels, activeChannelId, onSelectChannel }: ChannelListProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
        <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
        <p>No channels available</p>
      </div>
    );
  }

  const roleChannels = channels.filter(ch => ch.type === 'role');
  const dmChannels = channels.filter(ch => ch.type === 'direct');

  const renderChannel = (ch: StaffChannel) => {
    const isActive = ch.id === activeChannelId;
    const isDM = ch.type === 'direct';
    const lastTime = ch.last_message?.created_at
      ? formatDistanceToNow(new Date(ch.last_message.created_at), { addSuffix: true })
      : null;

    return (
      <button
        key={ch.id}
        onClick={() => onSelectChannel(ch.id)}
        className={cn(
          'w-full text-left px-3 py-3 rounded-lg transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted text-foreground'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isDM ? (
              <User className="h-3.5 w-3.5 shrink-0 opacity-50" />
            ) : (
              <Users className="h-3.5 w-3.5 shrink-0 opacity-50" />
            )}
            <span className="font-medium text-sm truncate">{ch.name}</span>
          </div>
          {(ch.unread_count || 0) > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
              {ch.unread_count}
            </Badge>
          )}
        </div>
        {ch.last_message && (
          <div className="flex items-center justify-between mt-1 gap-2 pl-5.5">
            <p className="text-xs text-muted-foreground truncate flex-1">
              {ch.last_message.content}
            </p>
            {lastTime && (
              <span className="text-[10px] text-muted-foreground shrink-0">{lastTime}</span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {roleChannels.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">Channels</p>
          <div className="space-y-0.5">
            {roleChannels.map(renderChannel)}
          </div>
        </div>
      )}
      {dmChannels.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">Direct Messages</p>
          <div className="space-y-0.5">
            {dmChannels.map(renderChannel)}
          </div>
        </div>
      )}
    </div>
  );
}
