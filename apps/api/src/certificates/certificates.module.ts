import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { PdfService } from './pdf.service';

@Module({
  controllers: [CertificatesController],
  providers: [CertificatesService, PdfService],
})
export class CertificatesModule {}