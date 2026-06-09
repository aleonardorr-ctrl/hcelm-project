import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // 👈 NUEVO: Importamos el módulo de configuración
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [ConfigModule], // 👈 NUEVO: Le damos permiso a este módulo para usar ConfigService
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}