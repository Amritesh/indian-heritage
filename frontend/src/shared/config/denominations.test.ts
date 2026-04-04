import { describe, expect, it } from 'vitest';
import { resolveDenomination } from '@/shared/config/denominations';

describe('resolveDenomination', () => {
  it('resolves rupee', () => {
    expect(resolveDenomination('rupee')?.key).toBe('rupee');
    expect(resolveDenomination('One Rupee')?.key).toBe('rupee');
  });

  it('resolves half-rupee', () => {
    expect(resolveDenomination('half-rupee')?.key).toBe('half-rupee');
  });

  it('resolves anna fraction denominations', () => {
    expect(resolveDenomination('half anna')?.key).toBe('half-anna');
    expect(resolveDenomination('two anna')?.key).toBe('two-anna');
    expect(resolveDenomination('four anna')?.key).toBe('four-anna');
    expect(resolveDenomination('eight anna')?.key).toBe('eight-anna');
    expect(resolveDenomination('1/12 Anna')?.key).toBe('pie');
    expect(resolveDenomination('1/2 Pice')?.key).toBe('half-pice');
  });

  it('resolves sultanate and princely denomination aliases', () => {
    expect(resolveDenomination('Tanka')?.key).toBe('tanka');
    expect(resolveDenomination('1 Kori')?.key).toBe('kori');
    expect(resolveDenomination('1 Dokdo')?.key).toBe('dokdo');
    expect(resolveDenomination('Paisa')?.key).toBe('paisa');
    expect(resolveDenomination('3 Dokda')?.key).toBe('dokda');
    expect(resolveDenomination('Gold Fanam')?.key).toBe('fanam');
  });

  it('prefers the longest matching denomination phrase', () => {
    expect(resolveDenomination('half rupee coin')?.key).toBe('half-rupee');
  });

  it('returns null for unknown denominations', () => {
    expect(resolveDenomination('mystery coin')).toBeNull();
    expect(resolveDenomination('spice')).toBeNull();
  });
});
