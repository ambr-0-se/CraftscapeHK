import {
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
  canTransition,
} from '@craftscape/contracts';

export function isValidOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return canTransition(ORDER_STATUS_TRANSITIONS, from, to);
}
