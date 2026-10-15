import { Router } from 'express';
import { AccessController } from '../controllers/accessController.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public, code-based access. Rate limited to slow down code guessing.
const codeLimiter = createRateLimiter({
  max: 30,
  windowMs: 60 * 1000,
  message: 'Too many patient-code requests. Please wait a moment before retrying.',
});

import { AuthController } from '../controllers/authController.js';

// Resolve the entire patient record bundle from patient code, ID, or name.
router.get('/patient/:code', codeLimiter, AccessController.getPatientByCode);
router.get('/patient/:code/sessions', codeLimiter, AccessController.getSessionsByCode);

// Mobile App direct patient login by name, code, or email
router.post('/login', codeLimiter, AuthController.login);
router.post('/patient-login', codeLimiter, AuthController.login);

// Sync completed activity sessions against the patient code.
router.post('/patient/:code/exercise-sessions', codeLimiter, AccessController.recordExerciseByCode);
router.post('/patient/:code/game-sessions', codeLimiter, AccessController.recordGameByCode);
router.post('/patient/:code/sync-batch', codeLimiter, AccessController.batchSyncByCode);

export default router;
