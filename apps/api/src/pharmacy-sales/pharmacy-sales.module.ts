import { Module } from '@nestjs/common';
import { PharmacyFefoAuthorizationModule } from '../pharmacy-fefo-authorization/pharmacy-fefo-authorization.module';
import { SystemModuleAccessModule } from '../common/system-modules/system-module-access.module';
import { MedicationCatalogModule } from '../medication-catalog/medication-catalog.module';
import { PharmacySalesController } from './pharmacy-sales.controller';
import { PharmacySalesService } from './pharmacy-sales.service';

@Module({
  imports: [
    SystemModuleAccessModule,
    MedicationCatalogModule,
    PharmacyFefoAuthorizationModule,
  ],
  controllers: [PharmacySalesController],
  providers: [PharmacySalesService],
})
export class PharmacySalesModule {}
