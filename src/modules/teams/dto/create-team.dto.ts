import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    description: 'Nombre del equipo',
    example: 'Real Madrid',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name!: string;

  @ApiProperty({
    description: 'País del equipo',
    example: 'España',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El país debe ser una cadena de texto' })
  @MaxLength(50, { message: 'El país no puede exceder 50 caracteres' })
  country?: string;

  @ApiProperty({
    description: 'Referencia externa del equipo',
    example: 'real_madrid_123',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La referencia externa debe ser una cadena de texto' })
  @MaxLength(100, { message: 'La referencia externa no puede exceder 100 caracteres' })
  externalReference?: string;
}
