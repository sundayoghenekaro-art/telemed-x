import { VitalsProfile, ThresholdSet, VitalsProfileId, VITALS_PROFILES } from './vitalsThresholds';

export interface CustomVitalsProfile extends VitalsProfile {
  isCustom: true;
}

const STORAGE_KEY = 'dhos-custom-vitals-profiles';

export function loadCustomProfiles(): CustomVitalsProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomVitalsProfile[];
  } catch {
    return [];
  }
}

export function saveCustomProfiles(profiles: CustomVitalsProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function addCustomProfile(profile: CustomVitalsProfile): CustomVitalsProfile[] {
  const existing = loadCustomProfiles();
  existing.push(profile);
  saveCustomProfiles(existing);
  return existing;
}

export function deleteCustomProfile(id: string): CustomVitalsProfile[] {
  const existing = loadCustomProfiles().filter(p => p.id !== id);
  saveCustomProfiles(existing);
  return existing;
}

export function updateCustomProfile(updated: CustomVitalsProfile): CustomVitalsProfile[] {
  const existing = loadCustomProfiles().map(p => p.id === updated.id ? updated : p);
  saveCustomProfiles(existing);
  return existing;
}

/** Get all profiles: presets + custom */
export function getAllProfiles(): (VitalsProfile | CustomVitalsProfile)[] {
  return [...VITALS_PROFILES, ...loadCustomProfiles()];
}

/** Generate a unique custom profile ID */
export function generateProfileId(): string {
  return `custom-${Date.now()}`;
}

/** Default thresholds for a new custom profile (copied from adult) */
export function getDefaultCustomThresholds(): ThresholdSet {
  return JSON.parse(JSON.stringify(VITALS_PROFILES.find(p => p.id === 'adult')!.thresholds));
}
