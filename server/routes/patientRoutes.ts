import { Router } from 'express';
import { PatientController } from '../controllers/patientController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  validateRequestBody,
  ExerciseSessionValidationSchema,
  CognitiveGameSessionValidationSchema,
} from '../middleware/validation.js';

const router = Router();

// Enforce authentication for all patient routes
router.use(authenticateToken);

// Patient profile and plan routes
router.get('/me', requireRole(['patient', 'doctor', 'admin']), PatientController.getMe);
router.get('/me/plan', requireRole(['patient', 'doctor', 'admin']), PatientController.getPlan);
router.get('/me/activities', requireRole(['patient', 'doctor', 'admin']), PatientController.getActivities);
router.get('/me/progress', requireRole(['patient', 'doctor', 'admin']), PatientController.getProgress);
router.get('/me/sessions', requireRole(['patient', 'doctor', 'admin']), PatientController.getSessions);

// Exercise sessions POST endpoint with Zod schema validation
router.post(
  '/me/exercise-sessions',
  requireRole(['patient', 'doctor', 'admin']),
  validateRequestBody(ExerciseSessionValidationSchema),
  PatientController.recordExerciseSession
);

// Cognitive game sessions POST endpoint with Zod schema validation
router.post(
  '/me/game-sessions',
  requireRole(['patient', 'doctor', 'admin']),
  validateRequestBody(CognitiveGameSessionValidationSchema),
  PatientController.recordGameSession
);

// Batch sync endpoint for offline queue sync
router.post(
  '/me/sync-batch',
  requireRole(['patient', 'doctor', 'admin']),
  PatientController.batchSync
);

export default router;
