import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    description: 'ID del rol a asignar',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del rol debe ser un número' })
  @IsPositive({ message: 'El ID del rol debe ser un número positivo' })
  roleId!: number;
}
