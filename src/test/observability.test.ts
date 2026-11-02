import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReport, errorReference, reportError, safePath } from '@/lib/observability';

describe('error references', () => {
  it('is eight lowercase hex characters', () => {
    expect(errorReference()).toMatch(/^[0-9a-f]{8}$/);
  });

  it('does not repeat itself', () => {
    const ids = new Set(Array.from({ length: 50 }, () => errorReference()));
    expect(ids.size).toBe(50);
  });
});

describe('path sanitising', () => {
  it('keeps the pathname and nothing else', () => {
    expect(safePath({ pathname: '/clinic/lab' })).toBe('/clinic/lab');
  });

  it('returns empty when there is no location', () => {
    expect(safePath(undefined)).toBe('');
  });

  it('drops a query string that could hold a token', () => {
    window.history.pushState({}, '', '/defence/hub?token=super-secret#section');
    const report = buildReport(new Error('boom'), 'window-error');
    expect(report.path).toBe('/defence/hub');
    expect(JSON.stringify(report)).not.toContain('super-secret');
  });
});

describe('report construction', () => {
  it('captures a message and truncates long stack traces', () => {
    const error = new Error('x'.repeat(6000));
    const report = buildReport(error, 'error-boundary', 'component stack');
    expect(report.message).toHaveLength(401);
    expect(report.stack?.length).toBeLessThanOrEqual(4001);
    expect(report.componentStack).toBe('component stack');
    expect(report.source).toBe('error-boundary');
    expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles non-Error values without throwing', () => {
    expect(buildReport('plain string', 'window-error').message).toBe('plain string');
    expect(buildReport({ code: 42 }, 'unhandled-rejection').message).toBe('{"code":42}');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(buildReport(circular, 'window-error').message).toBe('Unserialisable error value');
  });
});

describe('reporting', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    errorSpy.mockRestore();
  });

  it('logs the reference it returns', () => {
    const id = reportError(new Error('boom'), 'window-error');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain(id);
  });

  it('sends nothing when no endpoint is configured', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubEnv('VITE_ERROR_REPORT_URL', '');
    reportError(new Error('boom'), 'window-error');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts a sanitised report when an endpoint is configured', () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubEnv('VITE_ERROR_REPORT_URL', 'https://collector.test/errors');
    window.history.pushState({}, '', '/clinic?token=super-secret');

    const id = reportError(new Error('boom'), 'unhandled-rejection');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://collector.test/errors');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.id).toBe(id);
    expect(body.source).toBe('unhandled-rejection');
    expect(init.body).not.toContain('super-secret');
  });

  it('never throws when the collector is unreachable', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    vi.stubEnv('VITE_ERROR_REPORT_URL', 'https://collector.test/errors');
    expect(() => reportError(new Error('boom'), 'window-error')).not.toThrow();
  });

  it('never throws when the endpoint is malformed', () => {
    vi.stubGlobal('fetch', vi.fn(() => {
      throw new Error('invalid url');
    }));
    vi.stubEnv('VITE_ERROR_REPORT_URL', 'not a url');
    expect(() => reportError(new Error('boom'), 'window-error')).not.toThrow();
  });
});

describe('global handlers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('installs once and reports window errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { installErrorReporting } = await import('@/lib/observability');

    installErrorReporting();
    installErrorReporting();
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('crash') }));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain('window-error');
  });
});
