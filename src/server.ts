import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';
import authRoutes from './routes/auth.routes';
import rolesRoutes from './routes/roles.routes';
import { setupSwagger } from './config/swagger';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configurar Swagger
setupSwagger(app);

// Rutas
app.use('/auth', authRoutes);
app.use('/api', rolesRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Verificar estado de la API
 *     tags: [Utilidades]
 *     responses:
 *       200:
 *         description: API funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Betting API is running!"
 */
app.get('/', (req, res) => {
  res.json({ message: 'Betting API is running!' });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar estado del servidor y base de datos
 *     tags: [Utilidades]
 *     responses:
 *       200:
 *         description: Servidor y base de datos funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 database:
 *                   type: string
 *                   example: "Connected"
 *       500:
 *         description: Error en el servidor o base de datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "Error"
 *                 database:
 *                   type: string
 *                   example: "Disconnected"
 */
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'Connected' });
  } catch (error) {
    res.status(500).json({ status: 'Error', database: 'Disconnected' });
  }
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/auth`);
  console.log(`👥 Role endpoints: http://localhost:${PORT}/api`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});

export default app;
