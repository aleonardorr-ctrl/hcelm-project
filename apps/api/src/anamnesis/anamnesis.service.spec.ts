import { PrismaService } from '../prisma/prisma.service';
import { AnamnesisService } from './anamnesis.service';

describe('AnamnesisService', () => {
  const prisma = {
    encounter: {
      findFirst: jest.fn(),
    },
    anamnesis: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  const service = new AnamnesisService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('actualiza la anamnesis existente en lugar de crear otra para la atención', async () => {
    prisma.encounter.findFirst.mockResolvedValue({
      id: 'a4ff1c84-ec28-49e5-a0f4-608cc0d800f9',
    });
    prisma.anamnesis.findFirst.mockResolvedValue({
      id: 'anamnesis-1',
      issuedBy: 'medico@hcelm.pe',
    });
    prisma.anamnesis.update.mockResolvedValue({
      id: 'anamnesis-1',
      encounterId: 'a4ff1c84-ec28-49e5-a0f4-608cc0d800f9',
    });

    await service.create('tenant-1', {
      patientId: '28e4b8ad-49eb-49e6-aad7-614e38e400cb',
      encounterId: 'a4ff1c84-ec28-49e5-a0f4-608cc0d800f9',
      fechaAtencion: '2026-07-23',
      motivoConsulta: 'Control clínico',
    });

    expect(prisma.anamnesis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'anamnesis-1' },
      }),
    );
    expect(prisma.anamnesis.create).not.toHaveBeenCalled();
  });
});
