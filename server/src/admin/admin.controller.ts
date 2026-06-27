import { Controller, Post } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('seed')
  async seedDatabase() {
    return this.adminService.seedDatabase();
  }

  @Post('reseed')
  async reseedDatabase() {
    return this.adminService.reseedDatabase();
  }
}
