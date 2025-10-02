import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  /**
   * Genera un hash de la contraseña usando argon2id
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3, // 3 iteraciones
      parallelism: 1, // 1 hilo
      hashLength: 32, // 32 bytes
    });
  }

  /**
   * Verifica si la contraseña coincide con el hash
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hashedPassword, password);
    } catch (error) {
      return false;
    }
  }

  /**
   * Genera un hash para tokens (más rápido que para contraseñas)
   */
  async hashToken(token: string): Promise<string> {
    return argon2.hash(token, {
      type: argon2.argon2id,
      memoryCost: 2 ** 14, // 16 MB
      timeCost: 2, // 2 iteraciones
      parallelism: 1, // 1 hilo
      hashLength: 32, // 32 bytes
    });
  }

  /**
   * Verifica si el token coincide con el hash
   */
  async verifyToken(token: string, hashedToken: string): Promise<boolean> {
    try {
      return await argon2.verify(hashedToken, token);
    } catch (error) {
      return false;
    }
  }
}
