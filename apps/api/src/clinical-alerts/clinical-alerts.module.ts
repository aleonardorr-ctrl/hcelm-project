import { Module } from '@nestjs/common';
import { ClinicalAlertsController } from './clinical-alerts.controller';
import { ClinicalAlertsService } from './clinical-alerts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicalAlertsController],
  providers: [ClinicalAlertsService],
  exports: [ClinicalAlertsService],
})
export class ClinicalAlertsModule {}