import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ElectronicDocumentType } from '@prisma/client';

export class CreateElectronicDocumentSequenceDto {
  @IsString()
  businessUnit!: string;

  @IsString()
  warehouse!: string;

  @IsEnum(ElectronicDocumentType)
  documentType!: ElectronicDocumentType;

  @IsString()
  @Matches(/^[BF][A-Z0-9]{3}$/)
  series!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99999999)
  currentNumber?: number;
}
