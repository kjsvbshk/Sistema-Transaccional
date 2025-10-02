import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class DepositDto {
  @ApiProperty({
    description: 'Monto a depositar en dólares',
    example: 100.50,
    minimum: 0.01,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto mínimo es $0.01' })
  @Max(10000, { message: 'El monto máximo es $10,000' })
  amount: number;

  @ApiProperty({
    description: 'Descripción del depósito',
    example: 'Depósito desde tarjeta de crédito',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  description?: string;
}
