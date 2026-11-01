import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SearchResult {
  id: string;
  content: string;
  sender_name: string;
  channel_id: string;
  channel_name: string;
  created_at: string;
}

interface MessageSearchProps {
  onSelectResult: (channelId: string) => void;
}

export function MessageSearch({ onSelectResult }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    setSearched(true);

    try {
      // Search messages the user has access to (RLS handles scoping)
      const { data: messages } = await supabase
        .from('staff_messages')
        .select('id, content, sender_id, channel_id, created_at')
        .ilike('content', `%${term.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!messages || messages.length === 0) {
        setResults([]);
        return;
      }

      // Enrich with sender names and channel names
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const channelIds = [...new Set(messages.map(m => m.channel_id))];

      const [{ data: profiles }, { data: channels }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', senderIds),
        supabase.from('staff_channels').select('id, name').in('id', channelIds),
      ]);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      const channelMap = new Map(channels?.map(c => [c.id, c.name]) || []);

      setResults(messages.map(m => ({
        id: m.id,
        content: m.content,
        sender_name: nameMap.get(m.sender_id) || 'Unknown',
        channel_id: m.channel_id,
        channel_name: channelMap.get(m.channel_id) || 'Unknown Channel',
        created_at: m.created_at,
      })));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search(query);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  // Highlight matching text
  const highlight = (text: string, term: string) => {
    if (!term.trim()) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages…"
            className="pl-9 pr-8"
          />
          {query && (
            <button onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button size="sm" onClick={() => search(query)} disabled={!query.trim() || searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {searched && (
        <div className="border border-border rounded-lg bg-card max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No messages found</p>
          ) : (
            <div className="divide-y divide-border">
              {results.map(r => (
                <button
                  key={r.id}
                  onClick={() => { onSelectResult(r.channel_id); clear(); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-foreground">{r.sender_name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(r.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2">{highlight(r.content, query)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">in {r.channel_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
