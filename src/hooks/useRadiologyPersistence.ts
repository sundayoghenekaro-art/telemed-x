import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RadiologyReport } from '@/types/dhos';
import { CriticalFindingNotification } from '@/components/radiology/CriticalFindingAlertDialog';
import { mockRadiologyReports } from '@/data/radiologyMockData';

// Map DB row to RadiologyReport
function rowToReport(row: any): RadiologyReport {
  return {
    id: row.id,
    studyId: row.study_id,
    orderId: row.order_id,
    patientUpid: row.patient_upid,
    patientName: row.patient_name,
    modality: row.modality,
    bodyPart: row.body_part,
    findings: row.findings,
    impression: row.impression,
    technique: row.technique ?? undefined,
    comparison: row.comparison ?? undefined,
    radiologist: row.radiologist,
    createdAt: row.created_at,
    status: row.status,
    verifiedBy: row.verified_by ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    critical: row.critical,
  };
}

function rowToNotification(row: any): CriticalFindingNotification {
  return {
    id: row.id,
    reportId: row.report_id,
    studyId: row.study_id,
    patientName: row.patient_name,
    modality: row.modality,
    bodyPart: row.body_part,
    finding: row.finding,
    radiologist: row.radiologist,
    referringPhysician: row.referring_physician,
    communicationMethod: row.communication_method,
    communicatedAt: row.communicated_at,
    communicatedTo: row.communicated_to,
    readBackConfirmed: row.read_back_confirmed,
    acknowledgedAt: row.acknowledged_at ?? undefined,
    acknowledgedBy: row.acknowledged_by ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function useRadiologyPersistence() {
  const [reports, setReports] = useState<RadiologyReport[]>(mockRadiologyReports);
  const [criticalNotifications, setCriticalNotifications] = useState<CriticalFindingNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from DB on mount
  useEffect(() => {
    async function load() {
      const [reportsRes, notificationsRes] = await Promise.all([
        supabase.from('radiology_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('critical_finding_notifications').select('*').order('created_at', { ascending: false }),
      ]);

      if (reportsRes.data && reportsRes.data.length > 0) {
        const dbReports = reportsRes.data.map(rowToReport);
        const dbStudyIds = new Set(dbReports.map(r => r.studyId));
        const merged = [...dbReports, ...mockRadiologyReports.filter(r => !dbStudyIds.has(r.studyId))];
        setReports(merged);
      }

      if (notificationsRes.data && notificationsRes.data.length > 0) {
        setCriticalNotifications(notificationsRes.data.map(rowToNotification));
      }

      setLoaded(true);
    }
    load();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('radiology-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'critical_finding_notifications' },
        (payload) => {
          const notification = rowToNotification(payload.new);
          setCriticalNotifications(prev => {
            if (prev.some(n => n.id === notification.id)) return prev;
            return [notification, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'critical_finding_notifications' },
        (payload) => {
          const notification = rowToNotification(payload.new);
          setCriticalNotifications(prev =>
            prev.map(n => n.id === notification.id ? notification : n)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'radiology_reports' },
        (payload) => {
          const report = rowToReport(payload.new);
          setReports(prev => {
            if (prev.some(r => r.studyId === report.studyId)) {
              return prev.map(r => r.studyId === report.studyId ? report : r);
            }
            return [report, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'radiology_reports' },
        (payload) => {
          const report = rowToReport(payload.new);
          setReports(prev =>
            prev.map(r => r.studyId === report.studyId ? report : r)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveReport = useCallback(async (report: RadiologyReport) => {
    const payload = {
      study_id: report.studyId,
      order_id: report.orderId,
      patient_upid: report.patientUpid,
      patient_name: report.patientName,
      modality: report.modality,
      body_part: report.bodyPart,
      findings: report.findings,
      impression: report.impression,
      technique: report.technique || null,
      comparison: report.comparison || null,
      radiologist: report.radiologist,
      status: report.status,
      verified_by: report.verifiedBy || null,
      verified_at: report.verifiedAt || null,
      critical: report.critical ?? false,
      created_at: report.createdAt,
    };

    await supabase.from('radiology_reports').upsert(payload, { onConflict: 'study_id' });
  }, []);

  const saveNotification = useCallback(async (notification: CriticalFindingNotification) => {
    const payload = {
      id: notification.id,
      report_id: notification.reportId,
      study_id: notification.studyId,
      patient_name: notification.patientName,
      modality: notification.modality,
      body_part: notification.bodyPart,
      finding: notification.finding,
      radiologist: notification.radiologist,
      referring_physician: notification.referringPhysician,
      communication_method: notification.communicationMethod,
      communicated_at: notification.communicatedAt,
      communicated_to: notification.communicatedTo,
      read_back_confirmed: notification.readBackConfirmed,
      acknowledged_at: notification.acknowledgedAt || null,
      acknowledged_by: notification.acknowledgedBy || null,
      notes: notification.notes || null,
    };

    await supabase.from('critical_finding_notifications').upsert(payload, { onConflict: 'id' });
  }, []);

  const acknowledgeNotification = useCallback(async (id: string) => {
    const updated = criticalNotifications.find(n => n.id === id);
    if (!updated) return;

    const ack: CriticalFindingNotification = {
      ...updated,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: updated.referringPhysician,
    };

    setCriticalNotifications(prev =>
      prev.map(n => n.id === id ? ack : n)
    );

    await supabase.from('critical_finding_notifications').update({
      acknowledged_at: ack.acknowledgedAt,
      acknowledged_by: ack.acknowledgedBy,
    }).eq('id', id);
  }, [criticalNotifications]);

  return {
    reports,
    setReports,
    criticalNotifications,
    setCriticalNotifications,
    loaded,
    saveReport,
    saveNotification,
    acknowledgeNotification,
  };
}
