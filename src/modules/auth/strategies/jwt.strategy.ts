import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { JwtService } from '../services/jwt.service';
import { readFileSync } from 'fs';
import { join } from 'path';

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
      secretOrKey: JwtStrategy.getPublicKey(),
      algorithms: ['RS256', 'HS256'], // Soporte para ambos algoritmos
    });
  }

  private static getPublicKey(): string {
    try {
      // Intentar cargar la clave pública RSA
      const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || join(process.cwd(), 'keys', 'public.pem');
      return readFileSync(publicKeyPath, 'utf8');
    } catch (error) {
      // Fallback a clave secreta simple
      return process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-only';
    }
  }

  async validate(payload: any) {
    try {
      // Verificar que el usuario existe y está activo
      const user = await this.prisma.usuario.findUnique({
        where: { id: BigInt(payload.sub) },
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
