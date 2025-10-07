import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),

  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().optional(),

  JWT_SECRET: Joi.string().default('your-super-secret-jwt-key-for-development-only'),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
  JWT_PRIVATE_KEY_PATH: Joi.string().optional(),
  JWT_PUBLIC_KEY_PATH: Joi.string().optional(),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(20),
  THROTTLE_STRICT_TTL: Joi.number().default(300),
  THROTTLE_STRICT_LIMIT: Joi.number().default(5),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('debug'),

  ALLOWED_ORIGINS: Joi.string().optional(),
  BCRYPT_ROUNDS: Joi.number().default(12),
  SESSION_SECRET: Joi.string().optional(),
  HEALTH_CHECK_TIMEOUT: Joi.number().default(5000),
  PROMETHEUS_ENABLED: Joi.boolean().default(false),
  PROMETHEUS_PORT: Joi.number().default(9090),
});
