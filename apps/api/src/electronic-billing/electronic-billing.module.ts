import { Module } from '@nestjs/common';
import { SystemModuleAccessModule } from '../common/system-modules/system-module-access.module';
import { ElectronicBillingController } from './electronic-billing.controller';
import { ElectronicBillingService } from './electronic-billing.service';

@Module({
  imports: [SystemModuleAccessModule],
  controllers: [ElectronicBillingController],
  providers: [ElectronicBillingService],
  exports: [ElectronicBillingService],
})
export class ElectronicBillingModule {}
