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

## 🏗️ Arquitectura

```
src/
├── common/                 # Utilidades compartidas
│   ├── prisma/            # Servicio de base de datos
│   ├── filters/           # Filtros de excepciones
│   └── interceptors/      # Interceptores globales
├── config/                # Configuración de la aplicación
├── modules/               # Módulos de funcionalidad
│   ├── auth/              # Autenticación y autorización
│   ├── users/             # Gestión de usuarios
│   ├── wallet/            # Billetera virtual
│   ├── bets/              # Sistema de apuestas
│   ├── leagues/           # Catálogo de ligas
│   ├── teams/             # Catálogo de equipos
│   └── events/            # Catálogo de eventos
└── main.ts               # Punto de entrada
```

## 🛠️ Tecnologías

- **Framework**: NestJS 10.x
- **Lenguaje**: TypeScript 5.x
- **Base de datos**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **Autenticación**: JWT (RS256) + Argon2id
- **Validación**: class-validator + class-transformer
- **Documentación**: Swagger/OpenAPI 3.0
- **Logging**: Pino
- **Rate Limiting**: @nestjs/throttler

## 📋 Prerrequisitos

- Node.js 18+ 
- PostgreSQL 15+
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
DATABASE_URL="postgresql://username:password@localhost:5432/betting_db?schema=public"

# JWT Configuration
JWT_PRIVATE_KEY_PATH="./keys/private.pem"
JWT_PUBLIC_KEY_PATH="./keys/public.pem"
JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
JWT_REFRESH_TOKEN_EXPIRES_IN="7d"

# Application
NODE_ENV="development"
PORT=3000
API_PREFIX="api/v1"

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# Logging
LOG_LEVEL="debug"
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

## 🔐 Autenticación

La API utiliza JWT con RS256 para la autenticación. Incluye:

- **Access Token**: Válido por 15 minutos
- **Refresh Token**: Válido por 7 días
- **Hash de contraseñas**: Argon2id
- **Rate limiting**: 5 intentos de login por minuto

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

# Base de datos
npm run db:generate        # Generar cliente Prisma
npm run migrate:dev        # Aplicar migraciones
npm run migrate:deploy     # Deploy migraciones
npm run migrate:reset      # Reset base de datos
npm run db:seed           # Poblar con datos de prueba
npm run db:studio         # Abrir Prisma Studio

# Testing
npm run test              # Tests unitarios
npm run test:watch        # Tests en modo watch
npm run test:cov          # Coverage report
npm run test:e2e          # Tests end-to-end

# Producción
npm run build             # Compilar aplicación
npm run start:prod        # Ejecutar en producción

# Utilidades
npm run lint              # Linter
npm run format            # Formatear código
```

## 🚀 Despliegue

### Docker (Recomendado)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

### Variables de entorno de producción

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/betting_prod
JWT_PRIVATE_KEY_PATH=/app/keys/private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/public.pem
LOG_LEVEL=info
```

## 📈 Escalabilidad

### Consideraciones
- **Conexiones DB**: Pool de conexiones configurado
- **Rate limiting**: Por usuario y global
- **Caching**: Preparado para Redis
- **Load balancing**: Stateless design
- **Monitoring**: Logs estructurados

### Próximas mejoras
- [ ] Cache con Redis
- [ ] Queue system (Bull/BullMQ)
- [ ] Microservicios
- [ ] Kubernetes deployment
- [ ] Métricas con Prometheus

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la [documentación de la API](http://localhost:3000/api/docs)
2. Consulta los [issues existentes](../../issues)
3. Crea un [nuevo issue](../../issues/new)

## 📞 Contacto

- **Desarrollador**: Tu Nombre
- **Email**: tu.email@ejemplo.com
- **Proyecto**: [GitHub Repository](../../)

---

⭐ **¡No olvides darle una estrella al proyecto si te gusta!** ⭐