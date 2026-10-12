import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/overview', requireRole(['doctor', 'admin']), AnalyticsController.getOverview);
router.get('/me', requireRole(['patient', 'doctor', 'admin']), AnalyticsController.getMyProgress);
router.get('/patients/:patientId', requireRole(['doctor', 'admin']), AnalyticsController.getPatientProgress);

export default router;