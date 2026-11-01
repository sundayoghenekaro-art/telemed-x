import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { ChannelList } from './ChannelList';
import { MessageThread } from './MessageThread';
import { MessageSearch } from './MessageSearch';
import { NewDirectMessageDialog } from './NewDirectMessageDialog';
import { StaffChannel, StaffMessage } from '@/hooks/useStaffMessaging';

interface MessagesPageProps {
  channels: StaffChannel[];
  activeChannelId: string | null;
  messages: StaffMessage[];
  currentUserId: string;
  loading: boolean;
  onSelectChannel: (id: string) => void;
  onSendMessage: (content: string) => void;
  onStartDM: (targetUserId: string, targetName: string) => Promise<string | null>;
  onTyping?: () => void;
  typingText?: string | null;
  getMessageStatus?: (createdAt: string) => 'sent' | 'read';
}

export function MessagesPage({
  channels,
  activeChannelId,
  messages,
  currentUserId,
  loading,
  onSelectChannel,
  onSendMessage,
  onStartDM,
  onTyping,
  typingText,
  getMessageStatus,
}: MessagesPageProps) {
  const activeChannel = channels.find(ch => ch.id === activeChannelId);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Internal staff communication channels</p>
        </div>
        <NewDirectMessageDialog currentUserId={currentUserId} onStartDM={onStartDM} />
      </div>

      <MessageSearch onSelectResult={onSelectChannel} />

      <Card className="flex h-[calc(100vh-220px)] overflow-hidden">
        {/* Channel sidebar */}
        <div className="w-72 border-r border-border flex flex-col bg-card shrink-0">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Channels</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <ChannelList
                channels={channels}
                activeChannelId={activeChannelId}
                onSelectChannel={onSelectChannel}
              />
            )}
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeChannel ? (
            <MessageThread
              messages={messages}
              currentUserId={currentUserId}
              channelName={activeChannel.name}
              onSend={onSendMessage}
              onTyping={onTyping}
              typingText={typingText}
              getMessageStatus={getMessageStatus}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageSquare className="h-12 w-12 opacity-30" />
              <p className="text-sm">Select a channel to start messaging</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
