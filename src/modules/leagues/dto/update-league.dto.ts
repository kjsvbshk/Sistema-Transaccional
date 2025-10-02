import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateLeagueDto {
  @ApiProperty({
    description: 'Deporte de la liga',
    example: 'Fútbol',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El deporte debe ser una cadena de texto' })
  @MinLength(2, { message: 'El deporte debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El deporte no puede exceder 50 caracteres' })
  sport?: string;

  @ApiProperty({
    description: 'Nombre de la liga',
    example: 'Premier League',
    minLength: 2,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name?: string;

  @ApiProperty({
    description: 'País de la liga',
    example: 'Inglaterra',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El país debe ser una cadena de texto' })
  @MaxLength(50, { message: 'El país no puede exceder 50 caracteres' })
  country?: string;
}
