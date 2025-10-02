import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { JwtService } from '../services/jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-only',
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    try {
      // Verificar el token usando nuestro servicio JWT
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (!token) {
        throw new UnauthorizedException('Token no proporcionado');
      }

      const verifiedPayload = await this.jwtService.verifyAccessToken(token);

      // Verificar que el usuario existe y está activo
      const user = await this.prisma.usuario.findUnique({
        where: { id: BigInt(verifiedPayload.sub) },
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
      };
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
