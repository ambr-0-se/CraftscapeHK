import {
  MessageSenderRole,
  MessageThreadContextType,
  MessageType,
} from '@craftscape/contracts';
import type { LanguageCode } from '@craftscape/contracts';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMessageThreadDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  artisanId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsEnum(MessageThreadContextType)
  contextType: MessageThreadContextType;

  @IsString()
  contextId: string;

  @IsOptional()
  @IsString()
  contextLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  senderId?: string;

  @IsEnum(MessageSenderRole)
  senderRole: MessageSenderRole;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsString()
  originalText: string;

  @IsOptional()
  @IsString()
  sourceLanguage?: LanguageCode;

  @IsOptional()
  @IsString()
  targetLanguage?: LanguageCode;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @IsOptional()
  @IsString()
  clientMutationId?: string;
}

export class ReplayMessagesQueryDto {
  @IsOptional()
  @IsString()
  afterSequence?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
