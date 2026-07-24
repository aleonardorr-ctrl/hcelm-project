import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnamnesisController } from './anamnesis.controller';
import { AnamnesisService } from './anamnesis.service';
import { SaveAnamnesisDto } from './dto/save-anamnesis.dto';

describe('AnamnesisController', () => {
  const anamnesisService = {
    create: jest.fn(),
    findByEncounter: jest.fn(),
  };

  const controller = new AnamnesisController(
    anamnesisService as unknown as AnamnesisService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('protege todos los endpoints con JwtAuthGuard', () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, AnamnesisController) || [];

    expect(guards).toContain(JwtAuthGuard);
  });

  it('usa el tenant y la identidad de la sesión al guardar', async () => {
    const body: SaveAnamnesisDto = {
      patientId: '28e4b8ad-49eb-49e6-aad7-614e38e400cb',
      encounterId: 'a4ff1c84-ec28-49e5-a0f4-608cc0d800f9',
      fechaAtencion: '2026-07-23',
      motivoConsulta: 'Control clínico',
      destinationDetails: { altaControl: 'En siete días' },
      recipeItems: [{ medicationId: 'medication-1' }],
    };

    anamnesisService.create.mockResolvedValue({ id: 'anamnesis-1' });

    await controller.create(
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
        email: 'medico@hcelm.pe',
      },
      body,
    );

    expect(anamnesisService.create).toHaveBeenCalledWith('tenant-1', {
      ...body,
      issuedBy: 'medico@hcelm.pe',
    });
  });

  it('consulta la atención dentro del tenant autenticado', async () => {
    anamnesisService.findByEncounter.mockResolvedValue(null);

    await controller.findByEncounter(
      { tenantId: 'tenant-1' },
      'a4ff1c84-ec28-49e5-a0f4-608cc0d800f9',
    );

    expect(anamnesisService.findByEncounter).toHaveBeenCalledWith(
      'tenant-1',
      'a4ff1c84-ec28-49e5-a0f4-608cc0d800f9',
    );
  });

  it('valida los identificadores y campos clínicos obligatorios', async () => {
    const dto = plainToInstance(SaveAnamnesisDto, {
      patientId: 'no-es-uuid',
      fechaAtencion: 'fecha-invalida',
      motivoConsulta: '',
      signosVitales: [],
      diagnosticosSecundarios: {},
    });

    const errors = await validate(dto);
    const invalidProperties = errors.map((error) => error.property);

    expect(invalidProperties).toEqual(
      expect.arrayContaining([
        'patientId',
        'fechaAtencion',
        'motivoConsulta',
        'signosVitales',
        'diagnosticosSecundarios',
      ]),
    );
  });
});
