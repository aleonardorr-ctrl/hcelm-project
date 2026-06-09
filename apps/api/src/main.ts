import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para frontend
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  
  // Validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true 
  }));
  
  // Prefijo global para APIs
  app.setGlobalPrefix('api');
  
  // Puerto dinámico: usa variable de entorno o 3000 por defecto
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Backend AME HEALTH corriendo en http://localhost:${port}`);
  console.log(`📖 Documentación API: http://localhost:${port}/api`);
}

bootstrap();