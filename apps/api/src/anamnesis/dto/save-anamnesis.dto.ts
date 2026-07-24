import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SaveAnamnesisDto {
  @IsUUID('all', { message: 'El ID del paciente no es válido' })
  patientId: string;

  @IsOptional()
  @IsUUID('all', { message: 'El ID de la atención no es válido' })
  encounterId?: string | null;

  @IsDateString(
    {},
    { message: 'La fecha de atención debe tener un formato válido' },
  )
  fechaAtencion: string;

  @IsString({ message: 'El motivo de consulta debe ser texto' })
  @IsNotEmpty({ message: 'El motivo de consulta es obligatorio' })
  motivoConsulta: string;

  @IsOptional()
  @IsString()
  tiempoEnfermedad?: string;

  @IsOptional()
  @IsString()
  anamnesisActual?: string;

  @IsOptional()
  @IsString()
  funcionesBiologicas?: string;

  @IsOptional()
  @IsString()
  antecedentesPersonales?: string;

  @IsOptional()
  @IsString()
  antecedentesFamiliares?: string;

  @IsOptional()
  @IsObject({ message: 'Los signos vitales deben tener un formato válido' })
  signosVitales?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  examenFisico?: string;

  @IsOptional()
  @IsObject({
    message: 'El diagnóstico principal debe tener un formato válido',
  })
  diagnosticoPrincipal?: Record<string, unknown>;

  @IsOptional()
  @IsArray({ message: 'Los diagnósticos secundarios deben ser una lista' })
  diagnosticosSecundarios?: unknown[];

  @IsOptional()
  @IsString()
  examenesAuxiliares?: string;

  @IsOptional()
  @IsString()
  prescripcionesFarmacia?: string;

  @IsOptional()
  @IsString()
  destinoFinal?: string;

  @IsOptional()
  @IsObject({ message: 'El detalle del destino debe tener un formato válido' })
  destinationDetails?: Record<string, unknown>;

  @IsOptional()
  @IsArray({ message: 'Los medicamentos de la receta deben ser una lista' })
  recipeItems?: unknown[];
}
