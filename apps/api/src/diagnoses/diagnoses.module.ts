import { Module } from '@nestjs/common';
import { DiagnosesService } from './diagnoses.service';
import { DiagnosesController } from './diagnoses.controller';

@Module({
  controllers: [DiagnosesController],
  providers: [DiagnosesService],
})
export class DiagnosesModule {}
