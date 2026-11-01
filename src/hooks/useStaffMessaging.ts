import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StaffChannel {
  id: string;
  name: string;
  type: 'role' | 'direct';
  role_pair: string | null;
  created_at: string;
  created_by: string | null;
  unread_count?: number;
  last_message?: StaffMessage | null;
}

export interface StaffMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

// Demo sessions use non-UUID ids (e.g. "USR-001"); querying live tables with
// them produces 400s because the columns are typed as uuid.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Allowed role-based channel pairs
const ROLE_CHANNELS = [
  { pair: 'physician,pharmacist', name: 'Physician ↔ Pharmacist' },
  { pair: 'physician,lab_technician', name: 'Physician ↔ Lab Tech' },
  { pair: 'physician,radiologist', name: 'Physician ↔ Radiology' },
  { pair: 'pharmacist,lab_technician', name: 'Pharmacist ↔ Lab Tech' },
];

export function useStaffMessaging(userId: string | undefined, userRole: string | undefined) {
  const [channels, setChannels] = useState<StaffChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get channels the user should have access to based on role
  const allowedPairs = ROLE_CHANNELS.filter(ch => {
    const roles = ch.pair.split(',');
    return roles.includes(userRole || '');
  });

  // Initialize: ensure role channels exist and user is a member
  const initializeChannels = useCallback(async () => {
    if (!userId || !userRole || !UUID_RE.test(userId)) return;
    setLoading(true);

    try {
      for (const ch of allowedPairs) {
        // Check if channel exists
        const { data: existing } = await supabase
          .from('staff_channels')
          .select('id')
          .eq('type', 'role')
          .eq('role_pair', ch.pair)
          .maybeSingle();

        let channelId: string;

        if (existing) {
          channelId = existing.id;
        } else {
          // Create channel
          const { data: created, error } = await supabase
            .from('staff_channels')
            .insert({ name: ch.name, type: 'role', role_pair: ch.pair, created_by: userId })
            .select('id')
            .single();
          if (error || !created) continue;
          channelId = created.id;
        }

        // Ensure membership
        await supabase
          .from('channel_members')
          .upsert({ channel_id: channelId, user_id: userId }, { onConflict: 'channel_id,user_id' });
      }

      await fetchChannels();
    } catch (err) {
      console.error('Error initializing channels:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  const fetchChannels = useCallback(async () => {
    if (!userId || !UUID_RE.test(userId)) return;

    const { data: memberships } = await supabase
      .from('channel_members')
      .select('channel_id, last_read_at')
      .eq('user_id', userId);

    if (!memberships || memberships.length === 0) {
      setChannels([]);
      return;
    }

    const channelIds = memberships.map(m => m.channel_id);
    const lastReadMap = new Map(memberships.map(m => [m.channel_id, m.last_read_at]));

    const { data: channelData } = await supabase
      .from('staff_channels')
      .select('*')
      .in('id', channelIds);

    if (!channelData) return;

    // Get last message and unread count for each channel
    const enriched: StaffChannel[] = await Promise.all(
      channelData.map(async (ch) => {
        const lastRead = lastReadMap.get(ch.id) || ch.created_at;

        const { count } = await supabase
          .from('staff_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', ch.id)
          .gt('created_at', lastRead);

        const { data: lastMsg } = await supabase
          .from('staff_messages')
          .select('*')
          .eq('channel_id', ch.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...ch,
          unread_count: count || 0,
          last_message: lastMsg,
        } as StaffChannel;
      })
    );

    enriched.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setChannels(enriched);
    setTotalUnread(enriched.reduce((sum, ch) => sum + (ch.unread_count || 0), 0));
  }, [userId]);

  const fetchMessages = useCallback(async (channelId: string) => {
    const { data } = await supabase
      .from('staff_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      // Enrich with sender names from profiles
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', senderIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      setMessages(data.map(m => ({
        ...m,
        sender_name: nameMap.get(m.sender_id) || 'Unknown User',
      })));
    }
  }, []);

  const selectChannel = useCallback(async (channelId: string) => {
    setActiveChannelId(channelId);
    await fetchMessages(channelId);

    // Mark as read
    if (userId) {
      await supabase
        .from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', userId);
    }

    // Update local unread
    setChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, unread_count: 0 } : ch
    ));
    setTotalUnread(prev => {
      const ch = channels.find(c => c.id === channelId);
      return Math.max(0, prev - (ch?.unread_count || 0));
    });
  }, [userId, fetchMessages, channels]);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeChannelId || !userId || !content.trim()) return;

    const { error } = await supabase
      .from('staff_messages')
      .insert({
        channel_id: activeChannelId,
        sender_id: userId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return;
    }
  }, [activeChannelId, userId]);

  // Start or resume a direct message channel with another user
  const startDirectMessage = useCallback(async (targetUserId: string, targetName: string): Promise<string | null> => {
    if (!userId) return null;

    // Build a deterministic role_pair for DM lookup (sorted user IDs)
    const dmPair = [userId, targetUserId].sort().join(',');

    // Check if DM channel already exists
    const { data: existing } = await supabase
      .from('staff_channels')
      .select('id')
      .eq('type', 'direct')
      .eq('role_pair', dmPair)
      .maybeSingle();

    if (existing) {
      await selectChannel(existing.id);
      return existing.id;
    }

    // Get current user name for channel display
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle();

    const myName = myProfile?.full_name || 'User';
    const channelName = `${myName} ↔ ${targetName}`;

    // Create new DM channel
    const { data: created, error } = await supabase
      .from('staff_channels')
      .insert({
        name: channelName,
        type: 'direct',
        role_pair: dmPair,
        created_by: userId,
      })
      .select('id')
      .single();

    if (error || !created) {
      console.error('Error creating DM channel:', error);
      return null;
    }

    // Add both users as members
    await supabase
      .from('channel_members')
      .insert([
        { channel_id: created.id, user_id: userId },
        { channel_id: created.id, user_id: targetUserId },
      ]);

    await fetchChannels();
    await selectChannel(created.id);
    return created.id;
  }, [userId, selectChannel, fetchChannels]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    subscriptionRef.current = supabase
      .channel('staff-messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_messages' },
        async (payload) => {
          const newMsg = payload.new as StaffMessage;

          // Enrich with sender name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', newMsg.sender_id)
            .maybeSingle();

          const enrichedMsg = {
            ...newMsg,
            sender_name: profile?.full_name || 'Unknown User',
          };

          if (newMsg.channel_id === activeChannelId) {
            setMessages(prev => [...prev, enrichedMsg]);
            // Mark as read immediately
            await supabase
              .from('channel_members')
              .update({ last_read_at: new Date().toISOString() })
              .eq('channel_id', newMsg.channel_id)
              .eq('user_id', userId);
          } else if (newMsg.sender_id !== userId) {
            // Increment unread for other channels
            setChannels(prev => prev.map(ch =>
              ch.id === newMsg.channel_id
                ? { ...ch, unread_count: (ch.unread_count || 0) + 1, last_message: enrichedMsg }
                : ch
            ));
            setTotalUnread(prev => prev + 1);
          }

          // Update last message in channel list
          setChannels(prev => prev.map(ch =>
            ch.id === newMsg.channel_id
              ? { ...ch, last_message: enrichedMsg }
              : ch
          ));
        }
      )
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [userId, activeChannelId]);

  // Initialize on mount
  useEffect(() => {
    initializeChannels();
  }, [initializeChannels]);

  return {
    channels,
    activeChannelId,
    messages,
    loading,
    totalUnread,
    selectChannel,
    sendMessage,
    startDirectMessage,
    fetchChannels,
  };
}
