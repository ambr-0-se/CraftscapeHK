import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePendingWorkshopBookingDto {
  @IsString()
  eventId: string;

  @IsString()
  scheduleId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  customerId?: string;
}
