import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ContentItem, ContentKind, Clearance } from '@/lib/defenceLearning';
import { CLEARANCE_RANK } from '@/lib/defenceLearning';
import {
  Activity, ArrowUpRight, BookOpen, FileText, Film, Headphones,
  Music2, Presentation, Radio, ShieldAlert,
} from 'lucide-react';

export const KIND_ICON: Record<ContentKind, typeof Film> = {
  video: Film,
  audio: Headphones,
  pdf: FileText,
  slides: Presentation,
  doc: BookOpen,
};

export const CLEARANCE_TONE: Record<Clearance, string> = {
  unclassified: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  restricted: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  confidential: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  secret: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

export function clearanceLabel(value: Clearance): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function MicroLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40', className)}>
      {children}
    </span>
  );
}

export function Surface({
  children,
  className,
  interactive = false,
  as = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
} & React.HTMLAttributes<HTMLDivElement>) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        'relative rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-sm',
        interactive && 'transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Surface className={cn('overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Surface>
  );
}

type PillTone = 'neutral' | 'amber' | 'sky' | 'emerald' | 'rose' | 'violet' | 'slate';

const PILL_TONES: Record<PillTone, string> = {
  neutral: 'border-white/15 bg-white/5 text-white/70',
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  sky: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  rose: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  violet: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  slate: 'border-slate-400/25 bg-slate-400/10 text-slate-300',
};

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  detail,
  tone = 'sky',
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: PillTone;
  icon?: typeof Activity;
}) {
  const ring: Record<PillTone, string> = {
    neutral: 'from-white/10',
    amber: 'from-amber-400/20',
    sky: 'from-sky-400/20',
    emerald: 'from-emerald-400/20',
    rose: 'from-rose-400/20',
    violet: 'from-violet-400/20',
    slate: 'from-slate-400/20',
  };
  return (
    <Surface className="group overflow-hidden p-5">
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent opacity-60', ring[tone])} />
      <div className="relative flex items-start justify-between">
        <div>
          <MicroLabel>{label}</MicroLabel>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
          {detail && <p className="mt-1 text-xs text-white/45">{detail}</p>}
        </div>
        {Icon && (
          <span className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/50">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
    </Surface>
  );
}

export function Meter({ value, tone = 'sky', className }: { value: number; tone?: PillTone; className?: string }) {
  const fill: Record<PillTone, string> = {
    neutral: 'bg-white/40',
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    violet: 'bg-violet-400',
    slate: 'bg-slate-400',
  };
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/10', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', fill[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ProgressRing({ value, size = 56, tone = '#38bdf8' }: { value: number; size?: number; tone?: string }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={tone}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        className="transition-all duration-500"
      />
    </svg>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
      <span className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/40">
        <Icon className="h-6 w-6" />
      </span>
      <h4 className="mt-4 text-sm font-semibold text-white">{title}</h4>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-white/45">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-sky-400/40 bg-sky-400/15 text-sky-200'
          : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/80',
      )}
    >
      {children}
    </button>
  );
}

export function AccessDenied({ capability, role }: { capability: string; role: string }) {
  return (
    <Surface className="p-8">
      <div className="flex items-start gap-4">
        <span className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-rose-300">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-white">This area is outside your role scope</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
            The <span className="font-mono text-white/70">{role}</span> role does not hold the{' '}
            <span className="font-mono text-white/70">{capability}</span> capability. The navigation item is hidden
            for this role, and the same rule is enforced in the SQL policies that ship with the hub migration.
          </p>
        </div>
      </div>
    </Surface>
  );
}

const MOTIF_GEOMETRY: Record<ContentItem['motif'], ReactNode> = {
  bleeding: (
    <g>
      <circle cx="300" cy="100" r="54" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="300" cy="100" r="34" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.5" />
      <circle cx="300" cy="100" r="13" fill="currentColor" fillOpacity="0.8" />
      <path d="M150 60c22 30 34 48 34 62a34 34 0 1 1-68 0c0-14 12-32 34-62Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
    </g>
  ),
  burns: (
    <g>
      <path d="M260 160c-26-18-38-44-22-66 10-14 26-16 24-36 20 18 34 32 34 54 0 26-16 48-36 48Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.75" />
      <path d="M186 160c-16-12-24-30-14-46 6-10 16-12 16-24 12 12 22 22 22 38 0 18-10 32-24 32Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.45" />
      <path d="M60 150h280" stroke="currentColor" strokeOpacity="0.25" />
    </g>
  ),
  wounds: (
    <g>
      <path d="M90 140 120 90l30 34 30-58 30 46 30-30 30 58" fill="none" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.65" />
      <circle cx="270" cy="140" r="4" fill="currentColor" />
      <path d="M90 160h260" stroke="currentColor" strokeOpacity="0.2" />
    </g>
  ),
  fractures: (
    <g>
      <path d="M70 120 120 96l30 20 28-42 30 34 32-18 40 30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.6" />
      <path d="M150 116l-10-18M178 74l8 20M240 90l-6 18" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
      <circle cx="310" cy="120" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.7" />
    </g>
  ),
  heat: (
    <g>
      {[0, 1, 2, 3].map((index) => (
        <path
          key={index}
          d={`M60 ${78 + index * 26}c40 -22 62 22 102 0s62 22 102 0 62 22 76 12`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeOpacity={0.65 - index * 0.12}
        />
      ))}
    </g>
  ),
  infection: (
    <g>
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 8 }).map((__, column) => (
          <circle
            key={`${row}-${column}`}
            cx={70 + column * 34 + (row % 2) * 17}
            cy={64 + row * 22}
            r={3}
            fill="currentColor"
            fillOpacity={0.18 + ((row + column) % 3) * 0.16}
          />
        )),
      )}
    </g>
  ),
  escalation: (
    <g>
      {[0, 1, 2, 3].map((index) => (
        <rect
          key={index}
          x={70 + index * 58}
          y={150 - (index + 1) * 24}
          width="38"
          height={(index + 1) * 24}
          rx="4"
          fill="currentColor"
          fillOpacity={0.12 + index * 0.12}
        />
      ))}
      <path d="M84 96 300 56" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" strokeDasharray="4 6" />
      <path d="m290 50 14 4-6 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.7" />
    </g>
  ),
  device: (
    <g>
      <rect x="150" y="56" width="130" height="88" rx="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M166 100h26l10-24 14 48 12-32 8 16h28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.8" />
      <circle cx="264" cy="72" r="3" fill="currentColor" />
      <path d="M70 160h260" stroke="currentColor" strokeOpacity="0.2" />
    </g>
  ),
  storage: (
    <g>
      {[0, 1, 2].map((index) => (
        <path
          key={index}
          d={`M150 ${70 + index * 24} 215 ${52 + index * 24} 280 ${70 + index * 24} 215 ${88 + index * 24}Z`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeOpacity={0.55 - index * 0.1}
        />
      ))}
      <path d="M150 94v34l65 18 65-18V94" fill="none" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
    </g>
  ),
  policy: (
    <g>
      <rect x="160" y="46" width="96" height="116" rx="8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.55" />
      {[0, 1, 2, 3].map((index) => (
        <path key={index} d={`M178 ${74 + index * 18}h60`} stroke="currentColor" strokeWidth="1.4" strokeOpacity={0.4 - index * 0.06} />
      ))}
      <circle cx="238" cy="140" r="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.7" />
      <path d="M232 140l5 5 10-11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.85" />
    </g>
  ),
  leadership: (
    <g>
      {[
        [90, 140], [160, 92], [230, 130], [300, 76], [200, 56], [120, 60],
      ].map(([x, y], index) => (
        <g key={index}>
          <circle cx={x} cy={y} r={index === 3 ? 7 : 4} fill="currentColor" fillOpacity={index === 3 ? 0.8 : 0.45} />
          {index > 0 && (
            <path d={`M90 140 ${x} ${y}`} stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
          )}
        </g>
      ))}
    </g>
  ),
  wellbeing: (
    <g>
      {[1, 2, 3, 4].map((index) => (
        <circle key={index} cx="200" cy="104" r={index * 26} fill="none" stroke="currentColor" strokeWidth="1.2" strokeOpacity={0.45 - index * 0.07} />
      ))}
      <circle cx="200" cy="104" r="8" fill="currentColor" fillOpacity="0.7" />
    </g>
  ),
  resuscitation: (
    <g>
      <path
        d="M60 110h70l16-40 22 80 20-56 14 26h138"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeOpacity="0.85"
      />
      <path d="M60 140h280" stroke="currentColor" strokeOpacity="0.18" />
    </g>
  ),
};

