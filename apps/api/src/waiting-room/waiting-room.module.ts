import { Module } from '@nestjs/common';
import { WaitingRoomController } from './waiting-room.controller';
import { WaitingRoomService } from './waiting-room.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClinicalAlertsModule } from '../clinical-alerts/clinical-alerts.module';

@Module({
  imports: [PrismaModule, ClinicalAlertsModule],
  controllers: [WaitingRoomController],
  providers: [WaitingRoomService],
  exports: [WaitingRoomService],
})
export class WaitingRoomModule {}