import { Router } from 'express';
import { PatientResourceController } from '../controllers/patientResourceController.js';
import { DoctorController } from '../controllers/doctorController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['doctor', 'admin']));

router.post('/', DoctorController.createPatient);
router.get('/', PatientResourceController.listPatients);
router.get('/:id', PatientResourceController.getPatientById);
router.get('/:id/profile', PatientResourceController.getPatientProfile);
router.put('/:id/profile', PatientResourceController.updatePatientProfile);
router.get('/:id/exercise-sessions', PatientResourceController.getPatientExerciseSessions);
router.get('/:id/game-sessions', PatientResourceController.getPatientGameSessions);
router.delete('/:id', PatientResourceController.deletePatient);

export default router;