export function MotifArt({ item, className }: { item: ContentItem; className?: string }) {
  const Icon = KIND_ICON[item.kind];
  const gradientId = `motif-${item.id}`;
  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-white/10', className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 140% at 15% 10%, ${item.palette[0]} 0%, transparent 55%), radial-gradient(120% 140% at 90% 100%, ${item.palette[1]} 0%, transparent 60%), #0a0f18`,
        }}
      />
      <svg viewBox="0 0 400 200" className="relative h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <g style={{ color: 'white' }} opacity="0.85">
          {MOTIF_GEOMETRY[item.motif]}
        </g>
        <path d="M0 50h400M0 100h400M0 150h400M100 0v200M200 0v200M300 0v200" stroke="white" strokeOpacity="0.04" />
      </svg>
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/80 backdrop-blur">
        <Icon className="h-3 w-3" />
        {item.kind}
      </div>
      {item.sourceType !== 'official' && (
        <div className="absolute bottom-3 left-3 rounded-md bg-amber-400/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200 backdrop-blur">
          AI-assisted
        </div>
      )}
    </div>
  );
}

export function ClearancePill({ clearance }: { clearance: Clearance }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]', CLEARANCE_TONE[clearance])}>
      {clearanceLabel(clearance)}
    </span>
  );
}

export function UploadArrow() {
  return <ArrowUpRight className="h-4 w-4" />;
}

export function SignalGlyph({ className }: { className?: string }) {
  return <Radio className={className} />;
}

export function AudioGlyph({ className }: { className?: string }) {
  return <Music2 className={className} />;
}

export function isAboveClearance(persona: { clearance: Clearance }, required: Clearance) {
  return CLEARANCE_RANK[persona.clearance] >= CLEARANCE_RANK[required];
}
