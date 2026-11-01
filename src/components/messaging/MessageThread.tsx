import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StaffMessage } from '@/hooks/useStaffMessaging';
import { format } from 'date-fns';

interface MessageThreadProps {
  messages: StaffMessage[];
  currentUserId: string;
  channelName: string;
  onSend: (content: string) => void;
  onTyping?: () => void;
  typingText?: string | null;
  getMessageStatus?: (createdAt: string) => 'sent' | 'read';
}

export function MessageThread({
  messages,
  currentUserId,
  channelName,
  onSend,
  onTyping,
  typingText,
  getMessageStatus,
}: MessageThreadProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    onTyping?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <h3 className="font-semibold text-sm">{channelName}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          const status = isMine && getMessageStatus ? getMessageStatus(msg.created_at) : null;
          return (
            <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] rounded-2xl px-4 py-2.5',
                isMine
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              )}>
                {!isMine && (
                  <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name}</p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <div className={cn(
                  'flex items-center gap-1 mt-1 justify-end',
                  isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                )}>
                  <span className="text-[10px]">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                  {status === 'read' && (
                    <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/80" />
                  )}
                  {status === 'sent' && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingText && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs">{typingText}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type a message…"
            className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
