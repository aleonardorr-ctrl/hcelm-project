import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiagnosesService {
  constructor(private prisma: PrismaService) {}

  async findAll() { return []; }
  async create(data: any) { return data; }
  
  // ✅ Método requerido por diagnoses.controller.ts
  async search(query: string) { return []; }
}