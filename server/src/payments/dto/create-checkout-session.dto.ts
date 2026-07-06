import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CartItemType } from '@craftscape/contracts';

export class CheckoutItemDto {
  @IsEnum(CartItemType)
  type: CartItemType;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  coCreationRequestId?: string;
}

export class CreateCheckoutSessionDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @ValidateNested()
  @Type(() => CheckoutItemDto)
  item: CheckoutItemDto;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsIn(['success', 'failure', 'cancelled'])
  simulatedOutcome?: 'success' | 'failure' | 'cancelled';
}
