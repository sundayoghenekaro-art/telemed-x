import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
import { VitalSigns } from '@/types/dhos';
import { subHours, format } from 'date-fns';

interface VitalSparklineProps {
  vitals: VitalSigns[];
  vitalKey: 'hr' | 'bpSys' | 'bpDia' | 'temp' | 'spo2' | 'rr' | 'pain';
  color: string;
  thresholdLow?: number;
  thresholdHigh?: number;
}

const VITAL_ACCESSOR: Record<string, (v: VitalSigns) => number | undefined> = {
  hr: v => v.heartRate,
  bpSys: v => v.bloodPressureSystolic,
  bpDia: v => v.bloodPressureDiastolic,
  temp: v => v.temperature,
  spo2: v => v.oxygenSaturation,
  rr: v => v.respiratoryRate,
  pain: v => v.painLevel,
};

const VITAL_UNITS: Record<string, string> = {
  hr: 'bpm', bpSys: 'mmHg', bpDia: 'mmHg',
  temp: '°C', spo2: '%', rr: '/min', pain: '/10',
};

function SparklineTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const { value, time } = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-md px-2 py-1 shadow-md text-[10px] leading-tight">
      <p className="font-semibold text-foreground">{value} <span className="text-muted-foreground font-normal">{payload[0].payload.unit}</span></p>
      <p className="text-muted-foreground">{time}</p>
    </div>
  );
}

export function VitalSparkline({ vitals, vitalKey, color, thresholdLow, thresholdHigh }: VitalSparklineProps) {
  const data = useMemo(() => {
    const cutoff = subHours(new Date(), 24);
    const accessor = VITAL_ACCESSOR[vitalKey];
    const unit = VITAL_UNITS[vitalKey] || '';
    if (!accessor) return [];

    return vitals
      .filter(v => new Date(v.timestamp) >= cutoff)
      .map(v => ({
        value: accessor(v),
        time: format(new Date(v.timestamp), 'h:mm a'),
        unit,
      }))
      .filter(d => d.value !== undefined);
  }, [vitals, vitalKey]);

  if (data.length < 2) return null;

  return (
    <div className="h-8 w-full mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          {thresholdHigh !== undefined && (
            <ReferenceLine y={thresholdHigh} stroke="hsl(var(--destructive))" strokeDasharray="2 2" strokeOpacity={0.4} />
          )}
          {thresholdLow !== undefined && (
            <ReferenceLine y={thresholdLow} stroke="hsl(var(--destructive))" strokeDasharray="2 2" strokeOpacity={0.4} />
          )}
          <Tooltip content={<SparklineTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: color, stroke: 'hsl(var(--background))', strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
