-- ===============================================
-- DATOS INICIALES: USUARIOS Y ROLES
-- ===============================================
-- Script para crear 3 usuarios iniciales con sus respectivos roles

BEGIN;

-- ===============================================
-- CREAR ROLES BASICOS
-- ===============================================

INSERT INTO roles (nombre, descripcion) VALUES 
('admin', 'Administrador del sistema con acceso completo'),
('operador', 'Operador de apuestas que puede gestionar solicitudes'),
('usuario', 'Usuario regular que puede apostar y gestionar su cuenta')
ON CONFLICT (nombre) DO NOTHING;

-- ===============================================
-- CREAR PERMISOS BASICOS
-- ===============================================

INSERT INTO permisos (codigo, descripcion) VALUES 
-- Permisos de usuarios
('users.create', 'Crear nuevos usuarios'),
('users.read', 'Ver información de usuarios'),
('users.update', 'Actualizar información de usuarios'),
('users.delete', 'Eliminar usuarios'),
('users.assign_roles', 'Asignar roles a usuarios'),

-- Permisos de apuestas
('bets.create', 'Crear nuevas apuestas'),
('bets.read', 'Ver apuestas'),
('bets.update', 'Actualizar apuestas'),
('bets.cancel', 'Cancelar apuestas'),
('bets.process', 'Procesar solicitudes de apuestas'),

-- Permisos de billetera
('wallet.deposit', 'Realizar depósitos'),
('wallet.withdraw', 'Realizar retiros'),
('wallet.read', 'Consultar saldo y transacciones'),
('wallet.manage', 'Gestionar billeteras de otros usuarios'),

-- Permisos de catálogo deportivo
('catalog.create', 'Crear ligas, equipos y eventos'),
('catalog.read', 'Ver catálogo deportivo'),
('catalog.update', 'Actualizar catálogo deportivo'),
('catalog.delete', 'Eliminar elementos del catálogo'),

-- Permisos de auditoría
('audit.read', 'Ver logs de auditoría'),
('audit.export', 'Exportar reportes de auditoría')
ON CONFLICT (codigo) DO NOTHING;

-- ===============================================
-- ASIGNAR PERMISOS A ROLES
-- ===============================================

-- Admin: Todos los permisos
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'admin'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Operador: Permisos de gestión de apuestas y usuarios
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'operador'
AND p.codigo IN (
    'users.read', 'users.update',
    'bets.read', 'bets.update', 'bets.cancel', 'bets.process',
    'wallet.read', 'wallet.manage',
    'catalog.read', 'catalog.update',
    'audit.read'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Usuario: Permisos básicos de usuario
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'usuario'
AND p.codigo IN (
    'bets.create', 'bets.read', 'bets.cancel',
    'wallet.deposit', 'wallet.withdraw', 'wallet.read',
    'catalog.read'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- ===============================================
-- CREAR USUARIOS INICIALES
-- ===============================================

-- Usuario Administrador
INSERT INTO usuarios (correo, nombre, contrasena_hash) VALUES 
('admin@sistema.com', 'Administrador del Sistema', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV')
ON CONFLICT (correo) DO NOTHING;

-- Usuario Operador
INSERT INTO usuarios (correo, nombre, contrasena_hash) VALUES 
('operador@sistema.com', 'Operador de Apuestas', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV')
ON CONFLICT (correo) DO NOTHING;

-- Usuario Regular
INSERT INTO usuarios (correo, nombre, contrasena_hash) VALUES 
('usuario@sistema.com', 'Usuario Regular', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV')
ON CONFLICT (correo) DO NOTHING;

-- ===============================================
-- ASIGNAR ROLES A USUARIOS
-- ===============================================

-- Asignar rol admin al administrador
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM usuarios u, roles r
WHERE u.correo = 'admin@sistema.com' AND r.nombre = 'admin'
ON CONFLICT (usuario_id, rol_id) DO NOTHING;

-- Asignar rol operador al operador
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM usuarios u, roles r
WHERE u.correo = 'operador@sistema.com' AND r.nombre = 'operador'
ON CONFLICT (usuario_id, rol_id) DO NOTHING;

-- Asignar rol usuario al usuario regular
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM usuarios u, roles r
WHERE u.correo = 'usuario@sistema.com' AND r.nombre = 'usuario'
ON CONFLICT (usuario_id, rol_id) DO NOTHING;

-- ===============================================
-- CREAR BILLETERAS PARA USUARIOS
-- ===============================================

-- Billetera para administrador
INSERT INTO billeteras (usuario_id, saldo_dolares) 
SELECT id, 1000.00 FROM usuarios WHERE correo = 'admin@sistema.com'
ON CONFLICT (usuario_id) DO NOTHING;

-- Billetera para operador
INSERT INTO billeteras (usuario_id, saldo_dolares) 
SELECT id, 500.00 FROM usuarios WHERE correo = 'operador@sistema.com'
ON CONFLICT (usuario_id) DO NOTHING;

-- Billetera para usuario regular
INSERT INTO billeteras (usuario_id, saldo_dolares) 
SELECT id, 100.00 FROM usuarios WHERE correo = 'usuario@sistema.com'
ON CONFLICT (usuario_id) DO NOTHING;

COMMIT;

-- ===============================================
-- RESUMEN DE DATOS CREADOS
-- ===============================================

DO $$
DECLARE
    admin_count integer;
    operador_count integer;
    usuario_count integer;
    roles_count integer;
    permisos_count integer;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM usuarios_roles ur 
    JOIN usuarios u ON ur.usuario_id = u.id 
    JOIN roles r ON ur.rol_id = r.id 
    WHERE r.nombre = 'admin';
    
    SELECT COUNT(*) INTO operador_count FROM usuarios_roles ur 
    JOIN usuarios u ON ur.usuario_id = u.id 
    JOIN roles r ON ur.rol_id = r.id 
    WHERE r.nombre = 'operador';
    
    SELECT COUNT(*) INTO usuario_count FROM usuarios_roles ur 
    JOIN usuarios u ON ur.usuario_id = u.id 
    JOIN roles r ON ur.rol_id = r.id 
    WHERE r.nombre = 'usuario';
    
    SELECT COUNT(*) INTO roles_count FROM roles;
    SELECT COUNT(*) INTO permisos_count FROM permisos;
    
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'DATOS INICIALES CREADOS EXITOSAMENTE';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Roles creados: %', roles_count;
    RAISE NOTICE 'Permisos creados: %', permisos_count;
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'USUARIOS CREADOS:';
    RAISE NOTICE '- Administradores: %', admin_count;
    RAISE NOTICE '- Operadores: %', operador_count;
    RAISE NOTICE '- Usuarios regulares: %', usuario_count;
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'CREDENCIALES DE ACCESO:';
    RAISE NOTICE 'Admin: admin@sistema.com / password123';
    RAISE NOTICE 'Operador: operador@sistema.com / password123';
    RAISE NOTICE 'Usuario: usuario@sistema.com / password123';
    RAISE NOTICE '===============================================';
END $$;
