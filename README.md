# 🎯 Betting Backend API

API backend para sistema de apuestas deportivas construida con **NestJS**, **TypeScript** y **PostgreSQL**.

## 🚀 Características

- **Autenticación JWT** con RS256 y refresh tokens
- **Sistema de roles y permisos** granular
- **Billetera virtual** con transacciones atómicas
- **Sistema de apuestas** con idempotencia
- **Catálogo deportivo** (ligas, equipos, eventos)
- **Cuotas dinámicas** con proveedores mock
- **Auditoría completa** de todas las operaciones
- **Rate limiting** y validaciones robustas
- **Documentación Swagger** automática
- **Health checks** para monitoreo
- **Docker** y Docker Compose listos para producción
- **Logging estructurado** con sanitización de datos sensibles
- **Connection pooling** optimizado
- **TypeScript estricto** para mejor calidad de código

## 🏗️ Arquitectura

```
src/
├── common/                 # Utilidades compartidas
│   ├── prisma/            # Servicio de base de datos con connection pooling
│   ├── filters/           # Filtros de excepciones mejorados
│   └── interceptors/      # Interceptores globales
├── config/                # Configuración de la aplicación
│   ├── configuration.ts   # Configuración centralizada
│   └── validation.ts      # Validación de variables de entorno
├── modules/               # Módulos de funcionalidad
│   ├── auth/              # Autenticación y autorización
│   ├── users/             # Gestión de usuarios
│   ├── wallet/            # Billetera virtual
│   ├── bets/              # Sistema de apuestas
│   ├── leagues/           # Catálogo de ligas
│   ├── teams/             # Catálogo de equipos
│   ├── events/            # Catálogo de eventos
│   └── health/            # Health checks y monitoreo
└── main.ts               # Punto de entrada
```

## 🛠️ Tecnologías

- **Framework**: NestJS 10.x
- **Lenguaje**: TypeScript 5.x (configuración estricta)
- **Base de datos**: PostgreSQL 15+ con connection pooling
- **ORM**: Prisma 5.x
- **Autenticación**: JWT (RS256) + Argon2id
- **Validación**: class-validator + class-transformer
- **Documentación**: Swagger/OpenAPI 3.0
- **Logging**: Pino con sanitización de datos sensibles
- **Rate Limiting**: @nestjs/throttler (configuración estricta)
- **Health Checks**: Endpoints de monitoreo
- **Docker**: Multi-stage build optimizado
- **ESLint**: Configuración estricta para Node.js

## 📋 Prerrequisitos

- Node.js 18+ 
- PostgreSQL 15+
- Docker y Docker Compose (opcional)
- npm o yarn

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd betting-backend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp env.example .env
```

Edita el archivo `.env` con tus configuraciones:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/betting_db?schema=public&connection_limit=20&pool_timeout=20&connect_timeout=10"

# Redis (opcional para caching)
REDIS_URL="redis://localhost:6379"

# JWT Configuration
JWT_PRIVATE_KEY_PATH="./keys/private.pem"
JWT_PUBLIC_KEY_PATH="./keys/public.pem"
JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
JWT_REFRESH_TOKEN_EXPIRES_IN="7d"
JWT_SECRET="your-super-secret-jwt-key-for-development-only"

# Application
NODE_ENV="development"
PORT=3000
API_PREFIX="api/v1"

# Rate Limiting - Configuración más estricta
THROTTLE_TTL=60
THROTTLE_LIMIT=20
THROTTLE_STRICT_TTL=300
THROTTLE_STRICT_LIMIT=5

# Logging
LOG_LEVEL="debug"

# Health Checks
HEALTH_CHECK_TIMEOUT=5000

# CORS (para producción)
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET="your-session-secret-key"

# Monitoring (opcional)
PROMETHEUS_ENABLED=false
PROMETHEUS_PORT=9090
```

### 4. Generar claves JWT

```bash
node scripts/generate-jwt-keys.js
```

### 5. Configurar base de datos

```bash
# Opción 1: Script automático
node scripts/setup-database.js

# Opción 2: Manual
npm run db:generate
npm run migrate:dev
npm run db:seed
```

### 6. Iniciar la aplicación

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Con Docker (recomendado)
npm run start:docker

