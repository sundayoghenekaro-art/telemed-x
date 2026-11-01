import { useState, useCallback } from 'react';

const STORAGE_KEY = 'ward-notification-preferences';

const ALL_WARDS = [
  { id: 'W1', name: 'General Ward A' },
  { id: 'W2', name: 'General Ward B' },
  { id: 'W3', name: 'ICU' },
  { id: 'W4', name: 'CCU' },
  { id: 'W5', name: 'Maternity' },
  { id: 'W6', name: 'Pediatrics' },
  { id: 'W7', name: 'Surgical' },
  { id: 'W8', name: 'Emergency' },
];

function loadPreferences(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      return new Set(parsed);
    }
  } catch {
    // fall through
  }
  // Default: all wards subscribed
  return new Set(ALL_WARDS.map(w => w.name));
}

function savePreferences(wardNames: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...wardNames]));
}

export function useWardNotificationPreferences() {
  const [subscribedWards, setSubscribedWards] = useState<Set<string>>(loadPreferences);

  const toggleWard = useCallback((wardName: string) => {
    setSubscribedWards(prev => {
      const next = new Set(prev);
      if (next.has(wardName)) {
        next.delete(wardName);
      } else {
        next.add(wardName);
      }
      savePreferences(next);
      return next;
    });
  }, []);

  const subscribeAll = useCallback(() => {
    const all = new Set(ALL_WARDS.map(w => w.name));
    setSubscribedWards(all);
    savePreferences(all);
  }, []);

  const unsubscribeAll = useCallback(() => {
    const none = new Set<string>();
    setSubscribedWards(none);
    savePreferences(none);
  }, []);

  const isSubscribed = useCallback((wardName: string) => subscribedWards.has(wardName), [subscribedWards]);

  return { subscribedWards, toggleWard, subscribeAll, unsubscribeAll, isSubscribed, allWards: ALL_WARDS };
}
