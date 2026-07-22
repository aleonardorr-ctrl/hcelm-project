import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformController } from './platform.controller';
import { PlatformSuperadminGuard } from './platform-superadmin.guard';
import { PlatformService } from './platform.service';
import { PlatformSuspensionSchedulerService } from './platform-suspension-scheduler.service';

@Module({
  imports: [AuthModule],
  controllers: [PlatformController],
  providers: [
    PlatformService,
    PlatformSuperadminGuard,
    PlatformSuspensionSchedulerService,
  ],
})
export class PlatformModule {}
