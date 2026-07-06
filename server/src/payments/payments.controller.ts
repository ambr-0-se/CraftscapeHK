import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

const DEMO_CUSTOMER_ID = 'customer-demo';

@Controller('api/checkout')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('session')
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.paymentsService.createCheckoutSession(dto);
  }

  @Get('orders')
  async getOrderHistory(@Query('customerId') customerId?: string) {
    return this.paymentsService.getOrderHistory(customerId || DEMO_CUSTOMER_ID);
  }

  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    return this.paymentsService.getOrder(id);
  }

  @Post('orders/:id/cancel')
  async cancelOrder(@Param('id') id: string, @Body('customerId') customerId?: string) {
    return this.paymentsService.cancelOrder(id, customerId);
  }
}
