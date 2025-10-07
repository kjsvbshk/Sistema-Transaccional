export const configuration = () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-only',
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
    privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem',
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem',
  },

  throttler: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 20,
    strictTtl: parseInt(process.env.THROTTLE_STRICT_TTL, 10) || 300,
    strictLimit: parseInt(process.env.THROTTLE_STRICT_LIMIT, 10) || 5,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-key',
  },

  health: {
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10) || 5000,
  },

  monitoring: {
    prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT, 10) || 9090,
  },
});