# Solo base de datos con Docker
docker-compose up postgres redis
```

## 📚 API Endpoints

### Autenticación
- `POST /api/v1/auth/register` - Registro de usuario
- `POST /api/v1/auth/login` - Inicio de sesión
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/logout` - Cerrar sesión

### Usuarios
- `GET /api/v1/users` - Listar usuarios
- `GET /api/v1/users/:id` - Obtener usuario
- `POST /api/v1/users` - Crear usuario
- `PUT /api/v1/users/:id` - Actualizar usuario
- `DELETE /api/v1/users/:id` - Eliminar usuario
- `GET /api/v1/users/profile/me` - Perfil actual

### Billetera
- `GET /api/v1/wallet` - Obtener saldo
- `POST /api/v1/wallet/deposit` - Depositar dinero
- `POST /api/v1/wallet/withdraw` - Retirar dinero
- `GET /api/v1/wallet/transactions` - Historial de transacciones

### Apuestas
- `POST /api/v1/bets` - Crear apuesta
- `GET /api/v1/bets` - Listar apuestas
- `GET /api/v1/bets/:id` - Obtener apuesta
- `POST /api/v1/bets/:id/cancel` - Cancelar apuesta
- `GET /api/v1/bets/odds/:eventId` - Obtener cuotas

### Catálogo
- `GET /api/v1/leagues` - Listar ligas
- `GET /api/v1/teams` - Listar equipos
- `GET /api/v1/events` - Listar eventos

### Health Checks
- `GET /api/v1/health` - Health check completo
- `GET /api/v1/health/ready` - Readiness probe
- `GET /api/v1/health/live` - Liveness probe

## 🔐 Autenticación

La API utiliza JWT con RS256 para la autenticación. Incluye:

- **Access Token**: Válido por 15 minutos
- **Refresh Token**: Válido por 7 días
- **Hash de contraseñas**: Argon2id
- **Rate limiting**: 3 intentos de login por minuto, 2 registros por 5 minutos
- **Carga asíncrona**: Claves JWT cargadas de forma asíncrona

### Ejemplo de uso

```bash
# 1. Registro
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "usuario@ejemplo.com",
    "nombre": "Usuario Test",
    "contrasena": "MiContraseña123!"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "usuario@ejemplo.com",
    "contrasena": "MiContraseña123!"
  }'

# 3. Usar token en requests
curl -X GET http://localhost:3000/api/v1/wallet \
  -H "Authorization: Bearer <access_token>"
```

## 💰 Sistema de Billetera

### Características
- **Saldo disponible**: Dinero para apostar
- **Saldo reservado**: Dinero bloqueado en apuestas
- **Transacciones atómicas**: Garantiza consistencia
- **Historial completo**: Todas las operaciones registradas

### Tipos de transacciones
- `deposito` - Ingreso de dinero
- `retiro` - Salida de dinero
- `apuesta` - Dinero apostado
- `ganancia` - Ganancias de apuestas
- `reserva` - Dinero reservado
- `liberacion` - Liberación de reserva

## 🎲 Sistema de Apuestas

### Características
- **Idempotencia**: Evita apuestas duplicadas
- **Validación de saldo**: Verifica fondos disponibles
- **Cuotas dinámicas**: Generadas por proveedores mock
- **Estados de apuesta**: recibida, en_proceso, completada, fallida, cancelada

### Tipos de mercados
- `1X2` - Ganador del partido
- `Over/Under` - Total de goles
- `Both Teams to Score` - Ambos equipos marcan
- `Correct Score` - Resultado exacto

## 🗄️ Base de Datos

### Esquema principal
- **Usuarios**: Gestión de cuentas y autenticación
- **Organizaciones**: Multi-tenancy
- **Roles y Permisos**: Control de acceso granular
- **Billeteras**: Saldos y transacciones
- **Catálogo**: Ligas, equipos, eventos
- **Apuestas**: Solicitudes y resultados
- **Auditoría**: Log de todas las operaciones

### Migraciones
```bash
# Crear migración
npm run migrate:dev

# Aplicar migraciones
npm run migrate:deploy

# Resetear base de datos
npm run migrate:reset
```

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📊 Monitoreo

