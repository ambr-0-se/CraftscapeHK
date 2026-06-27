import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { TranslationController } from './translation.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController, TranslationController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}