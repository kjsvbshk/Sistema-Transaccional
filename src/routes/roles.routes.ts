import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { adminDashboard, userDashboard, operatorDashboard } from '../controllers/roles.controller';

const router = express.Router();

// Rutas protegidas por roles
router.get('/admin', verifyToken, requireRole('admin'), adminDashboard);
router.get('/user', verifyToken, requireRole('user'), userDashboard);
router.get('/operator', verifyToken, requireRole('operator'), operatorDashboard);

export default router;