### Logs
- **Estructurados**: Formato JSON con Pino
- **Niveles**: error, warn, info, debug, verbose
- **Contexto**: Incluye request ID y usuario

### Métricas
- **Rate limiting**: Control de requests por minuto
- **Auditoría**: Registro de todas las operaciones
- **Health checks**: Estado de la aplicación

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev          # Servidor con hot-reload
npm run start:debug        # Servidor con debug

# Docker
npm run start:docker      # Iniciar con Docker Compose
npm run start:docker:prod  # Iniciar en modo producción
npm run docker:build      # Construir imagen Docker
npm run docker:run        # Ejecutar contenedor

# Base de datos
npm run db:generate        # Generar cliente Prisma
npm run migrate:dev        # Aplicar migraciones
npm run migrate:deploy     # Deploy migraciones
npm run migrate:reset      # Reset base de datos
npm run db:seed           # Poblar con datos de prueba
npm run db:studio         # Abrir Prisma Studio
npm run db:setup          # Setup completo de BD

# Testing
npm run test              # Tests unitarios
npm run test:watch        # Tests en modo watch
npm run test:cov          # Coverage report
npm run test:e2e          # Tests end-to-end

# Producción
npm run build             # Compilar aplicación
npm run start:prod        # Ejecutar en producción

# Health & Monitoring
npm run health:check      # Verificar health check

# Utilidades
npm run lint              # Linter con fix automático
npm run lint:check        # Solo verificar linting
npm run format            # Formatear código
npm run clean             # Limpiar archivos temporales
```

## 🚀 Despliegue

### Docker (Recomendado)

El proyecto incluye un `Dockerfile` optimizado con multi-stage build:

```bash
# Construir imagen
npm run docker:build

# Ejecutar contenedor
npm run docker:run

# O usar Docker Compose (recomendado)
npm run start:docker
```

### Docker Compose

El proyecto incluye `docker-compose.yml` con:
- **PostgreSQL**: Base de datos principal
- **Redis**: Cache y sesiones
- **App**: Aplicación NestJS
- **Prisma Studio**: Administración de BD

```bash
# Iniciar todos los servicios
docker-compose up --build

# Solo base de datos
docker-compose up postgres redis

# Modo producción
docker-compose -f docker-compose.prod.yml up --build
```

### Variables de entorno de producción

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/betting_prod?connection_limit=20&pool_timeout=20&connect_timeout=10
REDIS_URL=redis://redis:6379
JWT_PRIVATE_KEY_PATH=/app/keys/private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/public.pem
JWT_SECRET=your-super-secret-jwt-key-for-production
LOG_LEVEL=info
THROTTLE_LIMIT=20
THROTTLE_STRICT_LIMIT=5
ALLOWED_ORIGINS=https://yourdomain.com
BCRYPT_ROUNDS=12
HEALTH_CHECK_TIMEOUT=5000
```

## ✨ Mejoras Implementadas

### 🔐 Seguridad
- **JWT asíncrono**: Carga de claves no bloqueante con verificación de estado
- **Rate limiting estricto**: 20 req/min global, 5 req/5min para endpoints sensibles
- **Logging sanitizado**: Eliminación automática de datos sensibles en logs
- **Validación robusta**: Esquema Joi expandido con nuevas variables

### ⚡ Rendimiento
- **Connection pooling**: 20 conexiones PostgreSQL con timeouts optimizados
- **Transacciones optimizadas**: 2s maxWait, 5s timeout
- **Logging condicional**: Queries solo en desarrollo
- **TypeScript estricto**: Mejor calidad de código y detección de errores

### 📊 Monitoreo
- **Health checks**: `/health`, `/health/ready`, `/health/live`
- **Métricas preparadas**: Estructura para Prometheus
- **Logging estructurado**: Con sanitización automática
- **Docker health checks**: Verificación automática de contenedores

### 🐳 DevOps
- **Dockerfile optimizado**: Multi-stage build
- **Docker Compose**: Stack completo con PostgreSQL y Redis
- **Scripts mejorados**: Comandos para Docker, health checks, linting
- **Variables de entorno**: Configuración expandida y validada

### 🔧 Calidad de Código
- **ESLint corregido**: Configuración específica para Node.js
- **TypeScript estricto**: Configuración completa de strict mode
- **Error handling**: Filtros específicos para errores de Prisma
- **Idempotencia mejorada**: TTL configurable para claves

