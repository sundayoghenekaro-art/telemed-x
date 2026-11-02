import { describe, expect, it } from 'vitest';
import { STAFF_ROLE_PRIORITY, canAccessRoute, hasPermission } from '@/lib/access';

describe('Staff accounts route', () => {
  it('is open to administrators', () => {
    expect(hasPermission('admin', 'screen:staff')).toBe(true);
    expect(canAccessRoute('admin', '/staff')).toBe(true);
  });

  it('is closed to every other staff role', () => {
    for (const role of STAFF_ROLE_PRIORITY.filter((candidate) => candidate !== 'admin')) {
      expect(hasPermission(role, 'screen:staff')).toBe(false);
      expect(canAccessRoute(role, '/staff')).toBe(false);
    }
  });

  it('is closed when nobody is signed in', () => {
    expect(canAccessRoute(null, '/staff')).toBe(false);
  });
});
