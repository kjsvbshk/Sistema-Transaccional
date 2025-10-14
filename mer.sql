BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================
-- USUARIOS Y AUTENTICACIÓN
-- =========================

CREATE TABLE IF NOT EXISTS usuarios (
    id bigserial PRIMARY KEY,
    correo citext NOT NULL UNIQUE,
    nombre text NOT NULL,
    estado text NOT NULL DEFAULT 'activo',
    contrasena_hash text NOT NULL,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- ===================
-- ROLES Y PERMISOS
-- ===================

CREATE TABLE IF NOT EXISTS roles (
    id bigserial PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    descripcion text
);

CREATE TABLE IF NOT EXISTS permisos (
    id bigserial PRIMARY KEY,
    codigo text NOT NULL UNIQUE,
    descripcion text
);

CREATE TABLE IF NOT EXISTS roles_permisos (
    id bigserial PRIMARY KEY,
    rol_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id bigint NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    CONSTRAINT roles_permisos_unicos UNIQUE (rol_id, permiso_id)
);

-- Relación usuarios-roles (muchos a muchos)
CREATE TABLE IF NOT EXISTS usuarios_roles (
    id bigserial PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    creado_en timestamptz DEFAULT now(),
    CONSTRAINT usuarios_roles_unicos UNIQUE (usuario_id, rol_id)
);

-- ===================
-- AUTENTICACIÓN / JWT
-- ===================

CREATE TABLE IF NOT EXISTS sesiones (
    id bigserial PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    refresh_token_hash text NOT NULL,
    ip text,
    user_agent text,
    revocado boolean DEFAULT false,
    creado_en timestamptz DEFAULT now(),
    expira_en timestamptz
);

CREATE TABLE IF NOT EXISTS bitacora_autenticacion (
    id bigserial PRIMARY KEY,
    usuario_id bigint,
    tipo_evento text NOT NULL, -- login, logout, refresh, error
    metadatos jsonb DEFAULT '{}'::jsonb,
    creado_en timestamptz DEFAULT now()
);

-- ======================
-- BILLETERAS Y TRANSACCIONES
-- ======================

CREATE TABLE IF NOT EXISTS billeteras (
    id bigserial PRIMARY KEY,
    usuario_id bigint UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    saldo_dolares numeric(14,2) NOT NULL DEFAULT 100.00,
    reservado_dolares numeric(14,2) NOT NULL DEFAULT 0.00,
    actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transacciones_wallet (
    id bigserial PRIMARY KEY,
    billetera_id bigint NOT NULL REFERENCES billeteras(id) ON DELETE CASCADE,
    tipo text NOT NULL, -- 'deposito', 'retiro', 'apuesta', 'ganancia'
    monto numeric(14,2) NOT NULL,
    descripcion text,
    referencia text, -- ID de apuesta o referencia externa
    creado_en timestamptz DEFAULT now()
);

-- ===============
-- AUDITORÍA BÁSICA
-- ===============

CREATE TABLE IF NOT EXISTS bitacora (
    id bigserial PRIMARY KEY,
    usuario_actor_id bigint REFERENCES usuarios(id) ON DELETE SET NULL,
    entidad text NOT NULL,
    entidad_id text NOT NULL,
    accion text NOT NULL,
    diff jsonb DEFAULT '{}'::jsonb,
    creado_en timestamptz DEFAULT now()
);

-- ===============
-- CATALOGO DEPORTIVO
-- ===============

CREATE TABLE IF NOT EXISTS ligas (
    id bigserial PRIMARY KEY,
    deporte text NOT NULL,
    nombre text NOT NULL,
    pais text,
    CONSTRAINT ligas_unicas UNIQUE (deporte, nombre)
);

CREATE TABLE IF NOT EXISTS equipos (
    id bigserial PRIMARY KEY,
    nombre text NOT NULL,
    pais text,
    referencia_externa text
);

CREATE TABLE IF NOT EXISTS eventos (
    id bigserial PRIMARY KEY,
    liga_id bigint NOT NULL REFERENCES ligas(id),
    equipo_local_id bigint NOT NULL REFERENCES equipos(id),
    equipo_visitante_id bigint NOT NULL REFERENCES equipos(id),
    inicia_en timestamptz NOT NULL,
    referencia_externa text,
    CONSTRAINT eventos_unicos UNIQUE (liga_id, equipo_local_id, equipo_visitante_id, inicia_en)
);

CREATE TABLE IF NOT EXISTS mercados (
    id bigserial PRIMARY KEY,
    evento_id bigint NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_mercado text NOT NULL,
    estado text NOT NULL DEFAULT 'abierto',
    creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parametros_mercado (
    id bigserial PRIMARY KEY,
    mercado_id bigint NOT NULL REFERENCES mercados(id) ON DELETE CASCADE,
    clave text NOT NULL,
    valor text NOT NULL,
    CONSTRAINT parametros_unicos UNIQUE (mercado_id, clave)
);

-- =======================
-- APUESTAS Y SOLICITUDES
-- =======================

CREATE TABLE IF NOT EXISTS claves_idempotencia (
    id bigserial PRIMARY KEY,
    clave text NOT NULL UNIQUE,
    visto_por_primera_vez timestamptz DEFAULT now(),
    bloqueado_por text,
    resultado jsonb
);

CREATE TABLE IF NOT EXISTS solicitudes (
    id bigserial PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES usuarios(id),
    evento_id bigint NOT NULL REFERENCES eventos(id),
    mercado_id bigint NOT NULL REFERENCES mercados(id),
    clave text NOT NULL UNIQUE,
    version_modelo text NOT NULL,
    estado text NOT NULL, -- recibida, en_proceso, completada, fallida
    meta_cliente jsonb DEFAULT '{}'::jsonb,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eventos_solicitud (
    id bigserial PRIMARY KEY,
    solicitud_id bigint NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    usuario_actor_id bigint REFERENCES usuarios(id),
    de_estado text,
    a_estado text NOT NULL,
    razon text,
    creado_en timestamptz DEFAULT now()
);

-- ====================
-- ÍNDICES PARA RENDIMIENTO
-- ====================

-- Índices para autenticación
CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_id ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_refresh_token ON sesiones(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_bitacora_auth_usuario_id ON bitacora_autenticacion(usuario_id);

-- Índices para billeteras
CREATE INDEX IF NOT EXISTS idx_billeteras_usuario_id ON billeteras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_billetera_id ON transacciones_wallet(billetera_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones_wallet(tipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_creado_en ON transacciones_wallet(creado_en);

-- Índices para catálogo deportivo
CREATE INDEX IF NOT EXISTS idx_eventos_liga_id ON eventos(liga_id);
CREATE INDEX IF NOT EXISTS idx_eventos_inicia_en ON eventos(inicia_en);
CREATE INDEX IF NOT EXISTS idx_mercados_evento_id ON mercados(evento_id);

-- Índices para apuestas
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario_id ON solicitudes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_evento_id ON solicitudes(evento_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_solicitud_solicitud_id ON eventos_solicitud(solicitud_id);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario_actor_id ON bitacora(usuario_actor_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_entidad ON bitacora(entidad);
CREATE INDEX IF NOT EXISTS idx_bitacora_creado_en ON bitacora(creado_en);

END;