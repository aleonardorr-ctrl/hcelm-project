import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PharmacyPaymentMethod } from '@prisma/client';

export class CreatePharmacySaleItemDto {
  @IsUUID()
  medicationId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(999999999)
  quantity!: number;
}

export class CreatePharmacySalePaymentDto {
  @IsEnum(PharmacyPaymentMethod)
  method!: PharmacyPaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  receivedAmount?: number;
}

export class CreatePharmacySaleDto {
  @IsString()
  @Length(8, 100)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  @Matches(/^[A-Za-z0-9_-]+$/)
  businessUnit?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  @Matches(/^[A-Za-z0-9_-]+$/)
  warehouse?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerDocumentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerDocumentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreatePharmacySaleItemDto)
  items!: CreatePharmacySaleItemDto[];

  @ValidateNested()
  @Type(() => CreatePharmacySalePaymentDto)
  payment!: CreatePharmacySalePaymentDto;
}
