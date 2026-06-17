import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PatientsService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}