import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private secretKey: Uint8Array;

  constructor(private readonly configService: ConfigService) {
    this.loadSecret();
  }

  private loadSecret(): void {
    try {
      // Usar una clave secreta simple para desarrollo
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-only';
      this.secretKey = new TextEncoder().encode(secret);
      this.logger.log('✅ JWT secret loaded successfully');
    } catch (error) {
      this.logger.error('❌ Failed to load JWT secret', error);
      throw new Error('JWT secret not found.');
    }
  }

  /**
   * Genera un access token JWT
   */
  async generateAccessToken(user: any): Promise<string> {
    const expiresIn = this.configService.get<string>('jwt.accessTokenExpiresIn', '15m');
    const now = Math.floor(Date.now() / 1000);

    const payload: JWTPayload = {
      sub: user.id.toString(),
      email: user.correo,
      name: user.nombre,
      type: 'access',
      iat: now,
      exp: now + this.parseExpiration(expiresIn),
    };

    try {
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(this.secretKey);

      return jwt;
    } catch (error) {
      this.logger.error('Error generating access token', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Genera un refresh token JWT
   */
  async generateRefreshToken(user: any): Promise<string> {
    const expiresIn = this.configService.get<string>('jwt.refreshTokenExpiresIn', '7d');
    const now = Math.floor(Date.now() / 1000);

    const payload: JWTPayload = {
      sub: user.id.toString(),
      email: user.correo,
      type: 'refresh',
      iat: now,
      exp: now + this.parseExpiration(expiresIn),
    };

    try {
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(this.secretKey);

      return jwt;
    } catch (error) {
      this.logger.error('Error generating refresh token', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verifica y decodifica un JWT
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey, {
        algorithms: ['HS256'],
      });

      return payload;
    } catch (error) {
      this.logger.error('Error verifying token', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Verifica un refresh token específicamente
   */
  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    const payload = await this.verifyToken(token);

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  }

  /**
   * Verifica un access token específicamente
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const payload = await this.verifyToken(token);

    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return payload;
  }

  /**
   * Convierte una cadena de expiración a segundos
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiration format');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        throw new Error('Invalid expiration unit');
    }
  }
}
