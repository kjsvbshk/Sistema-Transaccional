import { Request, Response } from 'express';
import pool from '../db';

interface AuthRequest extends Request {
  user?: any;
}

/**
 * @swagger
 * /api/admin:
 *   get:
 *     summary: Obtener datos del dashboard de administrador
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del dashboard de administrador obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminDashboardResponse'
 *             example:
 *               message: "Admin dashboard data"
 *               users:
 *                 - id: 1
 *                   name: "Juan Pérez"
 *                   email: "juan@email.com"
 *                   role: "user"
 *                   created_at: "2023-12-01T10:00:00Z"
 *                 - id: 2
 *                   name: "María García"
 *                   email: "maria@email.com"
 *                   role: "operator"
 *                   created_at: "2023-12-02T11:00:00Z"
 *               admin:
 *                 id: 1
 *                 name: "Admin User"
 *                 role: "admin"
 *       401:
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "No token provided"
 *       403:
 *         description: Acceso denegado - se requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Access denied"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Internal server error"
 */

export const adminDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // Obtener lista de usuarios con sus roles para el admin
    const result = await pool.query(`
      SELECT u.id, u.nombre, u.correo, u.creado_en, r.nombre as rol
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      ORDER BY u.creado_en DESC
    `);
    
    res.json({
      message: 'Admin dashboard data',
      users: result.rows,
      admin: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Obtener datos del dashboard de usuario
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del dashboard de usuario obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDashboardResponse'
 *             example:
 *               message: "User dashboard data"
 *               user:
 *                 id: 1
 *                 name: "Juan Pérez"
 *                 email: "juan@email.com"
 *                 role: "user"
 *                 created_at: "2023-12-01T10:00:00Z"
 *       401:
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "No token provided"
 *       403:
 *         description: Acceso denegado - se requiere rol de usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Access denied"
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "User not found"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Internal server error"
 */
export const userDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // Obtener datos del usuario con su rol
    const result = await pool.query(`
      SELECT u.id, u.nombre, u.correo, u.creado_en, r.nombre as rol
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE u.id = $1
    `, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      message: 'User dashboard data',
      user: {
        id: user.id,
        name: user.nombre,
        email: user.correo,
        role: user.rol,
        created_at: user.creado_en
      }
    });
  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/operator:
 *   get:
 *     summary: Obtener datos del dashboard de operador
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del dashboard de operador obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperatorDashboardResponse'
 *             example:
 *               message: "Operator dashboard data"
 *               operator:
 *                 id: 1
 *                 name: "Operador User"
 *                 role: "operator"
 *               events: []
 *       401:
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "No token provided"
 *       403:
 *         description: Acceso denegado - se requiere rol de operador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Access denied"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Internal server error"
 */
export const operatorDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // Dashboard para operadores - por ahora solo muestra info básica
    res.json({
      message: 'Operator dashboard data',
      operator: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      },
      events: [] // Por ahora vacío, se implementará después
    });
  } catch (error) {
    console.error('Operator dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
