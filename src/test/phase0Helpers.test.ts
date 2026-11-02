import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createSignedUrl: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({ createSignedUrl: mocks.createSignedUrl }),
    },
  },
}));

import { PAGE_SIZE, afterCursor, hasNextPage, pageCursor } from '@/lib/pagination';
import { SIGNED_URL_TTL_SECONDS, signedUrl, storagePathFrom } from '@/lib/storage';

describe('storagePathFrom', () => {
  it('returns a bare object path unchanged', () => {
    expect(storagePathFrom('patient/abc/scan.pdf', 'medical-records')).toBe('patient/abc/scan.pdf');
  });

  it('extracts the key from a legacy public URL', () => {
    expect(
      storagePathFrom(
        'https://xyz.supabase.co/storage/v1/object/public/medical-records/patient/abc/scan.pdf',
        'medical-records',
      ),
    ).toBe('patient/abc/scan.pdf');
  });

  it('strips query strings and fragments', () => {
    expect(
      storagePathFrom('https://xyz.supabase.co/storage/v1/object/sign/medical-records/a/b.pdf?token=1#p', 'medical-records'),
    ).toBe('a/b.pdf');
    expect(storagePathFrom('a/b.pdf?token=1', 'medical-records')).toBe('a/b.pdf');
  });

  it('decodes percent-encoded keys', () => {
    expect(
      storagePathFrom('https://xyz.supabase.co/storage/v1/object/public/profile-photos/Dr%20Eze.jpg', 'profile-photos'),
    ).toBe('Dr Eze.jpg');
  });

  it('rejects URLs belonging to another bucket', () => {
    expect(
      storagePathFrom('https://xyz.supabase.co/storage/v1/object/public/profile-photos/x.jpg', 'medical-records'),
    ).toBeNull();
  });

  it('rejects empty values and non-storage schemes', () => {
    expect(storagePathFrom(null, 'medical-records')).toBeNull();
    expect(storagePathFrom(undefined, 'medical-records')).toBeNull();
    expect(storagePathFrom('   ', 'medical-records')).toBeNull();
    expect(storagePathFrom('data:text/plain;base64,AAAA', 'medical-records')).toBeNull();
  });
});

describe('signedUrl', () => {
  beforeEach(() => {
    mocks.createSignedUrl.mockReset();
  });

  it('mints a signed URL with the default TTL', async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed/1' }, error: null });

    await expect(signedUrl('medical-records', 'patient/abc/scan.pdf')).resolves.toBe('https://signed/1');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      'patient/abc/scan.pdf',
      SIGNED_URL_TTL_SECONDS,
      undefined,
    );
  });

  it('asks Storage for an attachment when a download name is given', async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed/2' }, error: null });

    await signedUrl('medical-records', 'a/b.pdf', 120, 'discharge summary.pdf');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('a/b.pdf', 120, { download: 'discharge summary.pdf' });
  });

  it('returns null without calling Storage when there is no usable path', async () => {
    await expect(signedUrl('medical-records', null)).resolves.toBeNull();
    await expect(signedUrl('medical-records', 'https://xyz.supabase.co/storage/v1/object/public/other/x.pdf')).resolves.toBeNull();
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns null when Storage reports an error', async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    await expect(signedUrl('medical-records', 'a/b.pdf')).resolves.toBeNull();
  });
});

describe('pageCursor', () => {
  const rows = [
    { id: 'c', created_at: '2026-11-01T10:00:00Z' },
    { id: 'b', created_at: '2026-11-01T09:00:00Z' },
  ];

  it('takes the last row as the cursor', () => {
    expect(pageCursor(rows, 'created_at')).toEqual({ value: '2026-11-01T09:00:00Z', id: 'b' });
  });

  it('returns null when there is nothing to page from', () => {
    expect(pageCursor([], 'created_at')).toBeNull();
    expect(pageCursor([{ id: 'a' }], 'created_at')).toBeNull();

    const missingId = [{ id: '', created_at: '2026-11-01T09:00:00Z' }];
    expect(pageCursor(missingId, 'created_at')).toBeNull();
  });

  it('ignores timestamps returned as Date objects', () => {
    const dateValue = [{ id: 'a', created_at: new Date('2026-11-01T09:00:00Z') }];
    expect(pageCursor(dateValue, 'created_at')).toBeNull();
  });
});

describe('afterCursor', () => {
  it('leaves the query untouched on the first page', () => {
    const query = { or: vi.fn() };
    expect(afterCursor(query, null, 'created_at')).toBe(query);
    expect(query.or).not.toHaveBeenCalled();
  });

  it('adds the composite keyset predicate', () => {
    const or = vi.fn((filter: string) => ({ filter }));
    afterCursor({ or }, { value: '2026-11-01T09:00:00Z', id: 'b' }, 'created_at');
    expect(or).toHaveBeenCalledWith('created_at.lt.2026-11-01T09:00:00Z,and(created_at.eq.2026-11-01T09:00:00Z,id.lt.b)');
  });
});

describe('hasNextPage', () => {
  it('is true only when an extra row came back', () => {
    expect(hasNextPage(Array.from({ length: PAGE_SIZE }, (_, i) => i))).toBe(false);
    expect(hasNextPage(Array.from({ length: PAGE_SIZE + 1 }, (_, i) => i))).toBe(true);
    expect(hasNextPage([1, 2, 3], 2)).toBe(true);
  });
});
