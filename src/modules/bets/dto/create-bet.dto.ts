import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max, IsPositive } from 'class-validator';

export class CreateBetDto {
  @ApiProperty({
    description: 'ID del evento deportivo',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del evento debe ser un número' })
  @IsPositive({ message: 'El ID del evento debe ser positivo' })
  eventId!: number;

  @ApiProperty({
    description: 'ID del mercado de apuestas',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del mercado debe ser un número' })
  @IsPositive({ message: 'El ID del mercado debe ser positivo' })
  marketId!: number;

  @ApiProperty({
    description: 'Monto de la apuesta en dólares',
    example: 25.50,
    minimum: 1,
    maximum: 1000,
  })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(1, { message: 'El monto mínimo es $1' })
  @Max(1000, { message: 'El monto máximo es $1,000' })
  amount!: number;

  @ApiProperty({
    description: 'Selección de la apuesta',
    example: '1',
    examples: ['1', 'X', '2', 'Over 2.5', 'Under 2.5', 'Yes', 'No'],
  })
  @IsString({ message: 'La selección debe ser una cadena de texto' })
  selection!: string;

  @ApiProperty({
    description: 'Clave de idempotencia para evitar duplicados',
    example: 'bet_1234567890_abc123',
  })
  @IsString({ message: 'La clave de idempotencia debe ser una cadena de texto' })
  requestKey!: string;

  @ApiProperty({
    description: 'Versión del modelo de predicción',
    example: 'v1.0',
    required: false,
    default: 'v1.0',
  })
  @IsOptional()
  @IsString({ message: 'La versión del modelo debe ser una cadena de texto' })
  versionModelo?: string;
}
