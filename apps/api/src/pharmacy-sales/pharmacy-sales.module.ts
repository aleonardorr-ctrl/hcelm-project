import { Module } from '@nestjs/common';
import { SystemModuleAccessModule } from '../common/system-modules/system-module-access.module';
import { MedicationCatalogModule } from '../medication-catalog/medication-catalog.module';
import { PharmacySalesController } from './pharmacy-sales.controller';
import { PharmacySalesService } from './pharmacy-sales.service';

@Module({
  imports: [SystemModuleAccessModule, MedicationCatalogModule],
  controllers: [PharmacySalesController],
  providers: [PharmacySalesService],
})
export class PharmacySalesModule {}
