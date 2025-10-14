import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             name: "Juan Pérez"
 *             email: "juan@email.com"
 *             password: "password123"
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               message: "User created successfully"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               user:
 *                 id: 1
 *                 name: "Juan Pérez"
 *                 email: "juan@email.com"
 *                 role: "user"
 *       400:
 *         description: Error en la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_fields:
 *                 summary: Campos requeridos faltantes
 *                 value:
 *                   error: "Name, email and password are required"
 *               user_exists:
 *                 summary: Usuario ya existe
 *                 value:
 *                   error: "User already exists"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Internal server error"
 */

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validar datos requeridos
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena_hash) VALUES ($1, $2, $3) RETURNING id, nombre, correo',
      [name, email, hashedPassword]
    );

    const user = result.rows[0];

    // Asignar rol por defecto (user)
    const defaultRole = 'user';
    
    // Obtener ID del rol
    const roleResult = await pool.query('SELECT id FROM roles WHERE nombre = $1', [defaultRole]);
    if (roleResult.rows.length === 0) {
      // Crear rol si no existe
      await pool.query('INSERT INTO roles (nombre, descripcion) VALUES ($1, $2)', [defaultRole, 'Usuario regular']);
      const newRoleResult = await pool.query('SELECT id FROM roles WHERE nombre = $1', [defaultRole]);
      await pool.query('INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES ($1, $2)', [user.id, newRoleResult.rows[0].id]);
    } else {
      await pool.query('INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES ($1, $2)', [user.id, roleResult.rows[0].id]);
    }

    // Generar token
    const token = jwt.sign(
      { id: user.id, role: defaultRole },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.nombre,
        email: user.correo,
        role: defaultRole
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "juan@email.com"
 *             password: "password123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               message: "Login successful"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               user:
 *                 id: 1
 *                 name: "Juan Pérez"
 *                 email: "juan@email.com"
 *                 role: "user"
 *       400:
 *         description: Error en la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_fields:
 *                 summary: Campos requeridos faltantes
 *                 value:
 *                   error: "Email and password are required"
 *               invalid_credentials:
 *                 summary: Credenciales inválidas
 *                 value:
 *                   error: "Invalid credentials"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Internal server error"
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validar datos requeridos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Buscar usuario con su rol
    const result = await pool.query(`
      SELECT u.id, u.nombre, u.correo, u.contrasena_hash, r.nombre as rol
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE u.correo = $1
    `, [email]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verificar contraseña
    const match = await bcrypt.compare(password, user.contrasena_hash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generar token
    const token = jwt.sign(
      { id: user.id, role: user.rol },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.nombre,
        email: user.correo,
        role: user.rol
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
