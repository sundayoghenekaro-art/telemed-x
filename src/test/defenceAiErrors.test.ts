import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { AiError, mapProviderError } from '@/lib/defenceAi';

describe('mapProviderError', () => {
  it('tells the operator to replace a rejected key instead of retrying', () => {
    const error = mapProviderError('provider_auth_failed', 502);

    expect(error).toBeInstanceOf(AiError);
    expect(error.code).toBe('provider_error');
    expect(error.message).toContain('replace OPENAI_API_KEY');
    expect(error.message).not.toContain('Try again');
  });

  it('maps provider credit exhaustion to the credits state', () => {
    const error = mapProviderError('provider_credits_exhausted', 402);

    expect(error.code).toBe('credits_exhausted');
    expect(error.message).toContain('no credits remaining');
  });

  it('maps a missing provider secret to the not-configured state', () => {
    expect(mapProviderError('provider_not_configured', 503).code).toBe('not_configured');
  });

  it('falls back to the HTTP status when the body carries no provider code', () => {
    expect(mapProviderError(null, 401).code).toBe('unauthorized');
    expect(mapProviderError(null, 429).code).toBe('rate_limited');
    expect(mapProviderError(null, 504).code).toBe('offline');
    expect(mapProviderError(null, 502).code).toBe('provider_error');
    expect(mapProviderError(null, null).code).toBe('provider_error');
  });
});
