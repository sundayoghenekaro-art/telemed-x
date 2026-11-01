import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Ambulance,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  HeartPulse,
  Hospital,
  Languages,
  LockKeyhole,
  Menu,
  Network,
  Pill,
  Radio,
  Shield,
  ShieldCheck,
  Siren,
  Stethoscope,
  Truck,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CountUp, Reveal } from '@/lib/motion';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Platform', href: '#platform' },
  { label: 'How it works', href: '#journey' },
  { label: 'Emergency', href: '#emergency' },
  { label: 'Network', href: '#network' },
];

const portals = [
  { label: 'Patient portal', description: 'Appointments, records, telehealth', path: '/telemed-x/patient', icon: HeartPulse },
  { label: 'Practitioner console', description: 'Consultations and clinical orders', path: '/telemed-x/doctor', icon: Stethoscope },
  { label: 'Ambulance dispatch', description: 'Emergency calls and live routing', path: '/telemed-x/ambulance', icon: Siren },
  { label: 'Lab & pharmacy', description: 'Partner onboarding and orders', path: '/telemed-x/vendor-portal', icon: Building2 },
];

const platformFeatures = [
  {
    icon: Video,
    title: 'HD video consultations',
    text: 'Crystal-clear calls with screen sharing, recording and a managed waiting room — including for patients in transit.',
  },
  {
    icon: Ambulance,
    title: 'Emergency ambulance dispatch',
    text: 'Log emergencies, match the nearest suitable facility and route ambulances with live facility tracking.',
  },
  {
    icon: Calendar,
    title: 'Smart scheduling',
    text: 'Browse clinicians, view real-time availability and book slots with automatic conflict detection.',
  },
  {
    icon: Hospital,
    title: 'Hospital network directory',
    text: 'Choose facilities by location, specialty and consultation language — verified institutions only.',
  },
  {
    icon: Banknote,
    title: 'Naira wallet',
    text: 'Fund consultations, referrals and medications in naira with a complete transaction history.',
  },
  {
    icon: Pill,
    title: 'E-prescriptions',
    text: 'Prescriptions issued during consultation, encrypted at rest with a full audit trail.',
  },
  {
    icon: Users,
    title: 'Clinician onboarding',
    text: 'Credentialed physicians apply, get verified and start consulting remotely.',
  },
  {
    icon: Languages,
    title: 'Multilingual care',
    text: 'Match patients to clinicians and hospitals that consult in the language they prefer.',
  },
  {
    icon: LockKeyhole,
    title: 'Security by design',
    text: 'End-to-end encryption, role-based access control and complete audit trails.',
  },
];

const emergencyFeatures = [
  { icon: Radio, title: 'Log the emergency', text: 'Dispatch requests are recorded instantly, securely and in one place.' },
  { icon: Network, title: 'Match the facility', text: 'The nearest appropriate facility is suggested by specialty, capacity and location.' },
  { icon: Truck, title: 'Care in transit', text: 'Remote clinical care begins while the patient is on board.' },
  { icon: Activity, title: 'Handover and track', text: 'Live updates from dispatch to hospital arrival keep everyone aligned.' },
];

const networkCards = [
  { icon: Building2, title: 'Tertiary command hospitals', text: 'Specialist support to regional hospitals', tone: 'bg-sky-400/10 text-sky-300' },
  { icon: Hospital, title: 'Secondary regional hospitals', text: 'Support primary and referral care', tone: 'bg-emerald-400/10 text-emerald-300' },
  { icon: Stethoscope, title: 'Primary field clinics', text: 'Diagnose and deliver care remotely', tone: 'bg-teal-400/10 text-teal-300' },
  { icon: Ambulance, title: 'Medical evacuation', text: 'Link critical lives to the dispatch network', tone: 'bg-rose-400/10 text-rose-300' },
];

const journey = [
  {
    step: '01',
    title: 'Create your account',
    text: 'Patients, practitioners, crews and partners onboard through one verified identity flow.',
    icon: ShieldCheck,
  },
  {
    step: '02',
    title: 'Choose your care path',
    text: 'Book a consultation, request an ambulance or route a referral — the platform picks up the context.',
    icon: HeartPulse,
  },
  {
    step: '03',
    title: 'Care keeps moving',
    text: 'Records, prescriptions and handovers follow the patient across facilities and channels.',
    icon: Activity,
  },
];

