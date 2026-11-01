import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  session_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'doctor' | 'patient';
  content: string;
  message_type: 'text' | 'system' | 'prescription';
  created_at: string;
}

interface SessionChatProps {
  sessionId: string;
  currentUserId: string;
  currentUserName: string;
  currentRole: 'doctor' | 'patient';
}

export function SessionChat({ sessionId, currentUserId, currentUserName, currentRole }: SessionChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing messages
    const loadMessages = async () => {
      const { data } = await supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    loadMessages();

    // Subscribe to realtime
    const channel = supabase
      .channel(`session-chat-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from('session_messages').insert({
      session_id: sessionId,
      sender_id: currentUserId,
      sender_name: currentUserName,
      sender_role: currentRole,
      content: newMessage.trim(),
      message_type: 'text',
    });
    if (!error) setNewMessage('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No messages yet. Start the conversation!
            </div>
          )}
          {messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            const isSystem = msg.message_type === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                    <Bot className="h-3 w-3" /> {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwn && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs font-medium text-foreground">{msg.sender_name}</span>
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                        {msg.sender_role}
                      </Badge>
                    </div>
                  )}
                  <div className={`px-4 py-2 rounded-2xl text-sm ${
                    msg.message_type === 'prescription'
                      ? 'bg-primary/10 border border-primary/30 text-foreground'
                      : isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-muted-foreground px-1">
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3 flex gap-2">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={sending}
        />
        <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
