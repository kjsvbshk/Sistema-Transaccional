import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordService } from './services/password.service';
import { JwtService } from './services/jwt.service';
import { RegisterDto } from './dto/register.dto';

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    const { correo, nombre, contrasena } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { correo },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await this.passwordService.hashPassword(contrasena);

    // Crear usuario y billetera en una transacción
    const result = await this.prisma.executeTransaction(async (prisma) => {
      // Crear usuario
      const user = await prisma.usuario.create({
        data: {
          correo,
          nombre,
          contrasenaHash: hashedPassword,
        },
      });

      // Crear billetera con saldo inicial
      await prisma.billetera.create({
        data: {
          usuarioId: user.id,
          saldoDolares: 100.00, // Saldo inicial de $100
        },
      });

      // Crear organización por defecto (opcional)
      const defaultOrg = await prisma.organizacion.findFirst({
        where: { nombre: 'Default Organization' },
      });

      if (defaultOrg) {
        await prisma.membresia.create({
          data: {
            organizacionId: defaultOrg.id,
            usuarioId: user.id,
          },
        });
      }

      return user;
    });

    // Generar tokens
    const accessToken = await this.jwtService.generateAccessToken(result);
    const refreshToken = await this.jwtService.generateRefreshToken(result);

    // Crear sesión
    await this.createSession(result.id, refreshToken);

    // Log de auditoría
    await this.logAuthEvent(result.id, 'register', {
      email: result.correo,
      ip: '127.0.0.1', // TODO: Obtener IP real
    });

    this.logger.log(`Usuario registrado: ${result.correo}`);

    return {
      user: {
        id: result.id.toString(),
        email: result.correo,
        name: result.nombre,
        status: result.estado,
        createdAt: result.creadoEn,
      },
      accessToken,
      refreshToken,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.usuario.findUnique({
      where: { correo: email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      password,
      user.contrasenaHash,
    );

    if (!isPasswordValid) {
      return null;
    }

    if (user.estado !== 'activo') {
      throw new UnauthorizedException('Usuario inactivo');
    }

    return user;
  }

  async login(user: any): Promise<AuthResult> {
    // Generar tokens
    const accessToken = await this.jwtService.generateAccessToken(user);
    const refreshToken = await this.jwtService.generateRefreshToken(user);

    // Crear sesión
    await this.createSession(user.id, refreshToken);

    // Log de auditoría
    await this.logAuthEvent(user.id, 'login', {
      email: user.correo,
      ip: '127.0.0.1', // TODO: Obtener IP real
    });

    this.logger.log(`Usuario logueado: ${user.correo}`);

    return {
      user: {
        id: user.id.toString(),
        email: user.correo,
        name: user.nombre,
        status: user.estado,
        createdAt: user.creadoEn,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    // Generar nuevos tokens
    const accessToken = await this.jwtService.generateAccessToken(user);
    const refreshToken = await this.jwtService.generateRefreshToken(user);

    // Actualizar sesión
    await this.updateSession(user.sessionId, refreshToken);

    // Log de auditoría
    await this.logAuthEvent(user.id, 'refresh', {
      email: user.correo,
      ip: '127.0.0.1', // TODO: Obtener IP real
    });

    this.logger.log(`Token renovado para usuario: ${user.correo}`);

    return {
      accessToken,
      refreshToken,
    };
  }

  async logout(user: any): Promise<{ message: string }> {
    // Revocar sesión
    if (user.sessionId) {
      await this.revokeSession(user.sessionId);
    }

    // Log de auditoría
    await this.logAuthEvent(user.id, 'logout', {
      email: user.correo,
      ip: '127.0.0.1', // TODO: Obtener IP real
    });

    this.logger.log(`Usuario deslogueado: ${user.correo}`);

    return {
      message: 'Sesión cerrada exitosamente',
    };
  }

  async getCurrentUser(userId: bigint): Promise<any> {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        correo: true,
        nombre: true,
        estado: true,
        creadoEn: true,
        actualizadoEn: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.estado !== 'activo') {
      throw new UnauthorizedException('Usuario inactivo');
    }

    return {
      id: user.id.toString(),
      email: user.correo,
      name: user.nombre,
      status: user.estado,
      createdAt: user.creadoEn,
      updatedAt: user.actualizadoEn,
    };
  }

  private async createSession(userId: bigint, refreshToken: string): Promise<void> {
    const refreshTokenHash = await this.passwordService.hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

    await this.prisma.sesion.create({
      data: {
        usuarioId: userId,
        refreshTokenHash,
        expiraEn: expiresAt,
        ip: '127.0.0.1', // TODO: Obtener IP real
        userAgent: 'API Client', // TODO: Obtener User-Agent real
      },
    });
  }

  private async updateSession(sessionId: bigint, refreshToken: string): Promise<void> {
    const refreshTokenHash = await this.passwordService.hashPassword(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

    await this.prisma.sesion.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash,
        expiraEn: expiresAt,
      },
    });
  }

  private async revokeSession(sessionId: bigint): Promise<void> {
    await this.prisma.sesion.update({
      where: { id: sessionId },
      data: {
        revocado: true,
      },
    });
  }

  private async logAuthEvent(
    userId: bigint,
    eventType: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    await this.prisma.bitacoraAutenticacion.create({
      data: {
        usuarioId: userId,
        tipoEvento: eventType,
        metadatos: metadata,
      },
    });
  }
}
