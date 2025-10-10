import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface FindUsersOptions {
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async findAll(options: FindUsersOptions) {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' as const } },
            { correo: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          correo: true,
          nombre: true,
          estado: true,
          creadoEn: true,
          actualizadoEn: true,
        },
        orderBy: {
          creadoEn: 'desc',
        },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data: users.map((user) => ({
        id: user.id.toString(),
        email: user.correo,
        name: user.nombre,
        status: user.estado,
        createdAt: user.creadoEn,
        updatedAt: user.actualizadoEn,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: bigint) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        correo: true,
        nombre: true,
        estado: true,
        creadoEn: true,
        actualizadoEn: true,
        usuariosRoles: {
          include: {
            rol: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
              },
            },
          },
        },
      } as any,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: (user as any)['id'].toString(),
      email: (user as any)['correo'],
      name: (user as any)['nombre'],
      status: (user as any)['estado'],
      createdAt: (user as any)['creadoEn'],
      updatedAt: (user as any)['actualizadoEn'],
      roles: ((user as any)['usuariosRoles'] || []).map((userRole: any) => ({
        roleId: userRole.rol.id.toString(),
        roleName: userRole.rol.nombre,
        roleDescription: userRole.rol.descripcion,
        assignedAt: userRole.creadoEn,
      })),
    };
  }

  async create(createUserDto: CreateUserDto) {
    const { email, name, password, status = 'activo' } = createUserDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { correo: email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await this.passwordService.hashPassword(password);

    // Crear usuario en una transacción
    const user = await this.prisma.executeTransaction(async (prisma) => {
      const newUser = await prisma.usuario.create({
        data: {
          correo: email,
          nombre: name,
          contrasenaHash: hashedPassword,
          estado: status,
        },
      });

      // Crear billetera con saldo inicial
      await prisma.billetera.create({
        data: {
          usuarioId: newUser.id,
          saldoDolares: 100.00,
        },
      });

      return newUser;
    });

    this.logger.log(`Usuario creado: ${user.correo}`);

    return {
      id: user.id.toString(),
      email: user.correo,
      name: user.nombre,
      status: user.estado,
      createdAt: user.creadoEn,
    };
  }

  async update(id: bigint, updateUserDto: UpdateUserDto) {
    const { name, status, password } = updateUserDto;

    // Verificar que el usuario existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Preparar datos de actualización
    const updateData: any = {};
    if (name !== undefined) updateData.nombre = name;
    if (status !== undefined) updateData.estado = status;
    if (password !== undefined) {
      updateData.contrasenaHash = await this.passwordService.hashPassword(password);
    }

    const user = await this.prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        correo: true,
        nombre: true,
        estado: true,
        actualizadoEn: true,
      },
    });

    this.logger.log(`Usuario actualizado: ${user.correo}`);

    return {
      id: user.id.toString(),
      email: user.correo,
      name: user.nombre,
      status: user.estado,
      updatedAt: user.actualizadoEn,
    };
  }

  async remove(id: bigint) {
    // Verificar que el usuario existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Eliminar usuario (cascada eliminará billetera, sesiones, etc.)
    await this.prisma.usuario.delete({
      where: { id },
    });

    this.logger.log(`Usuario eliminado: ${existingUser.correo}`);

    return {
      message: 'Usuario eliminado exitosamente',
    };
  }

  async assignRole(userId: bigint, roleId: bigint) {
    // Verificar que el usuario existe
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que el rol existe
    const role = await this.prisma.rol.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Verificar si el usuario ya tiene este rol
    const existingRole = await (this.prisma as any).usuarioRol.findUnique({
      where: {
        usuarios_roles_unicos: {
          usuarioId: userId,
          rolId: roleId,
        },
      },
    });

    if (existingRole) {
      throw new ConflictException('El usuario ya tiene este rol asignado');
    }

    // Asignar rol al usuario
    await (this.prisma as any).usuarioRol.create({
      data: {
        usuarioId: userId,
        rolId: roleId,
      },
    });

    this.logger.log(`Rol ${roleId} asignado al usuario ${userId}`);

    return {
      message: 'Rol asignado exitosamente',
      userId: userId.toString(),
      roleId: roleId.toString(),
    };
  }

  async removeRole(userId: bigint, roleId: bigint) {
    // Verificar que el usuario existe
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que el rol existe
    const role = await this.prisma.rol.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Verificar si el usuario tiene este rol asignado
    const existingRole = await (this.prisma as any).usuarioRol.findUnique({
      where: {
        usuarios_roles_unicos: {
          usuarioId: userId,
          rolId: roleId,
        },
      },
    });

    if (!existingRole) {
      throw new NotFoundException('El usuario no tiene este rol asignado');
    }

    // Remover rol del usuario
    await (this.prisma as any).usuarioRol.delete({
      where: {
        usuarios_roles_unicos: {
          usuarioId: userId,
          rolId: roleId,
        },
      },
    });

    this.logger.log(`Rol ${roleId} removido del usuario ${userId}`);

    return {
      message: 'Rol removido exitosamente',
      userId: userId.toString(),
      roleId: roleId.toString(),
    };
  }

  async getUserRoles(userId: bigint) {
    // Verificar que el usuario existe
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener roles del usuario con sus permisos
    const userRoles = await (this.prisma as any).usuarioRol.findMany({
      where: { usuarioId: userId },
      include: {
        rol: {
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
        },
      },
    });

    const roles = userRoles.map((userRole: any) => ({
      id: userRole.rol.id.toString(),
      name: userRole.rol.nombre,
      description: userRole.rol.descripcion,
      assignedAt: userRole.creadoEn,
      permissions: userRole.rol.rolesPermisos.map((rp: any) => ({
        id: rp.permiso.id.toString(),
        code: rp.permiso.codigo,
        description: rp.permiso.descripcion,
      })),
    }));

    return {
      userId: userId.toString(),
      roles,
    };
  }

  async getProfile(userId: bigint) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        correo: true,
        nombre: true,
        estado: true,
        creadoEn: true,
        actualizadoEn: true,
        billetera: {
          select: {
            saldoDolares: true,
            reservadoDolares: true,
            actualizadoEn: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: user.id.toString(),
      email: user.correo,
      name: user.nombre,
      status: user.estado,
      createdAt: user.creadoEn,
      updatedAt: user.actualizadoEn,
      wallet: user.billetera ? {
        balance: user.billetera.saldoDolares.toString(),
        reserved: user.billetera.reservadoDolares.toString(),
        lastUpdated: user.billetera.actualizadoEn,
      } : null,
    };
  }
}
