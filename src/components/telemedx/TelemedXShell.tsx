import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Accent = 'teal' | 'sky' | 'rose';

const ACCENT: Record<Accent, { tile: string; ring: string; glow: string }> = {
  teal: {
    tile: 'bg-teal-500/10 text-teal-700',
    ring: 'ring-teal-500/25',
    glow: 'bg-teal-300/25',
  },
  sky: {
    tile: 'bg-sky-500/10 text-sky-700',
    ring: 'ring-sky-500/25',
    glow: 'bg-sky-300/25',
  },
  rose: {
    tile: 'bg-rose-500/10 text-rose-600',
    ring: 'ring-rose-500/25',
    glow: 'bg-rose-300/20',
  },
};

interface TelemedXShellProps {
  portal: string;
  icon: LucideIcon;
  subtitle?: string;
  accent?: Accent;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  contentClassName?: string;
}

export function TelemedXShell({
  portal,
  icon: Icon,
  subtitle,
  accent = 'teal',
  actions,
  children,
  maxWidth = 'max-w-[1600px]',
  contentClassName,
}: TelemedXShellProps) {
  const tone = ACCENT[accent];

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(1000px_620px_at_6%_-12%,hsl(192_85%_72%/0.4),transparent_60%),radial-gradient(920px_560px_at_98%_-6%,hsl(170_72%_62%/0.36),transparent_62%),radial-gradient(900px_700px_at_18%_82%,hsl(200_85%_74%/0.22),transparent_66%),radial-gradient(820px_600px_at_92%_78%,hsl(215_85%_76%/0.22),transparent_66%),linear-gradient(165deg,hsl(198_70%_96%),hsl(180_45%_97%)_46%,hsl(210_60%_96%))]" />
        <div className="absolute inset-0 bg-grid-faint opacity-40" />
        <div className={cn('absolute -left-28 top-16 h-64 w-64 animate-aurora rounded-full blur-[90px]', tone.glow)} />
        <div className={cn('absolute -right-24 top-1/2 h-72 w-72 animate-aurora rounded-full blur-[100px] [animation-delay:-7s]', tone.glow)} />
      </div>

      <header className="glass-header animate-header-in sticky top-0 z-40">
        <div className={cn('mx-auto flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4', maxWidth)}>
          <Link
            to="/telemed-x"
            aria-label="Back to Telemed-X"
            className="group flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/60 text-muted-foreground transition hover:-translate-x-0.5 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <Link to="/telemed-x" className="flex items-center gap-2.5" aria-label="Telemed-X home">
            <img
              src="/assets/Untitled-1.png"
              alt=""
              className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/70"
            />
          </Link>

          <span aria-hidden className="hidden h-8 w-px bg-border/70 sm:block" />

          <div className="flex min-w-0 items-center gap-2.5">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl ring-1', tone.tile, tone.ring)}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-sm font-semibold">{portal}</h1>
              <p className="truncate text-[11px] text-muted-foreground">
                {subtitle || 'Telemed-X by Trika Health'}
              </p>
            </div>
          </div>

          {actions && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">{actions}</div>
          )}
        </div>
      </header>

      <main className={cn('animate-rise relative mx-auto w-full px-3 py-4 sm:px-4', maxWidth, contentClassName)}>
        {children}
      </main>
    </div>
  );
}
