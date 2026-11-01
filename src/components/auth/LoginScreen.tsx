import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Crosshair,
  Eye,
  EyeOff,
  Fingerprint,
  FlaskConical,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  MailWarning,
  Pill,
  Play,
  Radio,
  Shield,
  ShieldCheck,
  Stethoscope,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { UserRole } from '@/types/dhos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onDemoLogin?: (role: UserRole) => void;
}

const roles: {
  value: UserRole;
  label: string;
  description: string;
  icon: typeof Stethoscope;
}[] = [
  { value: 'physician', label: 'Physician', description: 'Clinical care & orders', icon: Stethoscope },
  { value: 'nurse', label: 'Nurse', description: 'Patient care & vitals', icon: HeartPulse },
  { value: 'receptionist', label: 'Front Desk', description: 'Appointments & registration', icon: CalendarDays },
  { value: 'pharmacist', label: 'Pharmacist', description: 'Medication management', icon: Pill },
  { value: 'radiologist', label: 'Radiologist', description: 'Imaging & reports', icon: Radio },
  { value: 'lab_technician', label: 'Lab Tech', description: 'Laboratory services', icon: FlaskConical },
  { value: 'billing', label: 'Billing', description: 'Invoices & payments', icon: CreditCard },
  { value: 'admin', label: 'Administrator', description: 'System management', icon: ShieldCheck },
];

const trustPoints = [
  { icon: ShieldCheck, title: 'Role-based access', text: 'Every screen and action is permissioned' },
  { icon: Shield, title: 'Audit trail', text: 'Clinical actions are recorded end to end' },
  { icon: HeartPulse, title: 'Connected records', text: 'Context follows the patient across facilities' },
];

