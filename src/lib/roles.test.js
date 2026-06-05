import { describe, expect, it } from 'vitest';
import { canAccessPage, filterPagesForRole, ROLE_SLUGS } from './roles.js';

describe('role-based access control', () => {
  it('lets the first-account super admin access every primary page', () => {
    expect(canAccessPage(ROLE_SLUGS.SUPER_ADMIN, 'users')).toBe(true);
    expect(canAccessPage(ROLE_SLUGS.SUPER_ADMIN, 'settings')).toBe(true);
    expect(canAccessPage(ROLE_SLUGS.SUPER_ADMIN, 'network')).toBe(true);
  });

  it('lets admins access every primary page', () => {
    expect(canAccessPage(ROLE_SLUGS.ADMIN, 'users')).toBe(true);
    expect(canAccessPage(ROLE_SLUGS.ADMIN, 'settings')).toBe(true);
    expect(canAccessPage(ROLE_SLUGS.ADMIN, 'network')).toBe(true);
  });

  it('keeps viewers out of privileged pages', () => {
    expect(canAccessPage(ROLE_SLUGS.VIEWER, 'dashboard')).toBe(true);
    expect(canAccessPage(ROLE_SLUGS.VIEWER, 'audit')).toBe(false);
    expect(canAccessPage(ROLE_SLUGS.VIEWER, 'settings')).toBe(false);
    expect(canAccessPage(ROLE_SLUGS.VIEWER, 'users')).toBe(false);
  });

  it('filters navigation by database role slug', () => {
    const visible = filterPagesForRole([
      { id: 'dashboard' },
      { id: 'users' },
      { id: 'settings' }
    ], ROLE_SLUGS.VIEWER);

    expect(visible).toEqual([{ id: 'dashboard' }]);
  });
});
