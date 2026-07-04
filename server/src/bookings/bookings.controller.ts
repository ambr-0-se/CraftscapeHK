import { Body, Controller, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreatePendingWorkshopBookingDto } from './dto/create-pending-workshop-booking.dto';

@Controller('api/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('workshops/pending')
  async createPendingWorkshopBooking(@Body() dto: CreatePendingWorkshopBookingDto) {
    return this.bookingsService.createPendingWorkshopBooking(dto);
  }
}
