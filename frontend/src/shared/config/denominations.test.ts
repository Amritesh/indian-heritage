import { describe, expect, it } from 'vitest';
import { resolveDenomination } from '@/shared/config/denominations';

describe('resolveDenomination', () => {
  it('resolves rupee', () => {
    expect(resolveDenomination('rupee')?.key).toBe('rupee');
  });

  it('resolves half-rupee', () => {
    expect(resolveDenomination('half-rupee')?.key).toBe('half-rupee');
  });

  it('resolves anna fraction denominations', () => {
    expect(resolveDenomination('half anna')?.key).toBe('half-anna');
    expect(resolveDenomination('two anna')?.key).toBe('two-anna');
    expect(resolveDenomination('four anna')?.key).toBe('four-anna');
    expect(resolveDenomination('eight anna')?.key).toBe('eight-anna');
  });

  it('prefers the longest matching denomination phrase', () => {
    expect(resolveDenomination('half rupee coin')?.key).toBe('half-rupee');
  });

  it('returns null for unknown denominations', () => {
    expect(resolveDenomination('mystery coin')).toBeNull();
    expect(resolveDenomination('spice')).toBeNull();
  });
});
