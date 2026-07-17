import { Module } from '@nestjs/common';
import { PharmacyFefoController } from './pharmacy-fefo.controller';
import { PharmacyFefoService } from './pharmacy-fefo.service';

@Module({
  controllers: [PharmacyFefoController],
  providers: [PharmacyFefoService],
  exports: [PharmacyFefoService],
})
export class PharmacyFefoModule {}