import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class UpdatePermissionDto {
  @ApiProperty({
    description: 'Código del permiso',
    example: 'users.create_updated',
    minLength: 3,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @MinLength(3, { message: 'El código debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El código no puede exceder 50 caracteres' })
  @Matches(/^[a-z][a-z0-9._]*[a-z0-9]$/, {
    message: 'El código debe seguir el formato: module.action (ej: users.create)',
  })
  code?: string;

  @ApiProperty({
    description: 'Descripción del permiso',
    example: 'Crear usuarios actualizado',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(255, { message: 'La descripción no puede exceder 255 caracteres' })
  description?: string;
}
