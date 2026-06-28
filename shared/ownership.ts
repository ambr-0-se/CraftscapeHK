/**
 * Platform ownership identifiers for MVP domain records.
 *
 * `customerId` and `artisanId` values in `shared/contracts.ts` refer to `User.id`.
 */
export enum UserRole {
  Customer = 'customer',
  Artisan = 'artisan',
  Admin = 'admin',
}

export type OwnershipUserId = string;

export interface UserOwnershipContract {
  id: OwnershipUserId;
  role: UserRole;
  displayName: string;
  email?: string;
}

/**
 * Links a platform user account to the legacy numeric artisan profile row.
 */
export interface ArtisanProfileLinkContract {
  userId: OwnershipUserId;
  artisanProfileId?: number;
}

export function isArtisanRole(role: UserRole): boolean {
  return role === UserRole.Artisan || role === UserRole.Admin;
}

export function assertOwnershipUserId(value: string): OwnershipUserId {
  if (!value.trim()) {
    throw new Error('Ownership user id must be a non-empty string.');
  }

  return value;
}
