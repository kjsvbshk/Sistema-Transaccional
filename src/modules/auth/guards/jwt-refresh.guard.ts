import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '../services/jwt.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PasswordService } from '../services/password.service';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Refresh token no proporcionado');
    }

    try {
      // Verificar el refresh token
      const payload = await this.jwtService.verifyRefreshToken(token);

      // Verificar que el usuario existe y está activo
      const user = await this.prisma.usuario.findUnique({
        where: { id: BigInt(payload.sub || '0') },
      });

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      if (user.estado !== 'activo') {
        throw new UnauthorizedException('Usuario inactivo');
      }

      // Verificar que la sesión existe y no está revocada
      const session = await this.prisma.sesion.findFirst({
        where: {
          usuarioId: user.id,
          revocado: false,
          expiraEn: {
            gt: new Date(),
          },
        },
        orderBy: {
          creadoEn: 'desc',
        },
      });

      if (!session) {
        throw new UnauthorizedException('Sesión no encontrada o expirada');
      }

      // Verificar que el refresh token coincide con el hash almacenado
      const isTokenValid = await this.passwordService.verifyToken(
        token,
        session.refreshTokenHash,
      );

      if (!isTokenValid) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      // Agregar información del usuario y sesión al request
      request.user = {
        id: user.id,
        email: user.correo,
        name: user.nombre,
        status: user.estado,
        sessionId: session.id,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
