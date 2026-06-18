import { Module } from '@nestjs/common';
import { AnamnesisController } from './anamnesis.controller';
import { AnamnesisService } from './anamnesis.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnamnesisController],
  providers: [AnamnesisService],
  exports: [AnamnesisService],
})
export class AnamnesisModule {}