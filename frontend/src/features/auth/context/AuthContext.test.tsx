import { describe, expect, it } from 'vitest';
import { isPrivilegedAdminEmail } from '@/features/auth/context/AuthContext';

describe('isPrivilegedAdminEmail', () => {
  it('matches the configured administrator email case-insensitively', () => {
    expect(isPrivilegedAdminEmail('thenectorgod@gmail.com')).toBe(true);
    expect(isPrivilegedAdminEmail('TheNectorGod@gmail.com')).toBe(true);
  });

  it('rejects any other email or empty value', () => {
    expect(isPrivilegedAdminEmail('someone@example.com')).toBe(false);
    expect(isPrivilegedAdminEmail(undefined)).toBe(false);
  });
});
