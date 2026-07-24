import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  const prisma = {
    patient: {
      create: jest.fn(),
    },
  };

  const service = new PatientsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normaliza el tipo y número de documento antes de crear al paciente', async () => {
    prisma.patient.create.mockResolvedValue({
      id: 'patient-1',
      tenantId: 'tenant-1',
      documentType: 'DNI',
      documentNumber: '12345678',
      hceNumber: 'DNI-12345678',
      createdAt: new Date('2026-07-23T12:00:00.000Z'),
    });

    await service.create('tenant-1', {
      documentType: ' dni ',
      documentNumber: ' 12345678 ',
      fullName: 'Paciente de prueba',
      birthDate: '1990-01-01',
    });

    expect(prisma.patient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        documentType: 'DNI',
        documentNumber: '12345678',
      }),
    });
  });
});