export function LoginScreen({ onLogin, onDemoLogin }: LoginScreenProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('physician');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapName, setBootstrapName] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const selectedRoleMeta = roles.find((role) => role.value === selectedRole);

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Password reset link sent. Please check your email.');
      setShowResetDialog(false);
      setResetEmail('');
    } catch (err) {
      console.error('Password reset failed:', err);
      toast.error('Could not send reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleBootstrapAdmin = async () => {
    if (!email || !password) {
      toast.error('Please enter your email and password first, then sign in before bootstrapping.');
      return;
    }

    setIsBootstrapping(true);
    try {
      let session = (await supabase.auth.getSession()).data.session;

      if (!session) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: { name: bootstrapName || email.split('@')[0], role: 'admin' },
            },
          });
          if (signUpError) {
            console.error('Bootstrap signUp failed:', signUpError);
            toast.error('Could not create an account. Please try again.');
            return;
          }
          if (signUpData.user && !signUpData.session) {
            toast.info('Please check your email to confirm your account, then try bootstrapping again.');
            return;
          }
          session = signUpData.session;
        } else {
          session = data.session;
        }
      }

      if (!session) {
        toast.error('Could not authenticate. Please sign in first.');
        return;
      }

      const response = await supabase.functions.invoke('bootstrap-admin', {
        body: { full_name: bootstrapName || email.split('@')[0] },
      });

      if (response.error) {
        console.error('Bootstrap edge function error:', response.error);
        toast.error('Bootstrap failed. Please try again.');
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success('You are now the system administrator! The page will reload.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Bootstrap failed:', err);
      toast.error('Bootstrap failed. Please try again.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'Invalid login credentials') {
        toast.error('Incorrect email or password. Please try again.');
      } else if (
        message !== 'No staff role assigned' &&
        message !== 'Email not confirmed' &&
        !message.startsWith('Could not verify')
      ) {
        toast.error('Could not sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f7fa] lg:grid lg:h-screen lg:grid-cols-[1.05fr_0.95fr] lg:overflow-hidden">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-[#07141f] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <img
          src="/assets/care-team.jpg"
          alt="Two clinicians talking while walking through a hospital corridor"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,18,28,.86)_0%,rgba(5,18,28,.42)_42%,rgba(5,18,28,.92)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(94,234,212,.22),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(56,189,248,.16),transparent_45%)]"
        />

        <div className="relative flex items-center gap-3">
          <span className="relative flex h-12 w-12 items-center justify-center">
            <img
              src="/assets/Untitled-1.png"
              alt=""
              className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/25"
            />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">TRIKA</h1>
            <p className="text-sm text-white/60">Digital Health Ecosystem</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#9df5e7] backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5eead4] opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#5eead4]" />
            </span>
            Hospital operations
          </span>

          <h2 className="mt-6 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white xl:text-[2.9rem]">
            The clinical workspace
            <span className="block bg-gradient-to-r from-[#9df5e7] to-[#7dd3fc] bg-clip-text text-transparent">
              for connected care teams
            </span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
            One secure environment for patient records, orders, bed management, pharmacy, diagnostics and billing —
            governed by a single access policy.
          </p>

          <div className="mt-8 space-y-2.5">
            {trustPoints.map((point) => (
              <div
                key={point.title}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition hover:bg-white/10"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#5eead4]/15 text-[#9df5e7]">
                  <point.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{point.title}</p>
                  <p className="text-xs text-white/55">{point.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/45">
          <span>© 2026 TRIKA Healthcare Systems</span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Encrypted in transit and at rest
          </span>
        </div>
      </aside>

      {/* Form panel */}
      <div className="scrollbar-thin relative flex min-h-screen flex-col bg-[#f3f7fa] px-5 py-10 sm:px-8 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(56,189,248,.12),transparent_55%),radial-gradient(circle_at_15%_100%,rgba(94,234,212,.12),transparent_50%)]"
        />

        <div className="page-enter relative mx-auto my-auto w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <img src="/assets/Untitled-1.png" alt="" className="h-11 w-11 rounded-xl object-cover" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">TRIKA</h1>
              <p className="text-xs text-muted-foreground">Digital Healthcare Ecosystem Platform</p>
            </div>
          </div>

          <div>
            <h2 className="text-[1.7rem] font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your workspace, or explore a portal below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {/* Demo role picker — development only; it drives demo mode, never the real session */}
            {import.meta.env.DEV && onDemoLogin && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Demo role
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Development only</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => {
                    const active = selectedRole === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedRole(role.value)}
                        aria-pressed={active}
                        className={cn(
                          'group flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-200',
                          active
                            ? 'border-primary/60 bg-primary/[0.07] shadow-[0_6px_18px_-12px_rgba(38,139,182,.7)] ring-1 ring-primary/25'
                            : 'border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition',
                            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <role.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-foreground">{role.label}</span>
                          <span className="mt-0.5 block truncate text-[10px] leading-tight text-muted-foreground">
                            {role.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="doctor@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-border bg-card pl-10 transition-shadow focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary-strong hover:underline"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetDialog(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-border bg-card pl-10 pr-12 transition-shadow focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-[hsl(174_55%_45%)] text-sm font-semibold text-primary-foreground shadow-[0_16px_32px_-18px_hsl(var(--primary)/0.9)] transition hover:brightness-105 active:scale-[0.99]"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in to dashboard'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full rounded-xl gap-2 border-border bg-card text-sm"
            >
              <Fingerprint className="h-4 w-4 text-primary-strong" />
              Sign in with biometrics
            </Button>

            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              Explore a portal
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/telemed-x')}
                className="group flex flex-col gap-2 rounded-xl border border-[#0f9b8e]/25 bg-gradient-to-br from-[#0d5f63]/[0.06] to-[#0d5f63]/[0.12] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#0f9b8e]/50 hover:shadow-[0_14px_28px_-20px_rgba(13,95,99,.8)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f9b8e]/15 text-[#0d7a72]">
                  <Zap className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-foreground">Telemed-X</span>
                <span className="text-[10px] leading-tight text-muted-foreground">Virtual healthcare platform</span>
                <ArrowUpRight className="h-3.5 w-3.5 self-end text-muted-foreground transition group-hover:text-[#0d7a72]" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/defense-health')}
                className="group flex flex-col gap-2 rounded-xl border border-amber-600/25 bg-gradient-to-br from-amber-500/[0.06] to-amber-600/[0.12] p-3 text-left transition hover:-translate-y-0.5 hover:border-amber-600/50 hover:shadow-[0_14px_28px_-20px_rgba(180,120,10,.7)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                  <Crosshair className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-foreground">Defence Health</span>
                <span className="text-[10px] leading-tight text-muted-foreground">Military medical command</span>
                <ArrowUpRight className="h-3.5 w-3.5 self-end text-muted-foreground transition group-hover:text-amber-700" />
              </button>
            </div>

            {onDemoLogin && (
              <button
                type="button"
                onClick={() => onDemoLogin(selectedRole)}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-primary/35 bg-primary/[0.04] px-4 py-3 text-left transition hover:border-primary/60 hover:bg-primary/[0.08]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary-strong">
                    <Play className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      Enter demo mode as {selectedRoleMeta?.label ?? 'Physician'}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Explore with illustrative clinical data
                    </span>
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-primary-strong transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            )}
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card/70 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-strong" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Secure access</p>
              <p className="mt-0.5 text-muted-foreground">
                This system is monitored. Every access is logged for audit compliance.
              </p>
            </div>
          </div>

          {import.meta.env.DEV && (
            <details className="group mt-4">
              <summary className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                First time setup? Bootstrap admin account
              </summary>
              <div className="mt-3 space-y-3 rounded-xl border border-primary/20 bg-card p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  On a fresh installation with no admin account, enter your details above (email &amp; password),
                  provide your name below, and bootstrap. This only works once.
                </p>
                <Input
                  placeholder="Your full name (e.g. Dr. Admin)"
                  value={bootstrapName}
                  onChange={(e) => setBootstrapName(e.target.value)}
                  className="h-10"
                />
                <Button
                  type="button"
                  onClick={handleBootstrapAdmin}
                  disabled={isBootstrapping || !email || !password}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {isBootstrapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Bootstrap admin account
                </Button>
              </div>
            </details>
          )}
        </div>
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailWarning className="h-5 w-5 text-primary" />
              Reset your password
            </DialogTitle>
            <DialogDescription>
              Enter your email address and we&apos;ll send you a link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="reset-email" className="mb-2 block">
              Email address
            </Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="doctor@hospital.org"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="h-12"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleResetPassword();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={isResetting}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting || !resetEmail}>
              {isResetting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </span>
              ) : (
                'Send reset link'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
