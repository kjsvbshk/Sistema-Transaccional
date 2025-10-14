-- Datos iniciales para el sistema
-- Ejecutar después de crear las tablas

-- Insertar roles básicos
INSERT INTO roles (nombre, descripcion) VALUES 
('admin', 'Administrador del sistema'),
('user', 'Usuario regular'),
('operator', 'Operador del sistema')
ON CONFLICT (nombre) DO NOTHING;

-- Crear usuario administrador por defecto (opcional)
-- Contraseña: admin123 (hasheada con bcrypt)
INSERT INTO usuarios (nombre, correo, contrasena_hash, estado) VALUES 
('Administrador', 'chameadmin@bettingsystem.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'activo')
ON CONFLICT (correo) DO NOTHING;

-- Asignar rol de admin al usuario administrador
INSERT INTO usuarios_roles (usuario_id, rol_id) 
SELECT u.id, r.id 
FROM usuarios u, roles r 
WHERE u.correo = 'chameadmin@bettingsystem.com' 
AND r.nombre = 'admin'
ON CONFLICT (usuario_id, rol_id) DO NOTHING;
