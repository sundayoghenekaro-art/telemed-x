import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  userId: string;
  userName: string;
}

export function useTypingIndicator(
  channelId: string | null,
  userId: string | undefined,
  userName: string
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!channelId || !userId) return;

    // Clean up previous channel
    channelRef.current?.unsubscribe();
    setTypingUsers([]);
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current.clear();

    const channel = supabase.channel(`typing:${channelId}`);

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === userId) return;

        const user: TypingUser = { userId: payload.userId, userName: payload.userName };

        setTypingUsers(prev => {
          const exists = prev.some(u => u.userId === user.userId);
          return exists ? prev : [...prev, user];
        });

        // Clear existing timeout for this user
        const existing = timeoutsRef.current.get(user.userId);
        if (existing) clearTimeout(existing);

        // Remove after 3 seconds of no typing
        const timeout = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== user.userId));
          timeoutsRef.current.delete(user.userId);
        }, 3000);

        timeoutsRef.current.set(user.userId, timeout);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, [channelId, userId]);

  const sendTyping = useCallback(() => {
    if (!channelId || !userId) return;

    // Throttle to once per second
    const now = Date.now();
    if (now - lastSentRef.current < 1000) return;
    lastSentRef.current = now;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, userName },
    });
  }, [channelId, userId, userName]);

  const typingText = typingUsers.length === 0
    ? null
    : typingUsers.length === 1
      ? `${typingUsers[0].userName} is typing…`
      : typingUsers.length === 2
        ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing…`
        : `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing…`;

  return { typingUsers, typingText, sendTyping };
}
