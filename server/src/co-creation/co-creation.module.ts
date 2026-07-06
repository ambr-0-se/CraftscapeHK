import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AiCreation } from '../entities/ai-creation.entity';
import { Artisan } from '../entities/artisan.entity';
import { CoCreationRequest } from '../entities/co-creation-request.entity';
import { CoCreationController } from './co-creation.controller';
import { CoCreationService } from './co-creation.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiCreation, Artisan, CoCreationRequest]), AiModule],
  controllers: [CoCreationController],
  providers: [CoCreationService],
  exports: [CoCreationService],
})
export class CoCreationModule {}
