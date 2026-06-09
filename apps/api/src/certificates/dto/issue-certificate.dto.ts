import { IsString, IsNotEmpty, IsDateString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IssueCertificateDto {
  @ApiProperty({ description: 'ID del paciente', example: 'uuid-del-paciente' })
  @IsString()
  @IsNotEmpty({ message: 'El ID del paciente es obligatorio' })
  patientId: string;

  @ApiProperty({ description: 'Código CIE-10 del diagnóstico', example: 'A41.9' })
  @IsString()
  @IsNotEmpty({ message: 'El código de diagnóstico CIE-10 es obligatorio' })
  diagnosisCode: string;

  @ApiProperty({ description: 'Días de descanso médico indicados', example: 7 })
  @IsNumber({}, { message: 'Los días de descanso deben ser un número' })
  @Min(1, { message: 'El certificado debe indicar al menos 1 día de descanso' })
  daysOff: number;

  @ApiProperty({ description: 'Fecha de inicio del descanso (AAAA-MM-DD)', example: '2026-05-28' })
  @IsDateString({}, { message: 'La fecha de inicio debe tener el formato AAAA-MM-DD' })
  @IsNotEmpty({ message: 'La fecha de inicio del descanso es obligatoria' })
  startDate: string;

  @ApiProperty({ description: 'Observaciones o indicaciones adicionales', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}