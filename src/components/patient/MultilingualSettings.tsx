import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Globe, Loader2, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'es', name: 'Spanish', flag: 'ES' },
  { code: 'fr', name: 'French', flag: 'FR' },
  { code: 'de', name: 'German', flag: 'DE' },
  { code: 'pt', name: 'Portuguese', flag: 'PT' },
  { code: 'ar', name: 'Arabic', flag: 'AR' },
  { code: 'zh', name: 'Chinese', flag: 'ZH' },
  { code: 'hi', name: 'Hindi', flag: 'HI' },
  { code: 'sw', name: 'Swahili', flag: 'SW' },
  { code: 'yo', name: 'Yoruba', flag: 'YO' },
];

const GREETINGS: Record<string, string> = {
  en: 'Hello! How can we help you today?',
  es: '¡Hola! ¿Cómo podemos ayudarte hoy?',
  fr: 'Bonjour! Comment pouvons-nous vous aider aujourd\'hui?',
  de: 'Hallo! Wie können wir Ihnen heute helfen?',
  pt: 'Olá! Como podemos ajudá-lo hoje?',
  ar: 'مرحبا! كيف يمكننا مساعدتك اليوم؟',
  zh: '你好！我们今天能帮到你什么？',
  hi: 'नमस्ते! हम आज आपकी कैसे मदद कर सकते हैं?',
  sw: 'Habari! Tunaweza kukusaidia vipi leo?',
  yo: 'Pẹlẹ o! Bawo ni a le ṣe iranlọwọ fun ọ loni?',
};

export function MultilingualSettings({ patientUserId }: { patientUserId: string }) {
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPreference(); }, [patientUserId]);

  const fetchPreference = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_language_preferences')
      .select('language')
      .eq('patient_user_id', patientUserId)
      .maybeSingle();
    if (data?.language) setLanguage(data.language);
    setLoading(false);
  };

  const saveLanguage = async (lang: string) => {
    setSaving(true);
    setLanguage(lang);
    const { error } = await supabase
      .from('patient_language_preferences')
      .upsert({ patient_user_id: patientUserId, language: lang, updated_at: new Date().toISOString() });
    if (error) {
      toast.error('Could not save language preference');
    } else {
      toast.success(`Language set to ${LANGUAGES.find(l => l.code === lang)?.name}`);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" /> Language & Communication
      </h2>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Preferred Language</p>
            <p className="text-xs text-muted-foreground mb-3">
              Your doctor's instructions and health summaries will be translated to your preferred language.
            </p>
            <Select value={language} onValueChange={saveLanguage} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{lang.flag}</span>
                      {lang.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-3 border-t">
            <p className="text-sm font-medium mb-2">Preview</p>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm">{GREETINGS[language] || GREETINGS.en}</p>
              <Badge variant="outline" className="mt-2 text-xs">
                {LANGUAGES.find(l => l.code === language)?.name || 'English'}
              </Badge>
            </div>
          </div>

          <div className="pt-3 border-t">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <span>
                Your doctor will see your language preference during consultations and can send translated
                instructions, summaries, and care plans.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
