import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Bed } from '@/data/inpatientMockData';

export interface BedNotification {
  id: string;
  bedNumber: string;
  wardName: string;
  type: 'available' | 'critical-freed' | 'status-change';
  message: string;
  timestamp: Date;
  read: boolean;
}

export function useBedNotifications(beds: Bed[], subscribedWards?: Set<string>) {
  const [notifications, setNotifications] = useState<BedNotification[]>([]);
  const prevBedsRef = useRef<Map<string, Bed>>(new Map());
  const initialized = useRef(false);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      // Seed the previous state on first render — don't fire alerts for initial data
      const map = new Map<string, Bed>();
      for (const b of beds) map.set(b.id, b);
      prevBedsRef.current = map;
      initialized.current = true;
      return;
    }

    const prevMap = prevBedsRef.current;
    const newNotifs: BedNotification[] = [];

    for (const bed of beds) {
      const prev = prevMap.get(bed.id);
      if (!prev) continue;

      // Skip wards the user hasn't subscribed to
      if (subscribedWards && !subscribedWards.has(bed.wardName)) continue;
      if (prev.status !== 'available' && bed.status === 'available') {
        const isCriticalWard = ['ICU', 'CCU', 'Emergency'].includes(bed.wardName);
        const type = isCriticalWard ? 'critical-freed' : 'available';
        const notif: BedNotification = {
          id: `notif-${Date.now()}-${bed.id}`,
          bedNumber: bed.bedNumber,
          wardName: bed.wardName,
          type,
          message: isCriticalWard
            ? `🚨 Critical bed ${bed.bedNumber} is now available in ${bed.wardName}`
            : `Bed ${bed.bedNumber} is now available in ${bed.wardName}`,
          timestamp: new Date(),
          read: false,
        };
        newNotifs.push(notif);

        // Toast for critical wards
        if (isCriticalWard) {
          toast.info(notif.message, {
            description: `Previously ${prev.status}. Ready for new admission.`,
            duration: 8000,
          });
        } else {
          toast(notif.message, { duration: 4000 });
        }
      }

      // Patient acuity changed to critical
      if (prev.acuity !== 'critical' && bed.acuity === 'critical' && bed.status === 'occupied') {
        const notif: BedNotification = {
          id: `notif-${Date.now()}-${bed.id}-acuity`,
          bedNumber: bed.bedNumber,
          wardName: bed.wardName,
          type: 'status-change',
          message: `⚠️ ${bed.patientName || 'Patient'} in ${bed.bedNumber} escalated to CRITICAL`,
          timestamp: new Date(),
          read: false,
        };
        newNotifs.push(notif);
        toast.warning(notif.message, { duration: 6000 });
      }
    }

    if (newNotifs.length > 0) {
      setNotifications(prev => [...newNotifs, ...prev].slice(0, 50));
    }

    // Update ref
    const map = new Map<string, Bed>();
    for (const b of beds) map.set(b.id, b);
    prevBedsRef.current = map;
  }, [beds, subscribedWards]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, clearAll };
}
