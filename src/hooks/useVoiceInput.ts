import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechResultAlternative {
  transcript: string;
}

interface SpeechResult {
  isFinal: boolean;
  [index: number]: SpeechResultAlternative;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it for this site in your browser settings.',
  'service-not-allowed': 'Speech recognition is blocked by the browser. Check your site permissions.',
  'audio-capture': 'No microphone was found. Check that one is connected and enabled.',
  network: 'Voice input needs an internet connection. Check your network and try again.',
  'language-not-supported': 'Voice input is not available for this language on this device.',
};

export function useVoiceInput(onFinalText: (text: string) => void, lang = 'en-NG') {
  const [supported] = useState(() => Boolean(getRecognitionCtor()));
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeRef = useRef(false);
  const callbackRef = useRef(onFinalText);

  callbackRef.current = onFinalText;

  const stop = useCallback(() => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError(null);

    if (!recognitionRef.current) {
      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript ?? '';
          if (result.isFinal) finalText += transcript;
          else interimText += transcript;
        }
        if (finalText.trim()) callbackRef.current(finalText.trim());
        setInterim(interimText.trim());
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        setError(ERROR_MESSAGES[event.error] ?? 'Voice input stopped unexpectedly. Try again.');
        activeRef.current = false;
        setListening(false);
        setInterim('');
      };

      recognition.onend = () => {
        if (activeRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            activeRef.current = false;
          }
        }
        setListening(false);
        setInterim('');
      };

      recognitionRef.current = recognition;
    }

    activeRef.current = true;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // start() throws if a session is already running; keep the current one.
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (activeRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(
    () => () => {
      activeRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  return { supported, listening, interim, error, start, stop, toggle };
}
