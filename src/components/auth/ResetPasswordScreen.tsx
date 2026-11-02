import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

const MIN_LENGTH = 8;
/** Written by the pre-boot script in index.html before the auth client clears the URL hash. */
export const RECOVERY_MARKER = 'trika:password-recovery';

export function describePasswordProblem(password: string, confirmation: string): string | null {
  if (password.length < MIN_LENGTH) return `Use at least ${MIN_LENGTH} characters.`;
  if (password !== confirmation) return 'The passwords do not match.';
  return null;
}

function updateErrorMessage(message: string): string {
  if (/different from the old password/i.test(message)) {
    return 'Choose a password you have not used before.';
  }
  if (/weak|at least|characters|number|symbol/i.test(message)) return message;
  return 'Could not update the password. Request a new link and try again.';
}

type Stage = 'checking' | 'ready' | 'expired' | 'done';

function hasRecoveryMarker() {
  try {
    return sessionStorage.getItem(RECOVERY_MARKER) === '1';
  } catch {
    return false;
  }
}

function clearRecoveryMarker() {
  try {
    sessionStorage.removeItem(RECOVERY_MARKER);
  } catch {
    // Storage can be unavailable in private modes; the link is single-use anyway.
  }
}

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('checking');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasRecoveryMarker()) setStage('ready');
    else setStage('expired');

    // The marker covers the common case; this keeps a link that arrives after a
    // client-side navigation working as well.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setStage('ready');
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = describePasswordProblem(password, confirmation);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setIsSaving(false);
      if (/session|jwt|expired/i.test(updateError.message)) {
        clearRecoveryMarker();
        setStage('expired');
        return;
      }
      setError(updateErrorMessage(updateError.message));
      return;
    }

    clearRecoveryMarker();
    await supabase.auth.signOut();
    setIsSaving(false);
    setStage('done');
  };

  return (
    <div className="min-h-screen bg-[#f3f7fa] lg:grid lg:h-screen lg:grid-cols-[1.05fr_0.95fr] lg:overflow-hidden">
      <aside className="relative hidden overflow-hidden bg-[#07141f] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <img
          src="/assets/care-team.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,18,28,.88)_0%,rgba(5,18,28,.46)_45%,rgba(5,18,28,.94)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(94,234,212,.22),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(56,189,248,.16),transparent_45%)]"
        />

        <div className="relative flex items-center gap-3">
          <img
            src="/assets/Untitled-1.png"
            alt=""
            className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/25"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">TRIKA</h1>
            <p className="text-sm text-white/60">Digital Health Ecosystem</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.02em] text-white">
            Secure account recovery
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Reset links are single-use and expire quickly. Your new password takes effect
            immediately and ends any other sessions.
          </p>
        </div>

        <div className="relative text-xs text-white/45">© 2026 TRIKA Healthcare Systems</div>
      </aside>

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

          {stage === 'checking' && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your reset link…
            </div>
          )}

          {stage === 'expired' && (
            <div role="alert">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[1.7rem] font-bold tracking-tight text-foreground">
                This link has expired
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Reset links work once and expire quickly. Request a new one from the sign-in page
                and open it in this browser.
              </p>
              <Button className="mt-6" onClick={() => navigate('/', { replace: true })}>
                Request a new link
              </Button>
            </div>
          )}

          {stage === 'ready' && (
            <>
              <div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-[1.7rem] font-bold tracking-tight text-foreground">
                  Set a new password
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Choose a new password for your staff account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">At least {MIN_LENGTH} characters.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </form>
            </>
          )}

          {stage === 'done' && (
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[1.7rem] font-bold tracking-tight text-foreground">
                Password updated
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Sign in with your new password to continue.
              </p>
              <Button className="mt-6" onClick={() => navigate('/', { replace: true })}>
                Go to sign in
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
