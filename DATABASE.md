# 🗄️ Base de Datos - Sistema de Apuestas Deportivas

## 📋 Esquema Único: `mer.sql`

**IMPORTANTE**: Este proyecto utiliza **ÚNICAMENTE** el esquema definido en `mer.sql`. No hay otros archivos de esquema.

## 🏗️ Estructura del Esquema

### **🔐 Módulo de Usuarios y Autenticación**
```sql
usuarios              -- Tabla principal de usuarios
roles                 -- Catálogo de roles del sistema
permisos              -- Catálogo de permisos
roles_permisos        -- Relación roles-permisos
usuarios_roles        -- Relación usuarios-roles
sesiones              -- Gestión de sesiones JWT
bitacora_autenticacion -- Auditoría de autenticación
```

### **💰 Módulo de Billeteras y Transacciones**
```sql
billeteras            -- Billeteras de usuarios
transacciones_wallet  -- Historial de transacciones
```

### **🏆 Módulo de Catálogo Deportivo**
```sql
ligas                 -- Ligas deportivas
equipos               -- Equipos deportivos
eventos               -- Eventos deportivos
mercados              -- Mercados de apuestas
parametros_mercado    -- Parámetros de mercados
```

### **🎯 Módulo de Sistema de Apuestas**
```sql
solicitudes           -- Solicitudes de apuestas
eventos_solicitud     -- Historial de cambios de estado
claves_idempotencia   -- Control de idempotencia
```

### **📋 Módulo de Auditoría**
```sql
bitacora              -- Bitácora general del sistema
```

## 🚀 Configuración

### **Opción 1: Automática (Recomendada)**
```bash
# 1. Crear base de datos
createdb betting_db

# 2. Configurar automáticamente
npm run setup-db
```

### **Opción 2: Manual**
```sql
-- 1. Crear base de datos
CREATE DATABASE betting_db;

-- 2. Conectar a la base de datos
\c betting_db;

-- 3. Ejecutar el esquema completo
\i mer.sql

-- 4. Ejecutar datos iniciales
\i src/models/init-data.sql
```

## 📊 Datos Iniciales

El archivo `src/models/init-data.sql` contiene:

- **Roles básicos**: `admin`, `user`, `operator`
- **Usuario administrador por defecto**:
  - Email: `admin@bettingsystem.com`
  - Contraseña: `admin123`
  - Rol: `admin`

## 🔧 Scripts Disponibles

- `npm run setup-db` - Configuración automática completa
- `npm run dev` - Servidor de desarrollo

## 📝 Notas Importantes

1. **Un solo esquema**: Solo existe `mer.sql` como fuente de verdad
2. **Datos iniciales separados**: `init-data.sql` solo contiene datos, no estructura
3. **Configuración automática**: El script `setup-database.js` maneja todo
4. **Compatibilidad**: El esquema está diseñado para escalar a todas las funcionalidades del sistema

## 🎯 Próximos Pasos

Una vez configurada la base de datos, el sistema estará listo para:

- ✅ Autenticación y autorización
- ✅ Gestión de usuarios y roles
- 🔄 Sistema de billeteras (próximamente)
- 🔄 Gestión de eventos deportivos (próximamente)
- 🔄 Sistema de apuestas (próximamente)
- 🔄 Reportes y auditoría (próximamente)
