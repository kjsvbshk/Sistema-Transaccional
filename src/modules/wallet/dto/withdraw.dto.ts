import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({
    description: 'Monto a retirar en dólares',
    example: 50.25,
    minimum: 0.01,
    maximum: 5000,
  })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto mínimo es $0.01' })
  @Max(5000, { message: 'El monto máximo es $5,000' })
  amount: number;

  @ApiProperty({
    description: 'Descripción del retiro',
    example: 'Retiro a cuenta bancaria',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  description?: string;
}
