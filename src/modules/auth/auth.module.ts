import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { PasswordService } from './services/password.service';
import { JwtService } from './services/jwt.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessTokenExpiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: 60000, // 1 minuto
        limit: 3, // 3 intentos por minuto para login
      },
      {
        name: 'register',
        ttl: 300000, // 5 minutos
        limit: 2, // 2 registros por 5 minutos
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtService,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
    JwtRefreshGuard,
  ],
  exports: [AuthService, JwtService, PasswordService],
})
export class AuthModule {}
