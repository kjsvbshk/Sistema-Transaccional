import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.rol.findMany({
      include: {
        rolesPermisos: {
          include: {
            permiso: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
              },
            },
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return roles.map((role) => ({
      id: role.id.toString(),
      name: role.nombre,
      description: role.descripcion,
      permissions: role.rolesPermisos.map((rp) => ({
        id: rp.permiso.id.toString(),
        code: rp.permiso.codigo,
        description: rp.permiso.descripcion,
      })),
    }));
  }

  async findOne(id: bigint) {
    const role = await this.prisma.rol.findUnique({
      where: { id },
      include: {
        rolesPermisos: {
          include: {
            permiso: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return {
      id: role.id.toString(),
      name: role.nombre,
      description: role.descripcion,
      permissions: role.rolesPermisos.map((rp) => ({
        id: rp.permiso.id.toString(),
        code: rp.permiso.codigo,
        description: rp.permiso.descripcion,
      })),
    };
  }

  async create(createRoleDto: CreateRoleDto) {
    const { name, description } = createRoleDto;

    // Verificar si el rol ya existe
    const existingRole = await this.prisma.rol.findUnique({
      where: { nombre: name },
    });

    if (existingRole) {
      throw new ConflictException('El rol ya existe');
    }

    const role = await this.prisma.rol.create({
      data: {
        nombre: name,
        descripcion: description ?? null,
      },
    });

    this.logger.log(`Rol creado: ${role.nombre}`);

    return {
      id: role.id.toString(),
      name: role.nombre,
      description: role.descripcion,
    };
  }

  async update(id: bigint, updateRoleDto: UpdateRoleDto) {
    const { name, description } = updateRoleDto;

    // Verificar que el rol existe
    const existingRole = await this.prisma.rol.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Si se está cambiando el nombre, verificar que no exista otro rol con ese nombre
    if (name && name !== existingRole.nombre) {
      const duplicateRole = await this.prisma.rol.findUnique({
        where: { nombre: name },
      });

      if (duplicateRole) {
        throw new ConflictException('Ya existe un rol con ese nombre');
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.nombre = name;
    if (description !== undefined) updateData.descripcion = description ?? null;

    const role = await this.prisma.rol.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Rol actualizado: ${role.nombre}`);

    return {
      id: role.id.toString(),
      name: role.nombre,
      description: role.descripcion,
    };
  }

  async remove(id: bigint) {
    // Verificar que el rol existe
    const existingRole = await this.prisma.rol.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Eliminar rol (cascada eliminará roles_permisos)
    await this.prisma.rol.delete({
      where: { id },
    });

    this.logger.log(`Rol eliminado: ${existingRole.nombre}`);

    return {
      message: 'Rol eliminado exitosamente',
    };
  }

  async assignPermission(roleId: bigint, permissionId: bigint) {
    // Verificar que el rol existe
    const role = await this.prisma.rol.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Verificar que el permiso existe
    const permission = await this.prisma.permiso.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permiso no encontrado');
    }

    // Verificar si ya tiene el permiso asignado
    const existingAssignment = await this.prisma.rolesPermisos.findUnique({
      where: {
        roles_permisos_unicos: {
          rolId: roleId,
          permisoId: permissionId,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('El rol ya tiene este permiso asignado');
    }

    await this.prisma.rolesPermisos.create({
      data: {
        rolId: roleId,
        permisoId: permissionId,
      },
    });

    this.logger.log(`Permiso ${permissionId} asignado al rol ${roleId}`);

    return {
      message: 'Permiso asignado exitosamente',
      roleId: roleId.toString(),
      permissionId: permissionId.toString(),
    };
  }

  async removePermission(roleId: bigint, permissionId: bigint) {
    // Verificar que la asignación existe
    const assignment = await this.prisma.rolesPermisos.findUnique({
      where: {
        roles_permisos_unicos: {
          rolId: roleId,
          permisoId: permissionId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('El rol no tiene este permiso asignado');
    }

    await this.prisma.rolesPermisos.delete({
      where: {
        roles_permisos_unicos: {
          rolId: roleId,
          permisoId: permissionId,
        },
      },
    });

    this.logger.log(`Permiso ${permissionId} removido del rol ${roleId}`);

    return {
      message: 'Permiso removido exitosamente',
      roleId: roleId.toString(),
      permissionId: permissionId.toString(),
    };
  }
}
