import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';

@Injectable()
export class CertificatesService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService
  ) {}

  async create(createCertificateDto: any) {
    // 1. Guardar en BD (Opcional si quiere guardar historial)
    /* 
    await (this.prisma as any).certificate.create({
      data: {
        patientId: createCertificateDto.patientId,
        type: createCertificateDto.certificateType,
        diagnoses: createCertificateDto.diagnoses,
        restDays: createCertificateDto.restDays,
        observations: createCertificateDto.observations,
        place: createCertificateDto.place,
        issueDate: createCertificateDto.issueDate,
        issuedBy: 'admin@amehealth.pe',
      }
    }); 
    */

    // 2. Generar PDF
    // ✅ Devuelve un Buffer
    const pdfBuffer = await this.pdfService.generateCertificate(createCertificateDto);

    return pdfBuffer;
  }
}