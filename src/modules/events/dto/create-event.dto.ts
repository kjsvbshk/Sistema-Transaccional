import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsDateString, IsPositive } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    description: 'ID de la liga',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID de la liga debe ser un número' })
  @IsPositive({ message: 'El ID de la liga debe ser positivo' })
  leagueId!: number;

  @ApiProperty({
    description: 'ID del equipo local',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del equipo local debe ser un número' })
  @IsPositive({ message: 'El ID del equipo local debe ser positivo' })
  homeTeamId!: number;

  @ApiProperty({
    description: 'ID del equipo visitante',
    example: 2,
  })
  @IsNumber({}, { message: 'El ID del equipo visitante debe ser un número' })
  @IsPositive({ message: 'El ID del equipo visitante debe ser positivo' })
  awayTeamId!: number;

  @ApiProperty({
    description: 'Fecha y hora de inicio del evento',
    example: '2024-01-15T20:00:00Z',
  })
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  startTime!: string;

  @ApiProperty({
    description: 'Referencia externa del evento',
    example: 'event_123456',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La referencia externa debe ser una cadena de texto' })
  externalReference?: string;
}
