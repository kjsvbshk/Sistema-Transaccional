import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { BetsModule } from './modules/bets/bets.module';
import { LeaguesModule } from './modules/leagues/leagues.module';
import { TeamsModule } from './modules/teams/teams.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';

import { configuration } from './config/configuration';
import { validationSchema } from './config/validation';

// Función para sanitizar datos sensibles en logs
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'contrasena', 'token', 'secret', 'key', 'apiKey'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

@Controller()
class AppController {
  @Get()
  getRoot() {
    return {
      success: true,
      data: {
        message: 'Betting API is running',
        version: '1.0.0',
        endpoints: {
          auth: '/api/v1/auth',
          users: '/api/v1/users',
          wallet: '/api/v1/wallet',
          bets: '/api/v1/bets',
          events: '/api/v1/events',
          leagues: '/api/v1/leagues',
          teams: '/api/v1/teams',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  controllers: [AppController],
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
    }),

    // Logger
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
        serializers: {
          req: (req) => {
            const sanitizedHeaders = { ...req.headers };
            // Remover headers sensibles
            delete sanitizedHeaders.authorization;
            delete sanitizedHeaders.cookie;
            delete sanitizedHeaders['x-api-key'];
            
            return {
              method: req.method,
              url: req.url,
              headers: {
                'user-agent': req.headers['user-agent'],
                'content-type': req.headers['content-type'],
                'accept': req.headers['accept'],
              },
              // Solo incluir body si no contiene datos sensibles
              body: sanitizeRequestBody(req.body),
            };
          },
          res: (res) => ({
            statusCode: res.statusCode,
            responseTime: res.responseTime,
          }),
        },
      },
    }),

    // Rate limiting - Configuración más estricta
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000, // 1 minuto
        limit: 20, // 20 requests por minuto global
      },
      {
        name: 'strict',
        ttl: 300000, // 5 minutos
        limit: 5, // 5 requests por 5 minutos para endpoints sensibles
      },
    ]),

    // Módulos de la aplicación
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WalletModule,
    BetsModule,
    LeaguesModule,
    TeamsModule,
    EventsModule,
  ],
})
export class AppModule {}
