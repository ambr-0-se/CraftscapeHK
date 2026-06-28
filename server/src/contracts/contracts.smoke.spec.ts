import {
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
  canTransition,
} from '@craftscape/contracts';
import { UserRole, isArtisanRole } from '@craftscape/contracts/ownership';

describe('@craftscape/contracts package', () => {
  it('loads order transition helpers from the shared package', () => {
    expect(
      canTransition(
        ORDER_STATUS_TRANSITIONS,
        OrderStatus.PendingPayment,
        OrderStatus.Paid,
      ),
    ).toBe(true);
  });

  it('loads ownership helpers from the ownership subpath', () => {
    expect(isArtisanRole(UserRole.Artisan)).toBe(true);
    expect(isArtisanRole(UserRole.Customer)).toBe(false);
  });
});