const capabilities = [
  'Virtual care',
  'Emergency dispatch',
  'Smart routing',
  'Multilingual',
  'Naira wallet',
  'e-Prescriptions',
  'Hospital network',
  'Remote monitoring',
];

export function TelemedXLanding() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-[#0a1520] text-slate-100 antialiased">
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-white/10 bg-[#0a1520]/85 shadow-[0_10px_40px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button
            onClick={() => goTo('/telemed-x')}
            className="group flex items-center gap-3"
            aria-label="Telemed-X home"
          >
            <span className="relative flex h-9 w-9 items-center justify-center">
              <img src="/assets/Untitled-1.png" alt="" className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/20" />
              <span className="absolute inset-0 rounded-xl ring-1 ring-[#5eead4]/0 transition group-hover:ring-[#5eead4]/50" />
            </span>
            <span className="text-left leading-none">
              <span className="block text-sm font-bold tracking-wide text-white">Telemed-X</span>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                by Trika Health
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Landing navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/defense-health"
              className="rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Defence health
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white sm:flex">
                  Sign in
                  <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border-white/10 bg-[#101f2e] text-slate-100">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Choose your portal
                </DropdownMenuLabel>
                {portals.map((portal) => (
                  <DropdownMenuItem
                    key={portal.path}
                    onSelect={() => goTo(portal.path)}
                    className="gap-3 rounded-md px-2 py-2.5 focus:bg-white/10 focus:text-white"
                  >
                    <portal.icon className="h-4 w-4 text-[#5eead4]" />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{portal.label}</span>
                      <span className="text-[11px] text-slate-400">{portal.description}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onSelect={() => goTo('/')}
                  className="gap-3 rounded-md px-2 py-2.5 focus:bg-white/10 focus:text-white"
                >
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">Hospital staff sign-in</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => goTo('/telemed-x/patient?mode=signup')}
              className="hidden items-center gap-1.5 rounded-full bg-[#5eead4] px-4 py-2 text-sm font-semibold text-[#04231f] transition hover:bg-[#7cf3e1] active:scale-[0.98] sm:inline-flex"
            >
              Get care
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-lg p-2 text-slate-300 transition hover:bg-white/5 lg:hidden"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="animate-fade-in border-t border-white/10 bg-[#0a1520]/95 px-5 pb-6 pt-4 backdrop-blur-xl lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Portals</p>
            <div className="mt-2 space-y-1.5">
              {portals.map((portal) => (
                <button
                  key={portal.path}
                  onClick={() => goTo(portal.path)}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-left transition hover:bg-white/5"
                >
                  <portal.icon className="h-4 w-4 text-[#5eead4]" />
                  <span className="text-sm text-slate-100">{portal.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
                </button>
              ))}
            </div>
            <button
              onClick={() => goTo('/telemed-x/patient?mode=signup')}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#5eead4] px-4 py-3 text-sm font-semibold text-[#04231f]"
            >
              Create a patient account
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-16">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(56,189,248,.22),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(94,234,212,.18),transparent_40%),radial-gradient(circle_at_50%_120%,rgba(20,184,166,.14),transparent_55%)]" />
          <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-70" />
          <div aria-hidden className="pointer-events-none absolute -left-32 top-24 h-72 w-72 animate-aurora rounded-full bg-sky-500/20 blur-[90px]" />
          <div aria-hidden className="pointer-events-none absolute -right-24 top-64 h-80 w-80 animate-aurora rounded-full bg-teal-400/20 blur-[110px] [animation-delay:-8s]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5eead4]/25 bg-[#062d2b]/70 px-3.5 py-1.5 text-xs font-medium text-[#9df5e7]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5eead4] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5eead4]" />
                </span>
                The connected health ecosystem
              </span>

              <h1 className="mt-6 text-balance text-[2.6rem] font-bold leading-[1.03] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.25rem]">
                Health care that moves
                <span className="mt-2 block bg-gradient-to-r from-[#8be9fd] via-[#5eead4] to-[#a7f3d0] bg-clip-text font-serif text-transparent">
                  at the speed of life
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                From emergency dispatch to virtual consultations, hospital networks to remote monitoring — one
                platform connecting patients, clinicians and facilities across the care continuum.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => goTo('/telemed-x/patient?mode=signup')}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#5eead4] px-6 text-sm font-semibold text-[#04231f] shadow-[0_18px_40px_-18px_rgba(94,234,212,.9)] transition hover:bg-[#7cf3e1] active:scale-[0.99]"
                >
                  Create a patient account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={() => goTo('/telemed-x/doctor?mode=signup')}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  Join as a practitioner
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#5eead4]" /> Encrypted records
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#5eead4]" /> 24/7 emergency routing
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Languages className="h-4 w-4 text-[#5eead4]" /> Multilingual consults
                </span>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div className="flex flex-col">
                  <dt className="text-xs text-slate-400">Care tiers connected</dt>
                  <dd className="mt-auto pt-1 text-2xl font-bold text-white">
                    <CountUp to={3} />
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-slate-400">Consultation languages</dt>
                  <dd className="mt-auto pt-1 text-2xl font-bold text-white">
                    <CountUp to={12} />
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-slate-400">Connected portals</dt>
                  <dd className="mt-auto pt-1 text-2xl font-bold text-white">
                    <CountUp to={4} />
                  </dd>
                </div>
              </dl>
            </div>

            <div className="relative">
              <div aria-hidden className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-teal-400/20 via-sky-400/10 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_40px_120px_-40px_rgba(0,0,0,.9)]">
                <img
                  src="/assets/hero-clinician.jpg"
                  alt="A physician reviewing a patient record on a tablet in a bright hospital atrium"
                  className="h-[420px] w-full object-cover sm:h-[500px] lg:h-[560px]"
                />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#04101a]/85 via-[#04101a]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                      Cross-facility records
                    </span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                      One patient identity
                    </span>
                  </div>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-200">
                    Clinical context follows the patient — from the field clinic to the referral hospital.
                  </p>
                </div>
              </div>

              <div className="pointer-events-none absolute -left-3 top-8 hidden animate-float-slow sm:block lg:-left-8">
                <div className="rounded-2xl border border-white/10 bg-[#0d1c29]/85 p-3.5 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-300">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                    </span>
                    Dispatch live
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">Chest pain · Triage 1</p>
                  <p className="text-[11px] text-slate-400">Nearest cardiac centre · 6 min ETA</p>
                </div>
              </div>

              <div className="pointer-events-none absolute -right-3 bottom-24 hidden animate-float-slower sm:block lg:-right-6">
                <div className="rounded-2xl border border-white/10 bg-[#0d1c29]/85 p-3.5 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5eead4]">
                    <Video className="h-3.5 w-3.5" />
                    Consultation ready
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">Dr. Sarah Chen</p>
                  <p className="text-[11px] text-slate-400">Waiting room · 2 patients</p>
                </div>
              </div>
            </div>
          </div>

          {/* Capability marquee */}
          <div className="relative border-y border-white/10 bg-[#08131d]/80 py-4">
            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#08131d] to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#08131d] to-transparent" />
            <div className="flex w-max animate-marquee items-center gap-10 pr-10">
              {[...capabilities, ...capabilities].map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  aria-hidden={index >= capabilities.length}
                  className="flex items-center gap-2 whitespace-nowrap text-xs font-medium uppercase tracking-[0.16em] text-slate-400"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5eead4]/70" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Platform bento */}
        <section id="platform" className="relative border-b border-white/[0.06] px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5eead4]">End-to-end care network</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                One platform, every point of care
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                A complete health-tech stack designed for modern, connected care delivery — from the first call to the
                final handover.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Reveal className="h-full md:col-span-2 lg:col-span-2 lg:row-span-2">
                <article className="group relative flex h-full min-h-[340px] flex-col justify-end overflow-hidden rounded-2xl border border-white/10">
                  <img
                    src="/assets/telemedicine-consult.jpg"
                    alt="A patient taking part in a video consultation from home"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#05111b] via-[#05111b]/65 to-transparent" />
                  <div className="relative p-6 sm:p-8">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
                      <Video className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold text-white">HD video consultations</h3>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
                      Crystal-clear calls with screen sharing, recording and a managed waiting room — including for
                      patients in transit.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {['Waiting room', 'Screen share', 'Recording', 'In-transit care'].map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-slate-200 backdrop-blur"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Reveal>

              {platformFeatures.slice(1).map((feature, index) => (
                <Reveal key={feature.title} delay={60 + index * 45} className="h-full">
                  <article className="group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#5eead4]/35 hover:bg-white/[0.055] hover:shadow-[0_24px_50px_-30px_rgba(94,234,212,.5)]">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#5eead4]/10 text-[#7cf3e1] transition group-hover:bg-[#5eead4]/20">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-sm font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Journey */}
        <section id="journey" className="relative overflow-hidden border-b border-white/[0.06] bg-[#08131d] px-5 py-20 lg:px-8 lg:py-24">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(94,234,212,.1),transparent_55%)]" />
          <div className="relative mx-auto max-w-7xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5eead4]">How it works</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Care that keeps moving</h2>
              <p className="mt-3 text-base text-slate-400">
                Three steps from intention to treatment, with the clinical record carrying the context.
              </p>
            </Reveal>

            <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
              <div aria-hidden className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-[#5eead4]/40 to-transparent lg:block" />
              {journey.map((item, index) => (
                <Reveal key={item.step} delay={index * 120} className="relative">
                  <div className="relative h-full rounded-2xl border border-white/[0.08] bg-[#0d1c29]/80 p-6 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5eead4]/10 text-[#7cf3e1] ring-1 ring-[#5eead4]/20">
                        <item.icon className="h-5 w-5" />
                      </span>
                      <span className="font-serif text-3xl font-semibold text-white/15">{item.step}</span>
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={120}>
              <div className="mt-14 grid gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
                {[
                  { value: 3, suffix: '', label: 'Care tiers connected' },
                  { value: 24, suffix: '/7', label: 'Emergency coverage' },
                  { value: 45, suffix: ' s', label: 'Target dispatch match' },
                  { value: 12, suffix: '', label: 'Consultation languages' },
                ].map((metric) => (
                  <div key={metric.label}>
                    <p className="text-3xl font-bold text-white">
                      <CountUp to={metric.value} suffix={metric.suffix} />
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-600">
                Illustrative platform design targets for this demo environment, not audited performance metrics.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Emergency */}
        <section id="emergency" className="border-b border-white/[0.06] px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_40px_100px_-40px_rgba(0,0,0,.9)]">
                <img
                  src="/assets/network-command.jpg"
                  alt="Hospital operations command centre with clinicians reviewing live dashboards"
                  loading="lazy"
                  className="h-[320px] w-full object-cover sm:h-[420px]"
                />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#04101a]/90 via-[#04101a]/25 to-transparent" />
                <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200 backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                  </span>
                  112 dispatch live
                </div>
                <div className="absolute inset-x-5 bottom-5 rounded-xl border border-white/10 bg-[#071521]/80 p-4 backdrop-blur">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <Ambulance className="h-4 w-4 text-rose-300" /> Unit 07 · en route
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">ETA 06:12</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-rose-400 to-amber-300" />
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Emergency response</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                When minutes matter, the whole chain responds
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-400">
                Emergency calls, facility matching, in-transit care and hospital handover run on the same record — so
                nothing has to be repeated under pressure.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {emergencyFeatures.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-rose-300/30 hover:bg-white/[0.05]"
                  >
                    <feature.icon className="h-5 w-5 text-rose-300" />
                    <h3 className="mt-3 text-sm font-semibold text-white">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{feature.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => goTo('/telemed-x/ambulance')}
                className="group mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-rose-500 px-6 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(244,63,94,.9)] transition hover:bg-rose-400"
              >
                <Siren className="h-4 w-4" />
                Open dispatch console
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Reveal>
          </div>
        </section>

        {/* Network + defense */}
        <section id="network" className="border-b border-white/[0.06] bg-[#08131d] px-5 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5eead4]/25 bg-[#062d2b]/60 px-3 py-1.5 text-xs font-medium text-[#9df5e7]">
                <Shield className="h-3.5 w-3.5" /> Government &amp; military
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Defence Health Network</h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
                A secure military medical command system connecting tertiary command hospitals, secondary regional
                hospitals and primary field clinics. Manage personnel records, extend remote specialist support to
                deployed forces and triage between military facilities from one platform.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {[
                  'Three-tier facility hierarchy with command structure',
                  'Field consultations from smart clinics and deployed units',
                  'Secure patient transfer records across the network',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#5eead4]/10 text-[#5eead4]">
                      <Check className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => goTo('/defense-health')}
                className="group mt-8 inline-flex h-11 items-center gap-2 rounded-xl border border-[#5eead4]/30 bg-[#5eead4]/10 px-5 text-sm font-semibold text-[#9df5e7] transition hover:bg-[#5eead4]/20"
              >
                Access Defence Health Network
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Reveal>

            <Reveal delay={120}>
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02]">
                <div className="relative">
                  <img
                    src="/assets/care-team.jpg"
                    alt="Two clinicians walking and talking in a hospital corridor"
                    loading="lazy"
                    className="h-[300px] w-full object-cover object-top sm:h-[340px]"
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#08131d] via-transparent to-transparent" />
                </div>
                <div className="space-y-2 p-4">
                  {networkCards.map((card) => (
                    <div
                      key={card.title}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 transition hover:border-white/15 hover:bg-white/[0.06]"
                    >
                      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', card.tone)}>
                        <card.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{card.title}</p>
                        <p className="text-xs text-slate-400">{card.text}</p>
                      </div>
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-600" />
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 py-20 lg:px-8 lg:py-24">
          <Reveal className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0c2b3a] via-[#0a2231] to-[#07231f] p-8 sm:p-12">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(94,234,212,.22),transparent_45%)]" />
              <div aria-hidden className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sky-500/15 blur-[80px]" />
              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5eead4]">Get started</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Ready to connect your care network?
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-slate-300">
                    Whether you need care or want to offer your expertise, Telemed-X gives you a secure path in.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {portals.map((portal) => (
                      <button
                        key={portal.path}
                        onClick={() => goTo(portal.path)}
                        className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-slate-300 transition hover:border-[#5eead4]/50 hover:text-white"
                      >
                        {portal.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:max-w-sm">
                  <button
                    onClick={() => goTo('/telemed-x/patient?mode=signup')}
                    className="group inline-flex h-12 items-center justify-between rounded-xl bg-[#5eead4] px-5 text-sm font-semibold text-[#04231f] transition hover:bg-[#7cf3e1]"
                  >
                    Create a patient account
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <button
                    onClick={() => goTo('/telemed-x/doctor?mode=signup')}
                    className="inline-flex h-12 items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Join as a practitioner
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => goTo('/telemed-x/vendor-onboarding')}
                    className="inline-flex h-12 items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Register a lab or pharmacy
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <a
                    href="/TelemedX-Patient-v1.0.apk"
                    download
                    className="mt-1 inline-flex items-center justify-center gap-2 text-xs text-slate-400 transition hover:text-white"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    Download the Android app (APK)
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#08131d] px-5 py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/assets/Untitled-1.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
              <div>
                <p className="text-sm font-bold text-white">Telemed-X</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">by Trika Health</p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              One connected health ecosystem for patients, clinicians, facilities and emergency services.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Platform</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><a href="#platform" className="transition hover:text-white">Capabilities</a></li>
              <li><a href="#journey" className="transition hover:text-white">How it works</a></li>
              <li><a href="#emergency" className="transition hover:text-white">Emergency response</a></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Portals</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              {portals.map((portal) => (
                <li key={portal.path}>
                  <button onClick={() => goTo(portal.path)} className="transition hover:text-white">
                    {portal.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Network</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><button onClick={() => goTo('/telemed-x/hospitals')} className="transition hover:text-white">Hospitals</button></li>
              <li><button onClick={() => goTo('/telemed-x/vendors')} className="transition hover:text-white">Labs &amp; pharmacies</button></li>
              <li><button onClick={() => goTo('/defense-health')} className="transition hover:text-white">Defence health</button></li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Trika Health Systems. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5" /> Encrypted in transit and at rest
            </span>
            <a href="/" className="transition hover:text-white">Staff sign-in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
