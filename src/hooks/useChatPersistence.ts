import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Message = { role: 'user' | 'assistant'; content: string };

interface Conversation {
  id: string;
  title: string;
  patient_upid: string | null;
  patient_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useChatPersistence() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Failed to load conversations:', error);
      return;
    }
    setConversations(data || []);
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for a conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Failed to load messages:', error);
      setLoading(false);
      return;
    }
    setMessages((data || []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    setActiveConversationId(conversationId);
    setLoading(false);
  }, []);

  // Create a new conversation
  const createConversation = useCallback(async (patientUpid?: string | null, patientName?: string | null): Promise<string | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('ai_chat_conversations')
      .insert({ user_id: userId, patient_upid: patientUpid || null, patient_name: patientName || null })
      .select()
      .single();
    if (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
    setActiveConversationId(data.id);
    setMessages([]);
    await loadConversations();
    return data.id;
  }, [userId, loadConversations]);

  // Save a message pair (user + assistant)
  const saveMessages = useCallback(async (conversationId: string, userContent: string, assistantContent: string) => {
    if (!userId) return;

    const rows = [
      { conversation_id: conversationId, role: 'user' as const, content: userContent },
      { conversation_id: conversationId, role: 'assistant' as const, content: assistantContent },
    ];

    const { error } = await supabase.from('ai_chat_messages').insert(rows);
    if (error) {
      console.error('Failed to save messages:', error);
      return;
    }

    // Auto-title from first user message
    const conv = conversations.find(c => c.id === conversationId);
    if (conv && conv.title === 'New Conversation') {
      const title = userContent.length > 60 ? userContent.slice(0, 57) + '…' : userContent;
      await supabase.from('ai_chat_conversations').update({ title }).eq('id', conversationId);
    } else {
      // Touch updated_at
      await supabase.from('ai_chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    }

    await loadConversations();
  }, [userId, conversations, loadConversations]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    const { error } = await supabase.from('ai_chat_conversations').delete().eq('id', conversationId);
    if (error) {
      toast.error('Failed to delete conversation');
      return;
    }
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
    await loadConversations();
  }, [activeConversationId, loadConversations]);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  return {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    userId,
    loading,
    loadConversation,
    createConversation,
    saveMessages,
    deleteConversation,
    startNewChat,
  };
}
