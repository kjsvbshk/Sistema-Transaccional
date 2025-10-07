import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const permissions = await this.prisma.permiso.findMany({
      orderBy: {
        codigo: 'asc',
      },
    });

    return permissions.map((permission) => ({
      id: permission.id.toString(),
      code: permission.codigo,
      description: permission.descripcion,
    }));
  }

  async findOne(id: bigint) {
    const permission = await this.prisma.permiso.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permiso no encontrado');
    }

    return {
      id: permission.id.toString(),
      code: permission.codigo,
      description: permission.descripcion,
    };
  }

  async create(createPermissionDto: CreatePermissionDto) {
    const { code, description } = createPermissionDto;

    // Verificar si el permiso ya existe
    const existingPermission = await this.prisma.permiso.findUnique({
      where: { codigo: code },
    });

    if (existingPermission) {
      throw new ConflictException('El permiso ya existe');
    }

    const permission = await this.prisma.permiso.create({
      data: {
        codigo: code,
        descripcion: description ?? null,
      },
    });

    this.logger.log(`Permiso creado: ${permission.codigo}`);

    return {
      id: permission.id.toString(),
      code: permission.codigo,
      description: permission.descripcion,
    };
  }

  async update(id: bigint, updatePermissionDto: UpdatePermissionDto) {
    const { code, description } = updatePermissionDto;

    // Verificar que el permiso existe
    const existingPermission = await this.prisma.permiso.findUnique({
      where: { id },
    });

    if (!existingPermission) {
      throw new NotFoundException('Permiso no encontrado');
    }

    // Si se está cambiando el código, verificar que no exista otro permiso con ese código
    if (code && code !== existingPermission.codigo) {
      const duplicatePermission = await this.prisma.permiso.findUnique({
        where: { codigo: code },
      });

      if (duplicatePermission) {
        throw new ConflictException('Ya existe un permiso con ese código');
      }
    }

    const updateData: any = {};
    if (code !== undefined) updateData.codigo = code;
    if (description !== undefined) updateData.descripcion = description ?? null;

    const permission = await this.prisma.permiso.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Permiso actualizado: ${permission.codigo}`);

    return {
      id: permission.id.toString(),
      code: permission.codigo,
      description: permission.descripcion,
    };
  }

  async remove(id: bigint) {
    // Verificar que el permiso existe
    const existingPermission = await this.prisma.permiso.findUnique({
      where: { id },
    });

    if (!existingPermission) {
      throw new NotFoundException('Permiso no encontrado');
    }

    // Eliminar permiso (cascada eliminará roles_permisos)
    await this.prisma.permiso.delete({
      where: { id },
    });

    this.logger.log(`Permiso eliminado: ${existingPermission.codigo}`);

    return {
      message: 'Permiso eliminado exitosamente',
    };
  }
}
