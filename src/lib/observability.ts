/**
 * Client error reporting.
 *
 * Supabase does not collect browser errors, so without a sink an unhandled UI
 * failure is invisible to operators. Set `VITE_ERROR_REPORT_URL` to a collector
 * (Sentry tunnel, an edge function, a log drain) to make failures visible;
 * without it this only writes structured lines to the console.
 *
 * Reports never include user identifiers, form values, or the query string —
 * a query string can carry tokens, and a crash report is not a place for PHI.
 */

export type ErrorSource = 'error-boundary' | 'window-error' | 'unhandled-rejection';

export interface ErrorReport {
  id: string;
  source: ErrorSource;
  message: string;
  stack?: string;
  componentStack?: string;
  path: string;
  timestamp: string;
}

const MAX_TEXT = 400;
const MAX_TRACE = 4000;

function clip(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

export function errorReference(): string {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** Pathname only: a query string can hold one-time tokens. */
export function safePath(location: { pathname?: string } | undefined): string {
  return location?.pathname?.slice(0, 200) ?? '';
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: clip(error.message || error.name, MAX_TEXT), stack: error.stack ? clip(error.stack, MAX_TRACE) : undefined };
  }
  if (typeof error === 'string') return { message: clip(error, MAX_TEXT) };
  try {
    return { message: clip(JSON.stringify(error) ?? String(error), MAX_TEXT) };
  } catch {
    return { message: 'Unserialisable error value' };
  }
}

export function buildReport(error: unknown, source: ErrorSource, componentStack?: string): ErrorReport {
  const { message, stack } = describe(error);
  return {
    id: errorReference(),
    source,
    message,
    stack,
    componentStack: componentStack ? clip(componentStack, MAX_TRACE) : undefined,
    path: typeof window === 'undefined' ? '' : safePath(window.location),
    timestamp: new Date().toISOString(),
  };
}

function send(report: ErrorReport): void {
  const endpoint = import.meta.env.VITE_ERROR_REPORT_URL as string | undefined;
  if (!endpoint) return;
  try {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(() => {
      // A failing error reporter must never surface as a second failure.
    });
  } catch {
    // Same reason: fetch can throw synchronously on a malformed URL.
  }
}

/** Logs, forwards to the sink if configured, and returns the reference shown to the user. */
export function reportError(error: unknown, source: ErrorSource, componentStack?: string): string {
  const report = buildReport(error, source, componentStack);
  console.error(`[${report.source}] ${report.id}`, report.message, error);
  send(report);
  return report.id;
}

let handlersInstalled = false;

export function installErrorReporting(): void {
  if (handlersInstalled || typeof window === 'undefined') return;
  handlersInstalled = true;
  window.addEventListener('error', event => {
    reportError(event.error ?? event.message, 'window-error');
  });
  window.addEventListener('unhandledrejection', event => {
    reportError(event.reason, 'unhandled-rejection');
  });
}
