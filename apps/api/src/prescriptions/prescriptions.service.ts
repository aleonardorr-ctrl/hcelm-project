import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() { return []; }
  async create(data: any) { return { id: 'temp', ...data }; }
  
  // ✅ Método flexible que acepta cualquier número de argumentos
  // para coincidir exactamente con la llamada del controlador
  async issuePrescription(...args: any[]) {
    return { 
      success: true, 
      message: 'Stub: receta emitida correctamente (módulo en desarrollo)',
      data: args 
    };
  }
}