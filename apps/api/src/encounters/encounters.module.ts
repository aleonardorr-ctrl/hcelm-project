import { Module } from '@nestjs/common';
import { EncountersController } from './encounters.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EncountersController],
})
export class EncountersModule {}