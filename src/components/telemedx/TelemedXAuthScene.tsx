import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Banknote, LockKeyhole, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type SceneTone = 'teal' | 'sky' | 'rose';

const TONE: Record<SceneTone, { haze: string; mark: string; ring: string }> = {
  teal: {
    haze: 'bg-teal-400/20',
    mark: 'from-[#5eead4] to-[#38bdf8] text-[#04231f] shadow-[0_18px_44px_-18px_rgba(94,234,212,0.85)]',
    ring: 'ring-[#5eead4]/30',
  },
  sky: {
    haze: 'bg-sky-400/20',
    mark: 'from-[#7dd3fc] to-[#5eead4] text-[#04231f] shadow-[0_18px_44px_-18px_rgba(125,211,252,0.85)]',
    ring: 'ring-[#7dd3fc]/30',
  },
  rose: {
    haze: 'bg-rose-400/20',
    mark: 'from-[#fb7185] to-[#f59e0b] text-[#2a0a10] shadow-[0_18px_44px_-18px_rgba(251,113,133,0.85)]',
    ring: 'ring-rose-400/30',
  },
};

interface TelemedXAuthSceneProps {
  icon: LucideIcon;
  title: string;
  tagline: string;
  tone?: SceneTone;
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
  trust?: Array<{ icon: LucideIcon; label: string }>;
}

export function TelemedXAuthScene({
  icon: Icon,
  title,
  tagline,
  tone = 'teal',
  children,
  width = 'max-w-xl',
  footer,
  trust,
}: TelemedXAuthSceneProps) {
  const navigate = useNavigate();
  const t = TONE[tone];
  const trustPoints = trust ?? [
    { icon: ShieldCheck, label: 'Encrypted in transit and at rest' },
    { icon: Banknote, label: 'Naira billing' },
    { icon: LockKeyhole, label: 'Role-based access' },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071420] p-4 text-slate-100 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_10%_-10%,rgba(56,189,248,0.24),transparent_58%),radial-gradient(820px_560px_at_92%_8%,rgba(94,234,212,0.2),transparent_58%),radial-gradient(760px_620px_at_50%_120%,rgba(20,184,166,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-grid-dark opacity-60" />
        <div className={cn('absolute -left-24 top-24 h-64 w-64 animate-aurora rounded-full blur-[90px]', t.haze)} />
        <div className={cn('absolute -right-20 top-1/2 h-72 w-72 animate-aurora rounded-full blur-[110px] [animation-delay:-7s]', t.haze)} />
        <div className={cn('absolute bottom-[-6rem] left-1/3 h-64 w-64 animate-aurora rounded-full blur-[100px] [animation-delay:-12s]', t.haze)} />
      </div>

      <div className={cn('relative w-full space-y-6', width)}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <span aria-hidden className={cn('absolute inset-0 rounded-2xl bg-white/20 blur-xl', t.haze)} />
            <div
              className={cn(
                'relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/25',
                t.mark,
              )}
            >
              <Icon className="h-7 w-7" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.7rem]">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">{tagline}</p>
          </div>
        </div>

        <div className="animate-rise">{children}</div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
          {trustPoints.map((point) => (
            <span key={point.label} className="inline-flex items-center gap-1.5">
              <point.icon className="h-3.5 w-3.5 text-[#5eead4]" />
              {point.label}
            </span>
          ))}
        </div>

        {footer ?? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/telemed-x')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Telemed-X
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
