import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Smile, Heart } from 'lucide-react';
import { toast } from 'sonner';

interface PreSessionMoodCheckInProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientUserId: string;
  sessionId: string;
  doctorName: string;
  onComplete: () => void;
  onSkip: () => void;
}

const MOODS = [
  { score: 1, emoji: '😞', label: 'Very Low' },
  { score: 2, emoji: '😔', label: 'Low' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '😊', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
];

export function PreSessionMoodCheckIn({
  open,
  onOpenChange,
  patientUserId,
  sessionId,
  doctorName,
  onComplete,
  onSkip,
}: PreSessionMoodCheckInProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (selectedMood === null) return;
    setSaving(true);
    try {
      const mood = MOODS.find((m) => m.score === selectedMood)!;

      // Try insert first; if conflict (already logged today), update instead
      const { error } = await supabase.from('mood_entries').upsert({
        patient_user_id: patientUserId,
        mood_score: mood.score,
        mood_label: mood.label,
        journal_notes: notes.trim() || null,
      }, { onConflict: 'patient_user_id,logged_at' });
      if (error) throw error;

      toast.success('Mood logged — joining session');
      onComplete();
    } catch {
      toast.error('Failed to save mood');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> Pre-Session Check-In
          </DialogTitle>
          <DialogDescription>
            How are you feeling before your session with Dr. {doctorName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mood selection */}
          <div className="flex justify-between gap-1">
            {MOODS.map((mood) => (
              <button
                key={mood.score}
                onClick={() => setSelectedMood(mood.score)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2 transition-all hover:scale-105 ${
                  selectedMood === mood.score
                    ? 'border-primary bg-primary/10 shadow-md'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                }`}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <span className="text-[10px] font-medium text-muted-foreground">{mood.label}</span>
              </button>
            ))}
          </div>

          {/* Optional note */}
          {selectedMood !== null && (
            <Textarea
              placeholder="Anything on your mind? (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSubmit}
            disabled={selectedMood === null || saving}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Smile className="h-4 w-4 mr-1" />
            )}
            Log Mood & Join Session
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSkip} className="w-full text-muted-foreground">
            Skip & Join Directly
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