## 📈 Escalabilidad

### Mejoras Implementadas
- **Conexiones DB**: Pool de conexiones configurado (20 conexiones)
- **Rate limiting**: Configuración estricta (20 req/min global, 5 req/5min estricto)
- **Health checks**: Endpoints de monitoreo implementados
- **Logging**: Sanitización de datos sensibles
- **TypeScript**: Configuración estricta para mejor calidad
- **Docker**: Multi-stage build optimizado
- **Connection pooling**: Timeouts optimizados (2s maxWait, 5s timeout)

### Características de Producción
- **JWT asíncrono**: Carga de claves no bloqueante
- **Idempotencia**: TTL configurable (1 hora por defecto)
- **Error handling**: Filtros específicos para Prisma
- **ESLint**: Configuración estricta para Node.js
- **Docker Compose**: Stack completo con PostgreSQL y Redis

### Próximas mejoras
- [ ] Cache con Redis (estructura preparada)
- [ ] Queue system (Bull/BullMQ)
- [ ] Métricas con Prometheus (configuración preparada)
- [ ] Microservicios
- [ ] Kubernetes deployment

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🛠️ Troubleshooting

### Problemas Comunes

#### Error de conexión a la base de datos
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose up postgres

# Verificar variables de entorno
echo $DATABASE_URL

# Aplicar migraciones
npm run migrate:dev
```

#### Error de claves JWT
```bash
# Generar nuevas claves
node scripts/generate-jwt-keys.js

# Verificar que las claves existan
ls -la keys/
```

#### Error de rate limiting
```bash
# Verificar configuración
npm run lint:check

# Limpiar cache de rate limiting (si usas Redis)
redis-cli FLUSHDB
```

#### Problemas de Docker
```bash
# Limpiar contenedores
docker-compose down -v

# Reconstruir desde cero
docker-compose up --build --force-recreate
```

### Health Checks

```bash
# Verificar estado de la aplicación
curl http://localhost:3000/api/v1/health

# Verificar readiness
curl http://localhost:3000/api/v1/health/ready

# Verificar liveness
curl http://localhost:3000/api/v1/health/live
```

### Logs y Debugging

```bash
# Ver logs en tiempo real
docker-compose logs -f app

# Ver logs de base de datos
docker-compose logs postgres

# Modo debug
npm run start:debug
```

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la [documentación de la API](http://localhost:3000/api/docs)
2. Consulta los [issues existentes](../../issues)
3. Crea un [nuevo issue](../../issues/new)

## 📋 Changelog

### v1.1.0 - Mejoras de Seguridad y Rendimiento

#### 🔐 Seguridad
- ✅ Carga asíncrona de claves JWT con verificación de estado
- ✅ Rate limiting más estricto (20 req/min global, 5 req/5min estricto)
- ✅ Sanitización automática de datos sensibles en logs
- ✅ Validación expandida de variables de entorno

#### ⚡ Rendimiento
- ✅ Connection pooling PostgreSQL (20 conexiones)
- ✅ Timeouts optimizados (2s maxWait, 5s timeout)
- ✅ Logging condicional (queries solo en desarrollo)
- ✅ TypeScript estricto para mejor calidad

#### 📊 Monitoreo
- ✅ Health checks implementados (`/health`, `/health/ready`, `/health/live`)
- ✅ Estructura preparada para métricas Prometheus
- ✅ Docker health checks automáticos

#### 🐳 DevOps
- ✅ Dockerfile multi-stage optimizado
- ✅ Docker Compose con PostgreSQL y Redis
- ✅ Scripts mejorados para Docker y health checks
- ✅ Variables de entorno expandidas y validadas

#### 🔧 Calidad
- ✅ ESLint corregido para Node.js
- ✅ TypeScript strict mode completo
- ✅ Error handling mejorado para Prisma
- ✅ Idempotencia con TTL configurable

## 📞 Contacto

- **Desarrollador**: Tu Nombre
- **Email**: tu.email@ejemplo.com
- **Proyecto**: [GitHub Repository](../../)

---

⭐ **¡No olvides darle una estrella al proyecto si te gusta!** ⭐