import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PharmacyFefoAuthorizationController } from './pharmacy-fefo-authorization.controller';
import { PharmacyFefoAuthorizationService } from './pharmacy-fefo-authorization.service';

@Module({
  imports: [PrismaModule],
  controllers: [PharmacyFefoAuthorizationController],
  providers: [PharmacyFefoAuthorizationService],
  exports: [PharmacyFefoAuthorizationService],
})
export class PharmacyFefoAuthorizationModule {}