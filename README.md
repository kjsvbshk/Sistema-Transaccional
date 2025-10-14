# 🟩 Backend - Sistema de Apuestas Deportivas

Backend minimalista y funcional para un sistema de apuestas deportivas construido con Node.js, Express y TypeScript.

## 🚀 Stack Técnico

- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** con pg (sin ORM, solo consultas SQL simples)
- **jsonwebtoken** para generar tokens JWT
- **bcryptjs** para hashear contraseñas
- **dotenv** para variables de entorno
- **cors** para manejo de CORS
- **swagger-jsdoc** y **swagger-ui-express** para documentación de API

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── server.ts           # Arranque del servidor
│   ├── db.ts               # Conexión a PostgreSQL
│   ├── config/
│   │   └── swagger.ts      # Configuración de Swagger
│   ├── routes/
│   │   ├── auth.routes.ts  # Rutas de autenticación
│   │   └── roles.routes.ts # Rutas protegidas por roles
│   ├── middleware/
│   │   └── auth.ts         # Verificación JWT y roles
│   ├── controllers/
│   │   ├── auth.controller.ts  # Controladores de auth
│   │   └── roles.controller.ts # Controladores de roles
│   └── models/
│       └── init-data.sql   # Datos iniciales
├── mer.sql                 # Esquema completo de la base de datos
├── setup-database.js       # Script de configuración automática
├── package.json
├── tsconfig.json
└── env.example
```

## 🛠️ Instalación y Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Copia `env.example` a `.env` y configura:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=betting_db
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui

# Server
PORT=3001
NODE_ENV=development
```

### 3. Configurar PostgreSQL

**Para base de datos nueva:**
```bash
# Crear la base de datos manualmente en PostgreSQL
createdb transaccionales

# Ejecutar el script de configuración automática
npm run setup-db
```

**Para base de datos existente (como tu caso):**
```bash
# Si ya tienes la base de datos 'transaccionales' con el esquema de mer.sql
# Solo necesitas insertar los datos iniciales
npm run init-data
```

**Configuración manual:**
```sql
-- Crear base de datos
CREATE DATABASE transaccionales;

-- Conectar a la base de datos
\c transaccionales;

-- Ejecutar el esquema completo
\i mer.sql

-- Ejecutar el script de datos iniciales
\i src/models/init-data.sql
```

### 4. Ejecutar el servidor
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## 🔐 API Endpoints

### Autenticación
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Inicio de sesión

### Rutas Protegidas
- `GET /api/admin` - Dashboard de administrador (requiere rol 'admin')
- `GET /api/user` - Dashboard de usuario (requiere rol 'user')
- `GET /api/operator` - Dashboard de operador (requiere rol 'operator')

### Utilidades
- `GET /` - Mensaje de bienvenida
- `GET /health` - Estado del servidor y base de datos

### Documentación
- `GET /api-docs` - Interfaz de Swagger UI
- `GET /api-docs.json` - Especificación OpenAPI en JSON

## 🔒 Sistema de Autenticación

### Registro
```json
POST /auth/register
{
  "name": "Juan Pérez",
  "email": "juan@email.com",
  "password": "password123"
}
```

### Login
```json
POST /auth/login
{
  "email": "juan@email.com",
  "password": "password123"
}
```

### Respuesta de Autenticación
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan@email.com",
    "role": "user"
  }
}
```

## 🛡️ Middleware de Seguridad

### Verificación de Token
```typescript
// Headers requeridos
Authorization: Bearer <token>
```

### Roles Disponibles
- `admin` - Acceso completo al sistema
- `user` - Usuario regular
- `operator` - Operador del sistema

## 📊 Base de Datos

### Esquema Completo
El sistema utiliza el esquema completo definido en `mer.sql` que incluye:

#### **🔐 Usuarios y Autenticación**
- `usuarios` - Gestión de usuarios
- `roles` y `permisos` - Sistema de roles y permisos
- `usuarios_roles` - Relación muchos a muchos
- `sesiones` - Gestión de sesiones JWT
- `bitacora_autenticacion` - Auditoría de autenticación

#### **💰 Billeteras y Transacciones**
- `billeteras` - Billeteras de usuarios
- `transacciones_wallet` - Historial de transacciones

#### **🏆 Catálogo Deportivo**
- `ligas` - Ligas deportivas
- `equipos` - Equipos deportivos
- `eventos` - Eventos deportivos
- `mercados` - Mercados de apuestas
- `parametros_mercado` - Parámetros de mercados

#### **🎯 Sistema de Apuestas**
- `solicitudes` - Solicitudes de apuestas
- `eventos_solicitud` - Historial de cambios de estado
- `claves_idempotencia` - Control de idempotencia

#### **📋 Auditoría**
- `bitacora` - Bitácora general del sistema

### Tablas Principales para Autenticación
```sql
-- Tabla de usuarios
CREATE TABLE usuarios (
    id bigserial PRIMARY KEY,
    correo citext NOT NULL UNIQUE,
    nombre text NOT NULL,
    estado text NOT NULL DEFAULT 'activo',
    contrasena_hash text NOT NULL,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- Tabla de roles
CREATE TABLE roles (
    id bigserial PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    descripcion text
);

-- Relación usuarios-roles
CREATE TABLE usuarios_roles (
    id bigserial PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    creado_en timestamptz DEFAULT now(),
    CONSTRAINT usuarios_roles_unicos UNIQUE (usuario_id, rol_id)
);
```

## 🚀 Características

- ✅ Autenticación JWT con expiración de 15 minutos
- ✅ Sistema de roles (admin, user, operator)
- ✅ Middleware de protección de rutas
- ✅ Validación de datos de entrada
- ✅ Manejo de errores centralizado
- ✅ Conexión a PostgreSQL
- ✅ CORS configurado
- ✅ TypeScript para type safety
- ✅ Documentación completa con Swagger/OpenAPI
- ✅ Interfaz interactiva de Swagger UI

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Ejecutar servidor en producción
- `npm run setup-db` - Configurar base de datos completa (esquema + datos)
- `npm run init-data` - Solo insertar datos iniciales (para BD existente)
- `npm test` - Ejecutar tests (pendiente)

## 📚 Documentación de API

### Swagger UI
Una vez que el servidor esté ejecutándose, puedes acceder a la documentación interactiva de la API en:

**http://localhost:3001/api-docs**

### Características de la Documentación
- ✅ **Interfaz interactiva** - Prueba los endpoints directamente desde el navegador
- ✅ **Autenticación JWT** - Botón "Authorize" para agregar tokens
- ✅ **Esquemas completos** - Modelos de datos bien definidos
- ✅ **Ejemplos de respuestas** - Casos de éxito y error
- ✅ **Códigos de estado HTTP** - Documentación completa de respuestas
- ✅ **Tags organizados** - Endpoints agrupados por funcionalidad

### Cómo usar la documentación
1. **Accede a** `http://localhost:3001/api-docs`
2. **Para endpoints protegidos:**
   - Haz login con `/auth/login`
   - Copia el token de la respuesta
   - Haz clic en "Authorize" en Swagger UI
   - Ingresa: `Bearer <tu_token>`
3. **Prueba los endpoints** directamente desde la interfaz

## 📝 Próximas Funcionalidades

- [ ] Sistema de billeteras
- [ ] Gestión de eventos deportivos
- [ ] Sistema de apuestas
- [ ] Reportes y estadísticas
- [ ] Tests unitarios
- [ ] Validación de esquemas con Joi/Zod
- [ ] Rate limiting
- [ ] Logging estructurado
