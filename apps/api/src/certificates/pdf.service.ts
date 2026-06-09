import PDFDocument from 'pdfkit';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  async generateCertificate(data: any) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    try {
      // 1. Obtener datos del establecimiento
      let establishment: any = {};
      try {
        if (data.patient?.tenantId) {
           const tenant = await (this.prisma as any).tenant.findUnique({ where: { id: data.patient.tenantId } });
           if (tenant) {
             establishment = await (this.prisma as any).establishment.findUnique({ where: { tenantId: tenant.id } }) || {};
           }
        }
      } catch (dbError) { console.warn('Error cargando establecimiento:', dbError); }

      // --- ENCABEZADO ---
      if (establishment.logoUrl && establishment.logoUrl.startsWith('data:image')) {
        try { doc.image(establishment.logoUrl, 50, 40, { width: 85, height: 85 }); } catch (e) {}
      }

      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f766e')
         .text(establishment.name || 'AME HEALTH SAC', 150, 50, { align: 'left' });
      
      doc.fontSize(10).font('Helvetica').fillColor('#333')
         .text(establishment.address || 'Arequipa, Perú', 150, 70, { align: 'left' });
      
      doc.moveTo(50, 95).lineTo(550, 95).strokeColor('#0f766e').lineWidth(2).stroke();

      // --- TÍTULO ---
      doc.moveDown(2); 
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#000')
         .text('CERTIFICADO DE DESCANSO MÉDICO', 50, doc.y, { align: 'center', width: 500 });
      doc.moveDown(2); 

      // --- CUERPO ---
      doc.fontSize(12).font('Helvetica').fillColor('#000');

      const fechaObj = data.issueDate ? new Date(data.issueDate) : new Date();
      const dia = fechaObj.getDate();
      const mes = fechaObj.toLocaleDateString('es-PE', { month: 'long' });
      const anio = fechaObj.getFullYear();
      const lugar = data.place || 'Arequipa';
      
      doc.text(`En ${lugar}, a los ${dia} días del mes de ${mes} del ${anio}.`, { align: 'justify' });
      doc.moveDown(1.5);

      const directorName = establishment.directorName || 'Dr. Alfonso Rodriguez Rojas';
      const directorCmp = establishment.directorCmp || 'CMP 43992';
      
      doc.text(`Yo, ${directorName}, identificado con ${directorCmp}, certifico haber atendido al siguiente paciente:`, { align: 'justify' });
      doc.moveDown(1);

      // DATOS DEL PACIENTE
      const patientName = data.patientName || data.patient?.fullName || 'PACIENTE NO ESPECIFICADO';
      const patientDoc = data.patientDoc || data.patient?.documentNumber || 'S/N';

      const boxY = doc.y;
      const boxHeight = 50;
      
      doc.rect(50, boxY, 500, boxHeight).stroke('#cccccc');
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000')
         .text(`NOMBRE: ${patientName}`, 60, boxY + 15);
      doc.font('Helvetica').fontSize(11)
         .text(`DNI / DOCUMENTO: ${patientDoc}`, 60, boxY + 32);

      doc.y = boxY + boxHeight + 10; 

      // Diagnósticos
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(12).text('DIAGNÓSTICO(S):', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11);

      if (data.diagnoses && Array.isArray(data.diagnoses) && data.diagnoses.length > 0) {
        data.diagnoses.forEach((diag: string, index: number) => {
          doc.text(`${index + 1}. ${diag}`, { indent: 20 });
        });
      } else {
        doc.text('Sin especificar.', { indent: 20 });
      }
      doc.moveDown(1.5);

      // DESCANSO MÉDICO
      if (data.restDays && parseInt(data.restDays) > 0) {
        const days = parseInt(data.restDays);
        const startDate = new Date(data.issueDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + days);
        const startStr = startDate.toLocaleDateString('es-PE');
        const endStr = endDate.toLocaleDateString('es-PE');

        doc.font('Helvetica-Bold').text('DESCANSO MÉDICO:', { underline: true });
        doc.font('Helvetica').text(
          `Se prescribe DESCANSO MÉDICO por ${days} día(s), desde el ${startStr} hasta el ${endStr} inclusive.`, 
          { align: 'justify' }
        );
        doc.moveDown(1.5);
      }

      // Observaciones
      if (data.observations && data.observations.trim() !== '') {
        doc.font('Helvetica-Bold').text('OBSERVACIONES:', { underline: true });
        doc.font('Helvetica').text(data.observations, { align: 'justify' });
        doc.moveDown(2);
      }

      // --- FIRMA (POSICIONAMIENTO MANUAL ABSOLUTO) ---
      // La línea va de 200 a 400. El centro es 300.
      // Para centrar texto manualmente, restamos la mitad del ancho estimado del texto.
      
      const firmY = 700;
      const centerX = 300;

      // 1. Línea
      doc.moveTo(200, firmY).lineTo(400, firmY).strokeColor('#000').lineWidth(1).stroke();
      
      // 2. Nombre (Usamos un bloque de texto de 200pt de ancho centrado en 300)
      // Coordenada X = Centro - (Ancho/2) = 300 - 100 = 200
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000')
         .text(directorName, 200, firmY + 10, { width: 200, align: 'center' });
      
      // 3. CMP
      doc.font('Helvetica').fontSize(10)
         .text(directorCmp, 200, firmY + 25, { width: 200, align: 'center' });
         
      // 4. Título
      doc.font('Helvetica-Oblique').fontSize(9)
         .text('Médico Cirujano', 200, firmY + 40, { width: 200, align: 'center' });

      doc.end();

    } catch (error) {
      console.error('ERROR CRÍTICO EN PDF:', error);
      doc.text('Error generando el documento.');
      doc.end();
    }

    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }
}