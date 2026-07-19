import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformController } from './platform.controller';
import { PlatformSuperadminGuard } from './platform-superadmin.guard';
import { PlatformService } from './platform.service';

@Module({
  imports: [AuthModule],
  controllers: [PlatformController],
  providers: [PlatformService, PlatformSuperadminGuard],
})
export class PlatformModule {}
