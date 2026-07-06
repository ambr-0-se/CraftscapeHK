import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { OrderStatus } from '@craftscape/contracts';
import { OrdersService } from './orders.service';
import { Order } from '../entities/order.entity';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @Query('customerId') customerId?: string,
    @Query('artisanId') artisanId?: string,
  ): Promise<Order[]> {
    return this.ordersService.findAll({ customerId, artisanId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Order> {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus; artisanId: string },
  ): Promise<Order> {
    return this.ordersService.updateStatus(id, body);
  }
}
