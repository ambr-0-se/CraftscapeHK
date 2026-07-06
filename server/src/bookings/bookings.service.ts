import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BookingContract,
  BookingStatus,
  BOOKING_STATUS_TRANSITIONS,
  EventType,
  PaymentStatus,
  WorkshopScheduleStatus,
  canTransition,
} from '@craftscape/contracts';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { Event } from '../entities/event.entity';
import { CreatePendingWorkshopBookingDto } from './dto/create-pending-workshop-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async createPendingWorkshopBooking(
    dto: CreatePendingWorkshopBookingDto,
  ): Promise<{
    booking: BookingContract;
    checkout: {
      status: 'stripe_pending';
      message: { zh: string; en: string };
    };
  }> {
    const event = await this.eventRepository.findOne({
      where: { id: Number(dto.eventId) },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${dto.eventId}" not found`);
    }

    const isWorkshop = event.eventType === EventType.Workshop || event.type === '工作坊';
    if (!isWorkshop) {
      throw new BadRequestException('Only workshop events can be booked');
    }

    if (!event.artisanId) {
      throw new BadRequestException('Workshop event is missing an artisan owner');
    }

    const schedule = event.schedules?.find((item) => item.id === dto.scheduleId);
    if (!schedule) {
      throw new NotFoundException(`Workshop schedule "${dto.scheduleId}" not found`);
    }

    if (schedule.status !== WorkshopScheduleStatus.Open) {
      throw new BadRequestException('Selected workshop schedule is not open for booking');
    }

    const existingPendingBookings = await this.bookingRepository.find({
      where: { scheduleId: dto.scheduleId },
    });
    const locallyHeldSeats = existingPendingBookings
      .filter((booking) =>
        [
          BookingStatus.HoldPending,
          BookingStatus.PendingPayment,
          BookingStatus.Confirmed,
        ].includes(booking.status as BookingStatus),
      )
      .reduce((sum, booking) => sum + booking.quantity, 0);
    const capacityAvailable = Math.max(schedule.capacity.capacityAvailable - locallyHeldSeats, 0);

    if (dto.quantity > capacityAvailable) {
      throw new BadRequestException('Selected quantity exceeds available workshop seats');
    }

    const booking: Booking = this.bookingRepository.create({
      id: `booking_${randomUUID()}`,
      customerId: dto.customerId ?? 'customer-demo',
      artisanId: event.artisanId,
      eventId: String(event.id),
      scheduleId: schedule.id,
      quantity: dto.quantity,
      status: BookingStatus.PendingPayment,
      paymentStatus: PaymentStatus.PendingCheckout,
      capacityHoldId: `hold_${randomUUID()}`,
      unitAmount: schedule.price,
      currency: schedule.currency,
      createdAt: new Date().toISOString(),
    });

    const saved = await this.bookingRepository.save(booking);

    return {
      booking: {
        id: saved.id,
        customerId: saved.customerId,
        artisanId: saved.artisanId,
        eventId: saved.eventId,
        scheduleId: saved.scheduleId,
        quantity: saved.quantity,
        status: saved.status as BookingStatus,
        paymentStatus: saved.paymentStatus as PaymentStatus,
        capacityHoldId: saved.capacityHoldId,
        orderId: saved.orderId,
      },
      checkout: {
        status: 'stripe_pending',
        message: {
          zh: '已建立待付款預約；Stripe 結帳將由付款工作流接手。',
          en: 'Pending booking created; Stripe checkout will be attached by the payments workflow.',
        },
      },
    };
  }

  async findAll(filters?: {
    customerId?: string;
    artisanId?: string;
  }): Promise<BookingContract[]> {
    const bookings = await this.bookingRepository.find({
      order: { createdAt: 'DESC' },
    });
    return bookings
      .filter((booking) => {
        if (filters?.customerId && booking.customerId !== filters.customerId) {
          return false;
        }
        if (filters?.artisanId && booking.artisanId !== filters.artisanId) {
          return false;
        }
        return true;
      })
      .map((booking) => this.toContract(booking));
  }

  async updateStatus(
    id: string,
    input: {
      status: BookingStatus;
      artisanId: string;
    },
  ): Promise<BookingContract> {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }
    if (booking.artisanId !== input.artisanId) {
      throw new ForbiddenException('This artisan cannot update this booking.');
    }
    if (
      !canTransition(
        BOOKING_STATUS_TRANSITIONS,
        booking.status as BookingStatus,
        input.status,
      )
    ) {
      throw new BadRequestException('This booking cannot move to the requested status.');
    }

    booking.status = input.status;
    return this.toContract(await this.bookingRepository.save(booking));
  }

  private toContract(booking: Booking): BookingContract {
    return {
      id: booking.id,
      customerId: booking.customerId,
      artisanId: booking.artisanId,
      eventId: booking.eventId,
      scheduleId: booking.scheduleId,
      quantity: booking.quantity,
      status: booking.status as BookingStatus,
      paymentStatus: booking.paymentStatus as PaymentStatus,
      capacityHoldId: booking.capacityHoldId,
      orderId: booking.orderId,
    };
  }
}
