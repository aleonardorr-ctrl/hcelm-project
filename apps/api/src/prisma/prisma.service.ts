import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    // ✅ Obtener URL de conexión desde variables de entorno
    const connectionString = config.get<string>('DATABASE_URL');
    
    // ✅ Crear adapter para conexión directa a PostgreSQL (runtime)
    const adapter = new PrismaPg(new Pool({ connectionString }));
    
    // ✅ Pasar adapter al constructor de PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('🗄️ Base de datos conectada exitosamente a NestJS');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}