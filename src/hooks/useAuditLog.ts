import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AllergyOverrideEntry } from '@/components/pharmacy/AuditLogViewer';
import { toast } from 'sonner';

interface AuditLogRow {
  id: string;
  timestamp: string;
  pharmacist_name: string;
  patient_name: string;
  prescription_id: string;
  medications: string[];
  allergies: string[];
  severity: 'critical' | 'warning';
  action: 'dispensed' | 'prescribed';
}

function rowToEntry(row: AuditLogRow): AllergyOverrideEntry {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp),
    pharmacistName: row.pharmacist_name,
    patientName: row.patient_name,
    prescriptionId: row.prescription_id,
    medications: row.medications,
    allergies: row.allergies,
    severity: row.severity,
    action: row.action,
  };
}

export function useAuditLog() {
  const [auditLog, setAuditLog] = useState<AllergyOverrideEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLog = useCallback(async () => {
    const { data, error } = await supabase
      .from('allergy_override_audit_log')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to fetch audit log:', error);
      toast.error('Failed to load audit log');
    } else if (data) {
      setAuditLog((data as unknown as AuditLogRow[]).map(rowToEntry));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const addAuditEntry = useCallback(async (
    rxId: string,
    patientName: string,
    medications: string[],
    allergies: string[],
    severity: 'critical' | 'warning',
    action: 'dispensed' | 'prescribed',
  ) => {
    // Get the authenticated user's identity
    const { data: { user } } = await supabase.auth.getUser();
    const pharmacistName = user?.user_metadata?.name || user?.email || 'Unknown';
    const row = {
      pharmacist_name: pharmacistName,
      patient_name: patientName,
      prescription_id: rxId,
      medications,
      allergies,
      severity,
      action,
    };

    const { data, error } = await supabase
      .from('allergy_override_audit_log')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Failed to save audit entry:', error);
      toast.error('Failed to save audit log entry');
      // Still add locally as fallback
      setAuditLog(prev => [{
        id: `local-${Date.now()}`,
        timestamp: new Date(),
        pharmacistName: row.pharmacist_name,
        patientName,
        prescriptionId: rxId,
        medications,
        allergies,
        severity,
        action,
      }, ...prev]);
    } else if (data) {
      setAuditLog(prev => [rowToEntry(data as unknown as AuditLogRow), ...prev]);
    }
  }, []);

  return { auditLog, loading, addAuditEntry };
}
