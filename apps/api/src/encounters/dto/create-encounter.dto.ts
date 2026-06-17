import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEncounterDto {
  @ApiProperty({
    description: 'ID del paciente',
    example: '28e4b8ad-49eb-49e6-aad7-614e38e400cb',
  })
  @IsUUID('4', { message: 'El ID del paciente no es válido' })
  patientId: string;

  @ApiPropertyOptional({
    description: 'Tipo de atención',
    example: 'consulta',
  })
  @IsOptional()
  @IsString({ message: 'El tipo de atención debe ser texto' })
  type?: string;

  @ApiPropertyOptional({
    description: 'Motivo de atención',
    example: 'Dolor abdominal de 2 días de evolución',
  })
  @IsOptional()
  @IsString({ message: 'El motivo de atención debe ser texto' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Presión arterial sistólica' })
  @IsOptional()
  @IsInt({ message: 'La presión sistólica debe ser número entero' })
  @Min(40)
  @Max(300)
  systolicBP?: number;

  @ApiPropertyOptional({ description: 'Presión arterial diastólica' })
  @IsOptional()
  @IsInt({ message: 'La presión diastólica debe ser número entero' })
  @Min(20)
  @Max(200)
  diastolicBP?: number;

  @ApiPropertyOptional({ description: 'Frecuencia cardiaca' })
  @IsOptional()
  @IsInt({ message: 'La frecuencia cardiaca debe ser número entero' })
  @Min(20)
  @Max(250)
  heartRate?: number;

  @ApiPropertyOptional({ description: 'Frecuencia respiratoria' })
  @IsOptional()
  @IsInt({ message: 'La frecuencia respiratoria debe ser número entero' })
  @Min(5)
  @Max(80)
  respiratoryRate?: number;

  @ApiPropertyOptional({ description: 'Temperatura corporal' })
  @IsOptional()
  @IsNumber({}, { message: 'La temperatura debe ser número' })
  @Min(30)
  @Max(45)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Saturación de oxígeno' })
  @IsOptional()
  @IsInt({ message: 'La saturación debe ser número entero' })
  @Min(30)
  @Max(100)
  oxygenSat?: number;

  @ApiPropertyOptional({ description: 'Peso en kilogramos' })
  @IsOptional()
  @IsNumber({}, { message: 'El peso debe ser número' })
  @Min(0)
  @Max(400)
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Talla en centímetros' })
  @IsOptional()
  @IsNumber({}, { message: 'La talla debe ser número' })
  @Min(20)
  @Max(250)
  heightCm?: number;

  @ApiPropertyOptional({
    description: 'IMC. Puede venir del frontend, pero el backend lo recalcula.',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El IMC debe ser número' })
  @Min(0)
  @Max(100)
  bmi?: number;

  @ApiPropertyOptional({ description: 'Glicemia capilar' })
  @IsOptional()
  @IsInt({ message: 'La glicemia debe ser número entero' })
  @Min(0)
  @Max(1000)
  capillaryGlucose?: number;

  @ApiPropertyOptional({ description: 'Escala de dolor EVA 0 a 10' })
  @IsOptional()
  @IsInt({ message: 'La escala de dolor debe ser número entero' })
  @Min(0)
  @Max(10)
  painScale?: number;

  @ApiPropertyOptional({ description: 'Estado de conciencia' })
  @IsOptional()
  @IsString({ message: 'El estado de conciencia debe ser texto' })
  consciousness?: string;

  @ApiPropertyOptional({ description: 'Glasgow ocular' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  glasgowEye?: number;

  @ApiPropertyOptional({ description: 'Glasgow verbal' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  glasgowVerbal?: number;

  @ApiPropertyOptional({ description: 'Glasgow motor' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  glasgowMotor?: number;

  @ApiPropertyOptional({
    description: 'Glasgow total. Puede venir del frontend, pero el backend lo recalcula.',
  })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(15)
  glasgowTotal?: number;

  @ApiPropertyOptional({ description: 'Soporte de oxígeno' })
  @IsOptional()
  @IsString({ message: 'El soporte de oxígeno debe ser texto' })
  oxygenSupport?: string;

  @ApiPropertyOptional({ description: 'FiO2' })
  @IsOptional()
  @IsInt({ message: 'La FiO2 debe ser número entero' })
  @Min(21)
  @Max(100)
  fio2?: number;

  @ApiPropertyOptional({ description: 'Notas de enfermería o triaje' })
  @IsOptional()
  @IsString({ message: 'Las notas de enfermería deben ser texto' })
  nursingNotes?: string;
}