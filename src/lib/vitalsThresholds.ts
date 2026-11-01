// Shared vital sign threshold profiles for different patient populations

export type AlertLevel = 'normal' | 'warning' | 'critical';
export type VitalsProfileId = 'adult' | 'pediatric' | 'neonatal' | 'elderly';

export interface VitalThreshold {
  low: number;
  high: number;
  criticalLow?: number;
  criticalHigh?: number;
}

export interface VitalThresholdMeta extends VitalThreshold {
  label: string;
  unit: string;
}

export type ThresholdSet = Record<string, VitalThreshold>;

export interface VitalsProfile {
  id: VitalsProfileId;
  label: string;
  description: string;
  ageRange: string;
  thresholds: ThresholdSet;
}

// ── Profile definitions ──

const ADULT_THRESHOLDS: ThresholdSet = {
  hr:    { low: 60, high: 100, criticalLow: 40, criticalHigh: 150 },
  bpSys: { low: 90, high: 140, criticalLow: 70, criticalHigh: 180 },
  bpDia: { low: 60, high: 90, criticalLow: 40, criticalHigh: 120 },
  temp:  { low: 36.0, high: 38.0, criticalLow: 35.0, criticalHigh: 40.0 },
  spo2:  { low: 95, high: 100, criticalLow: 90 },
  rr:    { low: 12, high: 20, criticalLow: 8, criticalHigh: 36 },
  pain:  { low: 0, high: 3, criticalHigh: 7 },
};

const PEDIATRIC_THRESHOLDS: ThresholdSet = {
  hr:    { low: 70, high: 120, criticalLow: 50, criticalHigh: 180 },
  bpSys: { low: 80, high: 120, criticalLow: 60, criticalHigh: 150 },
  bpDia: { low: 50, high: 80, criticalLow: 35, criticalHigh: 100 },
  temp:  { low: 36.0, high: 38.0, criticalLow: 35.0, criticalHigh: 40.0 },
  spo2:  { low: 95, high: 100, criticalLow: 90 },
  rr:    { low: 18, high: 30, criticalLow: 12, criticalHigh: 40 },
  pain:  { low: 0, high: 3, criticalHigh: 7 },
};

const NEONATAL_THRESHOLDS: ThresholdSet = {
  hr:    { low: 100, high: 160, criticalLow: 80, criticalHigh: 200 },
  bpSys: { low: 60, high: 90, criticalLow: 40, criticalHigh: 110 },
  bpDia: { low: 30, high: 60, criticalLow: 20, criticalHigh: 80 },
  temp:  { low: 36.5, high: 37.5, criticalLow: 35.5, criticalHigh: 39.0 },
  spo2:  { low: 90, high: 100, criticalLow: 85 },
  rr:    { low: 30, high: 60, criticalLow: 20, criticalHigh: 70 },
  pain:  { low: 0, high: 3, criticalHigh: 7 },
};

const ELDERLY_THRESHOLDS: ThresholdSet = {
  hr:    { low: 55, high: 100, criticalLow: 40, criticalHigh: 140 },
  bpSys: { low: 100, high: 150, criticalLow: 80, criticalHigh: 190 },
  bpDia: { low: 60, high: 90, criticalLow: 40, criticalHigh: 110 },
  temp:  { low: 35.8, high: 37.5, criticalLow: 35.0, criticalHigh: 39.5 },
  spo2:  { low: 93, high: 100, criticalLow: 88 },
  rr:    { low: 12, high: 24, criticalLow: 8, criticalHigh: 36 },
  pain:  { low: 0, high: 3, criticalHigh: 7 },
};

export const VITALS_PROFILES: VitalsProfile[] = [
  { id: 'adult',     label: 'Adult',     description: 'Standard adult ranges (18–64 yrs)', ageRange: '18–64', thresholds: ADULT_THRESHOLDS },
  { id: 'pediatric', label: 'Pediatric', description: 'Children and adolescents (1–17 yrs)', ageRange: '1–17', thresholds: PEDIATRIC_THRESHOLDS },
  { id: 'neonatal',  label: 'Neonatal',  description: 'Newborns and infants (0–1 yr)', ageRange: '0–1', thresholds: NEONATAL_THRESHOLDS },
  { id: 'elderly',   label: 'Elderly',   description: 'Older adults (65+ yrs)', ageRange: '65+', thresholds: ELDERLY_THRESHOLDS },
];

/** Vital sign metadata (labels & units) — shared across all profiles */
export const VITAL_META: Record<string, { label: string; unit: string }> = {
  hr:    { label: 'Heart Rate', unit: 'bpm' },
  bpSys: { label: 'BP Systolic', unit: 'mmHg' },
  bpDia: { label: 'BP Diastolic', unit: 'mmHg' },
  temp:  { label: 'Temperature', unit: '°C' },
  spo2:  { label: 'SpO₂', unit: '%' },
  rr:    { label: 'Resp. Rate', unit: '/min' },
  pain:  { label: 'Pain Level', unit: '/10' },
};

// ── Helpers ──

/** Calculate age in years from a date-of-birth string */
export function getAgeFromDob(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** Auto-detect profile based on patient age */
export function detectProfile(dob: string): VitalsProfileId {
  const age = getAgeFromDob(dob);
  if (age < 1) return 'neonatal';
  if (age < 18) return 'pediatric';
  if (age >= 65) return 'elderly';
  return 'adult';
}

/** Get thresholds for a given profile */
export function getThresholds(profileId: VitalsProfileId): ThresholdSet {
  return VITALS_PROFILES.find(p => p.id === profileId)!.thresholds;
}

/** Get severity for a vital key/value using a specific threshold set */
export function getSeverity(key: string, value: number | undefined, thresholds: ThresholdSet): AlertLevel {
  if (value === undefined) return 'normal';
  const t = thresholds[key];
  if (!t) return 'normal';
  if ((t.criticalLow !== undefined && value <= t.criticalLow) ||
      (t.criticalHigh !== undefined && value >= t.criticalHigh)) return 'critical';
  if (value < t.low || value > t.high) return 'warning';
  return 'normal';
}

/** Get range hint string */
export function getRangeHint(key: string, thresholds: ThresholdSet): string {
  const t = thresholds[key];
  if (!t) return '';
  return `Normal: ${t.low}–${t.high}`;
}
