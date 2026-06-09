import { Module } from '@nestjs/common';
import { EstablishmentController } from './establishment.controller';
import { EstablishmentService } from './establishment.service';

@Module({
  controllers: [EstablishmentController],
  providers: [EstablishmentService],
  exports: [EstablishmentService],
})
export class EstablishmentModule {}