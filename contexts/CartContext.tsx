import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { CartItemType } from '../shared/contracts';
import type { Event, WorkshopCartLine } from '../types';
import type { WorkshopScheduleContract } from '../shared/contracts';

interface AddWorkshopSeatsInput {
  event: Event;
  schedule: WorkshopScheduleContract;
  quantity: number;
}

interface CartContextValue {
  workshopLines: WorkshopCartLine[];
  workshopLineCount: number;
  workshopSeatCount: number;
  addWorkshopSeats: (input: AddWorkshopSeatsInput) => WorkshopCartLine;
  clearWorkshopLine: (lineId: string) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [workshopLines, setWorkshopLines] = useState<WorkshopCartLine[]>([]);

  const addWorkshopSeats = useCallback(
    ({ event, schedule, quantity }: AddWorkshopSeatsInput) => {
      const line: WorkshopCartLine = {
        id: `${event.id}-${schedule.id}-${Date.now()}`,
        item: {
          type: CartItemType.WorkshopSeat,
          eventId: String(event.id),
          scheduleId: schedule.id,
          quantity,
        },
        eventTitle: event.title,
        eventImage: event.image,
        artisanName: event.organizer,
        schedule,
        unitAmount: schedule.price,
        currency: schedule.currency,
        addedAt: new Date().toISOString(),
      };

      setWorkshopLines((current) => [
        line,
        ...current.filter(
          (item) =>
            item.item.eventId !== line.item.eventId ||
            item.item.scheduleId !== line.item.scheduleId,
        ),
      ]);

      return line;
    },
    [],
  );

  const clearWorkshopLine = useCallback((lineId: string) => {
    setWorkshopLines((current) => current.filter((line) => line.id !== lineId));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      workshopLines,
      workshopLineCount: workshopLines.length,
      workshopSeatCount: workshopLines.reduce((sum, line) => sum + line.item.quantity, 0),
      addWorkshopSeats,
      clearWorkshopLine,
    }),
    [addWorkshopSeats, clearWorkshopLine, workshopLines],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
