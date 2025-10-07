import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify, importPKCS8, importSPKI, type JWTPayload } from 'jose';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class JwtService implements OnModuleInit {
  private readonly logger = new Logger(JwtService.name);
  private privateKey: any;
  private publicKey: any;
  private isRSA: boolean = false;
  private keysLoaded: boolean = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.loadKeys();
  }

  private async loadKeys(): Promise<void> {
    try {
      // Cargar claves RSA desde archivos
      const privateKeyPath = process.env['JWT_PRIVATE_KEY_PATH'] || join(process.cwd(), 'keys', 'private.pem');
      const publicKeyPath = process.env['JWT_PUBLIC_KEY_PATH'] || join(process.cwd(), 'keys', 'public.pem');
      
      const privateKeyPem = readFileSync(privateKeyPath, 'utf8');
      const publicKeyPem = readFileSync(publicKeyPath, 'utf8');
      
      // Guardar las claves PEM para convertir después
      this.privateKey = privateKeyPem;
      this.publicKey = publicKeyPem;
      this.isRSA = true;
      
      this.keysLoaded = true;
      this.logger.log('✅ JWT RSA keys loaded successfully');
    } catch (error) {
      this.logger.error('❌ Failed to load JWT keys', error);
      // Fallback a clave secreta simple si las claves RSA no están disponibles
      const secret = process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-for-development-only';
      this.privateKey = secret;
      this.publicKey = secret;
      this.isRSA = false;
      this.keysLoaded = true;
      this.logger.warn('⚠️ Using fallback JWT secret');
    }
  }

  private ensureKeysLoaded(): void {
    if (!this.keysLoaded) {
      throw new Error('JWT keys not loaded yet. Service is not ready.');
    }
  }

  private async getPrivateKey() {
    if (this.isRSA) {
      return await importPKCS8(this.privateKey, 'RS256');
    }
    return new TextEncoder().encode(this.privateKey);
  }

  private async getPublicKey() {
    if (this.isRSA) {
      return await importSPKI(this.publicKey, 'RS256');
    }
    return new TextEncoder().encode(this.publicKey);
  }

  /**
   * Genera un access token JWT
   */
  async generateAccessToken(user: any): Promise<string> {
    this.ensureKeysLoaded();
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
      const algorithm = this.isRSA ? 'RS256' : 'HS256';
      const key = await this.getPrivateKey();
      
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: algorithm })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(key);

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
    this.ensureKeysLoaded();
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
      const algorithm = this.isRSA ? 'RS256' : 'HS256';
      const key = await this.getPrivateKey();
      
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: algorithm })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(key);

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
    this.ensureKeysLoaded();
    try {
      const algorithm = this.isRSA ? 'RS256' : 'HS256';
      const key = await this.getPublicKey();
      
      const { payload } = await jwtVerify(token, key, {
        algorithms: [algorithm],
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

    if (payload['type'] !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  }

  /**
   * Verifica un access token específicamente
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const payload = await this.verifyToken(token);

    if (payload['type'] !== 'access') {
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

    const value = parseInt(match[1] || '0', 10);
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
