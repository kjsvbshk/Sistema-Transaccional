import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env['DATABASE_URL'] + '?connection_limit=20&pool_timeout=20&connect_timeout=10'
        }
      },
      log: process.env['NODE_ENV'] === 'development' ? [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ] : [
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    // Configurar listeners de eventos (comentados temporalmente por problemas de tipos)
    // this.$on('query', (e) => {
    //   this.logger.debug(`Query: ${e.query}`);
    //   this.logger.debug(`Params: ${e.params}`);
    //   this.logger.debug(`Duration: ${e.duration}ms`);
    // });

    // this.$on('error', (e) => {
    //   this.logger.error(`Error: ${e.message}`);
    // });

    // this.$on('info', (e) => {
    //   this.logger.log(`Info: ${e.message}`);
    // });

    // this.$on('warn', (e) => {
    //   this.logger.warn(`Warning: ${e.message}`);
    // });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Database disconnected');
  }

  /**
   * Ejecuta una transacción con retry automático
   */
  async executeTransaction<T>(
    fn: (prisma: any) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn, {
          maxWait: 2000, // 2 segundos
          timeout: 5000, // 5 segundos
        });
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Transaction attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          this.logger.error(`Transaction failed after ${maxRetries} attempts`);
          throw lastError;
        }

        // Esperar antes del siguiente intento
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw lastError!;
  }
}
