import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateEventDto {
  @ApiProperty({
    description: 'Fecha y hora de inicio del evento',
    example: '2024-01-15T21:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  startTime?: string;

  @ApiProperty({
    description: 'Referencia externa del evento',
    example: 'event_123456_updated',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La referencia externa debe ser una cadena de texto' })
  externalReference?: string;
}
