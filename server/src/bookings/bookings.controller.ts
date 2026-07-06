import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BookingStatus } from '@craftscape/contracts';
import { BookingsService } from './bookings.service';
import { CreatePendingWorkshopBookingDto } from './dto/create-pending-workshop-booking.dto';

@Controller('api/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  async findAll(
    @Query('customerId') customerId?: string,
    @Query('artisanId') artisanId?: string,
  ) {
    return this.bookingsService.findAll({ customerId, artisanId });
  }

  @Post('workshops/pending')
  async createPendingWorkshopBooking(@Body() dto: CreatePendingWorkshopBookingDto) {
    return this.bookingsService.createPendingWorkshopBooking(dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: BookingStatus; artisanId: string },
  ) {
    return this.bookingsService.updateStatus(id, body);
  }
}
