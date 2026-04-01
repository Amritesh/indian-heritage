import { describe, expect, it } from 'vitest';
import { resolveDenomination } from '@/shared/config/denominations';

describe('resolveDenomination', () => {
  it('resolves rupee', () => {
    expect(resolveDenomination('rupee')?.key).toBe('rupee');
  });

  it('resolves half-rupee', () => {
    expect(resolveDenomination('half-rupee')?.key).toBe('half-rupee');
  });

  it('returns null for unknown denominations', () => {
    expect(resolveDenomination('mystery coin')).toBeNull();
  });
});
