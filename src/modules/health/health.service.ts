import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
    };
    memory: {
      status: 'up' | 'down';
      used: number;
      free: number;
      total: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();
    const memoryUsage = process.memoryUsage();
    
    try {
      // Verificar base de datos
      const dbStartTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStartTime;

      const checks = {
        database: {
          status: 'up' as const,
          responseTime: dbResponseTime,
        },
        memory: {
          status: memoryUsage.heapUsed / memoryUsage.heapTotal < 0.9 ? 'up' as const : 'down' as const,
          used: memoryUsage.heapUsed,
          free: memoryUsage.heapTotal - memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
        },
      };

      const isHealthy = checks.database.status === 'up' && checks.memory.status === 'up';

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks,
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: {
            status: 'down',
          },
          memory: {
            status: 'up',
            used: memoryUsage.heapUsed,
            free: memoryUsage.heapTotal - memoryUsage.heapUsed,
            total: memoryUsage.heapTotal,
          },
        },
      };
    }
  }

  async getReadinessStatus(): Promise<{ status: 'ready' | 'not_ready'; timestamp: string }> {
    try {
      // Verificar que la base de datos esté disponible
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      };
    }
  }

  getLivenessStatus(): { status: 'alive'; timestamp: string; uptime: number } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
