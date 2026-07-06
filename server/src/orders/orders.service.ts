import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ORDER_STATUS_TRANSITIONS,
  OrderStatus,
  canTransition,
} from '@craftscape/contracts';
import { Order } from '../entities/order.entity';

const ARTISAN_NAME_TO_USER_ID = new Map<string, string>([
  ['Master Zhang', 'artisan-1'],
  ['張師傅', 'artisan-1'],
  ['Master Lau', 'artisan-2'],
  ['劉師傅', 'artisan-2'],
  ['Master Chan', 'artisan-3'],
  ['陳師傅', 'artisan-3'],
  ['Master Wong', 'artisan-4'],
  ['王師傅', 'artisan-4'],
  ['Master Lee', 'artisan-5'],
  ['李師傅', 'artisan-5'],
  ['Master Polar Wafter', 'artisan-6'],
  ['Polar wafter 師傅', 'artisan-6'],
  ['Master from Leung So Kee', 'artisan-7'],
  ['梁蘇記 師傅', 'artisan-7'],
  ['Master from Neonlitehk', 'artisan-8'],
  ['Neonlitehk 師傅', 'artisan-8'],
]);

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
  ) {}

  async findAll(filters?: { customerId?: string; artisanId?: string }): Promise<Order[]> {
    const orders = await this.ordersRepository.find({
      relations: ['product'],
    });

    return orders.filter((order) => {
      if (filters?.customerId && order.customerId !== filters.customerId) {
        return false;
      }
      if (filters?.artisanId && this.getProductArtisanUserId(order) !== filters.artisanId) {
        return false;
      }
      return true;
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return order;
  }

  async updateStatus(
    id: string,
    input: {
      status: OrderStatus;
      artisanId: string;
    },
  ): Promise<Order> {
    const order = await this.findOne(id);
    const ownerId = this.getProductArtisanUserId(order);
    if (!ownerId || ownerId !== input.artisanId) {
      throw new ForbiddenException('This artisan cannot update this order.');
    }

    const currentStatus = this.toContractStatus(order.status);
    if (!canTransition(ORDER_STATUS_TRANSITIONS, currentStatus, input.status)) {
      throw new BadRequestException('This order cannot move to the requested status.');
    }

    order.status = input.status;
    return this.ordersRepository.save(order);
  }

  private getProductArtisanUserId(order: Order): string | null {
    if (order.product?.artisanId) {
      return `artisan-${order.product.artisanId}`;
    }
    const artisan = order.product?.artisan;
    return (
      ARTISAN_NAME_TO_USER_ID.get(artisan?.en ?? '') ??
      ARTISAN_NAME_TO_USER_ID.get(artisan?.zh ?? '') ??
      null
    );
  }

  private toContractStatus(status: string): OrderStatus {
    switch (status) {
      case '待處理':
        return OrderStatus.Paid;
      case '已發貨':
        return OrderStatus.Shipped;
      case '已完成':
        return OrderStatus.Completed;
      case '已取消':
        return OrderStatus.Cancelled;
      default:
        if (Object.values(OrderStatus).includes(status as OrderStatus)) {
          return status as OrderStatus;
        }
        return OrderStatus.Paid;
    }
  }
}
