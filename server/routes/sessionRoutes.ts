import { Router } from 'express';
import { PatientController } from '../controllers/patientController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  validateRequestBody,
  ExerciseSessionValidationSchema,
  CognitiveGameSessionValidationSchema,
} from '../middleware/validation.js';

const router = Router();

// All session endpoints require authentication
router.use(authenticateToken);
router.use(requireRole(['patient', 'doctor', 'admin']));

// POST /api/v1/sessions/exercise - Record and validate physical exercise kinematics
router.post(
  '/exercise',
  validateRequestBody(ExerciseSessionValidationSchema),
  PatientController.recordExerciseSession
);

// POST /api/v1/sessions/game - Record and validate cognitive game metrics
router.post(
  '/game',
  validateRequestBody(CognitiveGameSessionValidationSchema),
  PatientController.recordGameSession
);

// POST /api/v1/sessions/batch - Batch sync
router.post('/batch', PatientController.batchSync);

export default router;
