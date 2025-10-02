BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================
-- ORGANIZACIONES Y USUARIOS
-- =========================

CREATE TABLE IF NOT EXISTS organizaciones (
    id bigserial PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    estado text NOT NULL DEFAULT 'activa',
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
    id bigserial PRIMARY KEY,
    correo citext NOT NULL UNIQUE,
    nombre text NOT NULL,
    estado text NOT NULL DEFAULT 'activo',
    contrasena_hash text NOT NULL,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membresias (
    id bigserial PRIMARY KEY,
    organizacion_id bigint NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_default_id bigint,
    creado_en timestamptz DEFAULT now(),
    CONSTRAINT membresias_unicas UNIQUE (organizacion_id, usuario_id)
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
-- BILLETERAS SIMULADAS $
-- ======================

CREATE TABLE IF NOT EXISTS billeteras (
    id bigserial PRIMARY KEY,
    usuario_id bigint UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    saldo_dolares numeric(14,2) NOT NULL DEFAULT 100.00,
    reservado_dolares numeric(14,2) NOT NULL DEFAULT 0.00,
    actualizado_en timestamptz DEFAULT now()
);

-- ===================
-- API KEYS Y USO
-- ===================

CREATE TABLE IF NOT EXISTS llaves_api (
    id bigserial PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    organizacion_id bigint NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    hash_llave text NOT NULL UNIQUE,
    alcances text[] NOT NULL DEFAULT '{}',
    activa boolean DEFAULT true,
    ultimo_uso timestamptz,
    creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uso_api (
    id bigserial PRIMARY KEY,
    llave_id bigint NOT NULL REFERENCES llaves_api(id) ON DELETE CASCADE,
    periodo text NOT NULL,
    inicio_periodo timestamptz NOT NULL,
    contador bigint DEFAULT 0,
    CONSTRAINT uso_api_unico UNIQUE (llave_id, periodo, inicio_periodo)
);

CREATE TABLE IF NOT EXISTS limites_api (
    id bigserial PRIMARY KEY,
    llave_id bigint NOT NULL REFERENCES llaves_api(id) ON DELETE CASCADE,
    inicio_ventana timestamptz NOT NULL,
    duracion_segundos int NOT NULL,
    capacidad int NOT NULL,
    tokens int NOT NULL,
    CONSTRAINT limites_unicos UNIQUE (llave_id, inicio_ventana, duracion_segundos)
);

-- ===============
-- AUDITORÍA
-- ===============

CREATE TABLE IF NOT EXISTS bitacora (
    id bigserial PRIMARY KEY,
    organizacion_id bigint REFERENCES organizaciones(id) ON DELETE SET NULL,
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
    organizacion_id bigint NOT NULL REFERENCES organizaciones(id),
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

-- =========
-- CUOTAS
-- =========

CREATE TABLE IF NOT EXISTS cuotas_snapshots (
    id bigserial PRIMARY KEY,
    solicitud_id bigint NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    tomado_en timestamptz DEFAULT now(),
    resumen_fuente jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS cuotas_lineas (
    id bigserial PRIMARY KEY,
    snapshot_id bigint NOT NULL REFERENCES cuotas_snapshots(id) ON DELETE CASCADE,
    proveedor_id bigint NOT NULL,
    seleccion text NOT NULL,
    precio numeric(10,4) NOT NULL,
    probabilidad_implicita numeric(6,4),
    recolectado_en timestamptz DEFAULT now()
);

-- ==============
-- PREDICCIONES
-- ==============

CREATE TABLE IF NOT EXISTS versiones_modelo (
    id bigserial PRIMARY KEY,
    version text NOT NULL UNIQUE,
    desplegado_en timestamptz NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS predicciones (
    id bigserial PRIMARY KEY,
    solicitud_id bigint NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    version_modelo_id bigint NOT NULL REFERENCES versiones_modelo(id),
    payload jsonb NOT NULL,
    puntaje_calidad numeric(6,4),
    expira_en timestamptz,
    creado_en timestamptz DEFAULT now(),
    CONSTRAINT predicciones_unicas UNIQUE (solicitud_id)
);

-- ==============
-- PROVEEDORES
-- ==============

CREATE TABLE IF NOT EXISTS proveedores (
    id bigserial PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    url_base text NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credenciales_proveedor (
    id bigserial PRIMARY KEY,
    proveedor_id bigint NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    organizacion_id bigint NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    api_key_mascarada text,
    meta jsonb DEFAULT '{}'::jsonb,
    creado_en timestamptz DEFAULT now(),
    CONSTRAINT credenciales_unicas UNIQUE (proveedor_id, organizacion_id)
);

CREATE TABLE IF NOT EXISTS endpoints_proveedor (
    id bigserial PRIMARY KEY,
    proveedor_id bigint NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    tipo_endpoint text NOT NULL,
    ruta text NOT NULL,
    timeout_ms int DEFAULT 500,
    CONSTRAINT endpoints_unicos UNIQUE (proveedor_id, tipo_endpoint, ruta)
);

CREATE TABLE IF NOT EXISTS salud_proveedor (
    id bigserial PRIMARY KEY,
    proveedor_id bigint NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    chequeado_en timestamptz DEFAULT now(),
    latencia_ms int,
    ok boolean NOT NULL,
    codigo_error text
);

-- ====================
-- MENSAJERÍA / OUTBOX
-- ====================

CREATE TABLE IF NOT EXISTS outbox (
    id bigserial PRIMARY KEY,
    tipo_agregado text NOT NULL,
    agregado_id bigint NOT NULL,
    tipo_evento text NOT NULL,
    payload jsonb NOT NULL,
    publicado boolean DEFAULT false,
    creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bandeja_entrada (
    id bigserial PRIMARY KEY,
    fuente text NOT NULL,
    id_evento_externo text NOT NULL,
    recibido_en timestamptz DEFAULT now(),
    estado text NOT NULL DEFAULT 'procesado',
    CONSTRAINT bandeja_unica UNIQUE (fuente, id_evento_externo)
);

-- ====================
-- WEBHOOKS
-- ====================

CREATE TABLE IF NOT EXISTS subscripciones_webhook (
    id bigserial PRIMARY KEY,
    organizacion_id bigint NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    tipo_evento text NOT NULL,
    url_destino text NOT NULL,
    secreto text NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entregas_webhook (
    id bigserial PRIMARY KEY,
    subscripcion_id bigint NOT NULL REFERENCES subscripciones_webhook(id) ON DELETE CASCADE,
    outbox_id bigint NOT NULL REFERENCES outbox(id) ON DELETE CASCADE,
    intento int DEFAULT 1,
    estado text NOT NULL,
    codigo_respuesta int,
    proximo_reintento timestamptz,
    creado_en timestamptz DEFAULT now()
);

END;
