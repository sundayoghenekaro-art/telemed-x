export const DEMO_PATIENT_ID = '11111111-1111-4111-8111-111111111111';

export interface DemoVital {
  id: string;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  temperature: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  weight: number | null;
  blood_glucose: number | null;
  steps: number | null;
  sleep_hours: number | null;
  source: string;
  recorded_at: string;
}

export const isDemoPatientId = (patientUserId: string) => patientUserId === DEMO_PATIENT_ID;

function createRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

/** Deterministic 30-day series so the demo patient portal has believable trends. */
export function buildSampleVitals(days = 30): DemoVital[] {
  const random = createRandom(20261030);
  const rows: DemoVital[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const readingsPerDay = offset > 20 ? 1 : 2;

    for (let index = 0; index < readingsPerDay; index += 1) {
      const minutesAgo = offset * 24 * 60 + (index === 0 ? 11 * 60 : 20) + Math.floor(random() * 40);
      const recordedAt = new Date(Date.now() - minutesAgo * 60_000);

      const phase = Math.sin((days - offset) / 3.4);
      const isLatest = offset === 0 && index === readingsPerDay - 1;
      const isBpSpike = offset === 6;

      rows.push({
        id: `sample-${offset}-${index}`,
        heart_rate: clamp(Math.round(72 + phase * 4 + (random() - 0.5) * 9), 58, 96),
        blood_pressure_systolic: clamp(Math.round(121 + phase * 3 + (random() - 0.5) * 7 + (isBpSpike ? 16 : 0)), 106, 149),
        blood_pressure_diastolic: clamp(Math.round(77 + phase * 2 + (random() - 0.5) * 6 + (isBpSpike ? 9 : 0)), 64, 96),
        temperature: round1(clamp(98.1 + phase * 0.15 + (random() - 0.5) * 0.9 + (isLatest ? 1.9 : 0), 97.1, 99.8)),
        spo2: clamp(Math.round(97 + (random() - 0.35) * 2.6), 94, 100),
        respiratory_rate: clamp(Math.round(15 + (random() - 0.5) * 4), 12, 20),
        weight: round1(159.8 - (days - 1 - offset) * 0.055 + (random() - 0.5) * 0.7),
        blood_glucose: random() > 0.3
          ? clamp(Math.round(95 + phase * 5 + (random() - 0.5) * 20 + (offset === 4 ? 34 : 0)), 78, 168)
          : null,
        steps: offset === 0 ? 6820 : Math.round(5000 + random() * 4600),
        sleep_hours: offset === 0 ? 6.2 : round1(6.4 + random() * 2),
        source: index === 0 ? (offset % 2 === 0 ? 'apple_watch' : 'fitbit') : 'manual',
        recorded_at: recordedAt.toISOString(),
      });
    }
  }

  return rows.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
}
