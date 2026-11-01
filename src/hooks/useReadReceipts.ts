import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MemberReadStatus {
  userId: string;
  lastReadAt: string;
}

/**
 * Tracks other channel members' last_read_at to determine
 * whether sent messages have been read.
 */
export function useReadReceipts(channelId: string | null, currentUserId: string | undefined) {
  const [memberReads, setMemberReads] = useState<MemberReadStatus[]>([]);

  const fetchReadStatuses = useCallback(async () => {
    if (!channelId || !currentUserId) return;

    const { data } = await supabase
      .from('channel_members')
      .select('user_id, last_read_at')
      .eq('channel_id', channelId)
      .neq('user_id', currentUserId);

    if (data) {
      setMemberReads(data.map(d => ({ userId: d.user_id, lastReadAt: d.last_read_at })));
    }
  }, [channelId, currentUserId]);

  // Fetch on channel change
  useEffect(() => {
    fetchReadStatuses();
  }, [fetchReadStatuses]);

  // Subscribe to membership updates for read status changes
  useEffect(() => {
    if (!channelId || !currentUserId) return;

    const channel = supabase
      .channel(`read-receipts:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'channel_members', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const updated = payload.new as { user_id: string; last_read_at: string };
          if (updated.user_id === currentUserId) return;

          setMemberReads(prev => {
            const exists = prev.find(m => m.userId === updated.user_id);
            if (exists) {
              return prev.map(m =>
                m.userId === updated.user_id
                  ? { ...m, lastReadAt: updated.last_read_at }
                  : m
              );
            }
            return [...prev, { userId: updated.user_id, lastReadAt: updated.last_read_at }];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [channelId, currentUserId]);

  /**
   * Check if a message (by its created_at) has been read by all other members.
   * Returns: 'sent' | 'delivered' | 'read'
   */
  const getMessageStatus = useCallback((messageCreatedAt: string): 'sent' | 'read' => {
    if (memberReads.length === 0) return 'sent';

    const msgTime = new Date(messageCreatedAt).getTime();
    const allRead = memberReads.every(m => new Date(m.lastReadAt).getTime() >= msgTime);

    return allRead ? 'read' : 'sent';
  }, [memberReads]);

  return { getMessageStatus, refetchReads: fetchReadStatuses };
}
