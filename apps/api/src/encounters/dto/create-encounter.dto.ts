import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateEncounterDto {
  @IsUUID('4', { message: 'El ID del paciente no es válido' })
  patientId: string;

  @IsOptional()
  @IsString({ message: 'El tipo de atención debe ser texto' })
  type?: string;

  @IsOptional()
  @IsString({ message: 'El motivo de atención debe ser texto' })
  reason?: string;

  @IsOptional()
  @IsInt({ message: 'La presión sistólica debe ser número entero' })
  @Min(40)
  @Max(300)
  systolicBP?: number;

  @IsOptional()
  @IsInt({ message: 'La presión diastólica debe ser número entero' })
  @Min(20)
  @Max(200)
  diastolicBP?: number;

  @IsOptional()
  @IsInt({ message: 'La frecuencia cardiaca debe ser número entero' })
  @Min(20)
  @Max(250)
  heartRate?: number;

  @IsOptional()
  @IsInt({ message: 'La frecuencia respiratoria debe ser número entero' })
  @Min(5)
  @Max(80)
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La temperatura debe ser número' })
  @Min(30)
  @Max(45)
  temperature?: number;

  @IsOptional()
  @IsInt({ message: 'La saturación debe ser número entero' })
  @Min(30)
  @Max(100)
  oxygenSat?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El peso debe ser número' })
  @Min(0)
  @Max(400)
  weightKg?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La talla debe ser número' })
  @Min(20)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El IMC debe ser número' })
  @Min(0)
  @Max(100)
  bmi?: number;

  @IsOptional()
  @IsInt({ message: 'La glicemia debe ser número entero' })
  @Min(0)
  @Max(1000)
  capillaryGlucose?: number;

  @IsOptional()
  @IsInt({ message: 'La escala de dolor debe ser número entero' })
  @Min(0)
  @Max(10)
  painScale?: number;

  @IsOptional()
  @IsString({ message: 'El estado de conciencia debe ser texto' })
  consciousness?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  glasgowEye?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  glasgowVerbal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  glasgowMotor?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(15)
  glasgowTotal?: number;

  @IsOptional()
  @IsString({ message: 'El soporte de oxígeno debe ser texto' })
  oxygenSupport?: string;

  @IsOptional()
  @IsInt({ message: 'La FiO2 debe ser número entero' })
  @Min(21)
  @Max(100)
  fio2?: number;

  @IsOptional()
  @IsString({ message: 'Las notas de enfermería deben ser texto' })
  nursingNotes?: string;
}