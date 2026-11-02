import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      updateUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { describePasswordProblem } from '@/components/auth/ResetPasswordScreen';

describe('describePasswordProblem', () => {
  it('rejects a password shorter than the minimum', () => {
    expect(describePasswordProblem('short', 'short')).toBe('Use at least 8 characters.');
  });

  it('rejects a mismatched confirmation', () => {
    expect(describePasswordProblem('correct-horse', 'correct-horsf')).toBe(
      'The passwords do not match.',
    );
  });

  it('accepts a matching password of sufficient length', () => {
    expect(describePasswordProblem('correct-horse', 'correct-horse')).toBeNull();
  });
});
