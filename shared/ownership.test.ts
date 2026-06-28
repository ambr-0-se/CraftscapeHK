import { describe, expect, it } from 'vitest';
import {
  UserRole,
  assertOwnershipUserId,
  isArtisanRole,
} from './ownership';

describe('ownership model', () => {
  it('treats artisan and admin roles as artisan-capable', () => {
    expect(isArtisanRole(UserRole.Artisan)).toBe(true);
    expect(isArtisanRole(UserRole.Admin)).toBe(true);
    expect(isArtisanRole(UserRole.Customer)).toBe(false);
  });

  it('rejects empty ownership user ids', () => {
    expect(() => assertOwnershipUserId('')).toThrow(/non-empty string/);
    expect(assertOwnershipUserId('user-123')).toBe('user-123');
  });
});
