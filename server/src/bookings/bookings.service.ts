import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BookingContract,
  BookingStatus,
  EventType,
  PaymentStatus,
  WorkshopScheduleStatus,
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
    // Confirmed bookings are already reflected in the schedule's persisted
    // capacity snapshot (payments workflow), so only count in-flight holds here.
    const locallyHeldSeats = existingPendingBookings
      .filter((booking) =>
        [BookingStatus.HoldPending, BookingStatus.PendingPayment].includes(
          booking.status as BookingStatus,
        ),
      )
      .reduce((sum, booking) => sum + booking.quantity, 0);
    const capacityAvailable = Math.max(schedule.capacity.capacityAvailable - locallyHeldSeats, 0);

    if (dto.quantity > capacityAvailable) {
      throw new BadRequestException('Selected quantity exceeds available workshop seats');
    }

    const booking: Booking = this.bookingRepository.create({
      id: `booking_${randomUUID()}`,
      customerId: dto.customerId ?? 'customer_demo',
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
}
