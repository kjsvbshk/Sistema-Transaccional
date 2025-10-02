import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkIdempotency(key: string) {
    const existing = await this.prisma.claveIdempotencia.findUnique({
      where: { clave: key },
    });

    if (existing && existing.resultado) {
      this.logger.log(`Request ${key} already processed`);
      return existing.resultado as any;
    }

    return null;
  }

  async lockRequest(key: string, lockedBy: string) {
    try {
      await this.prisma.claveIdempotencia.create({
        data: {
          clave: key,
          bloqueadoPor: lockedBy,
        },
      });
      this.logger.log(`Request ${key} locked by ${lockedBy}`);
    } catch (error) {
      // Si ya existe, verificar si está bloqueado
      const existing = await this.prisma.claveIdempotencia.findUnique({
        where: { clave: key },
      });

      if (existing && existing.bloqueadoPor && !existing.resultado) {
        throw new Error('Request is already being processed');
      }

      // Si no está bloqueado, actualizar
      if (existing && !existing.bloqueadoPor) {
        await this.prisma.claveIdempotencia.update({
          where: { clave: key },
          data: {
            bloqueadoPor: lockedBy,
          },
        });
        this.logger.log(`Request ${key} locked by ${lockedBy} (updated)`);
      }
    }
  }

  async unlockRequest(key: string) {
    await this.prisma.claveIdempotencia.delete({
      where: { clave: key },
    });
    this.logger.log(`Request ${key} unlocked`);
  }

  async saveResult(key: string, result: any) {
    await this.prisma.claveIdempotencia.update({
      where: { clave: key },
      data: {
        resultado: result,
        bloqueadoPor: null,
      },
    });
    this.logger.log(`Result saved for request ${key}`);
  }

  async getRequestStatus(key: string) {
    const request = await this.prisma.claveIdempotencia.findUnique({
      where: { clave: key },
    });

    if (!request) {
      return { status: 'not_found' };
    }

    if (request.resultado) {
      return { status: 'completed', result: request.resultado };
    }

    if (request.bloqueadoPor) {
      return { status: 'processing', lockedBy: request.bloqueadoPor };
    }

    return { status: 'pending' };
  }
}
