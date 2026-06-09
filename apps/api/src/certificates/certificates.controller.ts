import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import type { Response } from 'express'; // ✅ Importación correcta para TypeScript

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  async create(@Body() createCertificateDto: any, @Res() res: Response) {
    try {
      // 1. El servicio devuelve el Buffer del PDF directamente
      const pdfBuffer = await this.certificatesService.create(createCertificateDto);
      
      // 2. Configuramos la respuesta para descargar el archivo
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=certificado_medico.pdf');
      
      // ✅ Enviamos el buffer directo (sin .pdf al final)
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('Error en controller:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        message: error.message || 'Error generando certificado' 
      });
    }
  }
}