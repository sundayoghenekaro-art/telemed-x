import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChannelList } from './ChannelList';
import { MessageThread } from './MessageThread';
import { NewDirectMessageDialog } from './NewDirectMessageDialog';
import { StaffChannel, StaffMessage } from '@/hooks/useStaffMessaging';

interface ChatPanelProps {
  channels: StaffChannel[];
  activeChannelId: string | null;
  messages: StaffMessage[];
  currentUserId: string;
  totalUnread: number;
  onSelectChannel: (id: string) => void;
  onSendMessage: (content: string) => void;
  onStartDM: (targetUserId: string, targetName: string) => Promise<string | null>;
  onTyping?: () => void;
  typingText?: string | null;
  getMessageStatus?: (createdAt: string) => 'sent' | 'read';
}

export function ChatPanel({
  channels,
  activeChannelId,
  messages,
  currentUserId,
  totalUnread,
  onSelectChannel,
  onSendMessage,
  onStartDM,
  onTyping,
  typingText,
  getMessageStatus,
}: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [viewingChannel, setViewingChannel] = useState(false);
  const activeChannel = channels.find(ch => ch.id === activeChannelId);

  const handleSelectChannel = (id: string) => {
    onSelectChannel(id);
    setViewingChannel(true);
  };

  const handleBack = () => {
    setViewingChannel(false);
  };

  const handleStartDM = async (targetUserId: string, targetName: string) => {
    const id = await onStartDM(targetUserId, targetName);
    if (id) setViewingChannel(true);
    return id;
  };

  return (
    <>
      {/* Floating button */}
      <Button
        size="icon"
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
          open && 'hidden'
        )}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-6 w-6" />
        {totalUnread > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 h-5 min-w-[20px]">
            {totalUnread}
          </Badge>
        )}
      </Button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-[380px] h-[min(520px,calc(100vh-6rem))] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2">
              {viewingChannel && activeChannel && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleBack}>
                  ←
                </Button>
              )}
              <h3 className="font-semibold text-sm">
                {viewingChannel && activeChannel ? activeChannel.name : 'Messages'}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {!viewingChannel && (
                <NewDirectMessageDialog
                  currentUserId={currentUserId}
                  onStartDM={handleStartDM}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  }
                />
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!viewingChannel ? (
              <div className="h-full overflow-y-auto p-2">
                <ChannelList
                  channels={channels}
                  activeChannelId={activeChannelId}
                  onSelectChannel={handleSelectChannel}
                />
              </div>
            ) : activeChannel ? (
              <MessageThread
                messages={messages}
                currentUserId={currentUserId}
                channelName={activeChannel.name}
                onSend={onSendMessage}
                onTyping={onTyping}
                typingText={typingText}
                getMessageStatus={getMessageStatus}
              />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
