import { Router } from 'express';
import { DoctorController } from '../controllers/doctorController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Enforce authentication and doctor/admin role
router.use(authenticateToken);
router.use(requireRole(['doctor', 'admin']));

router.post('/patients', DoctorController.createPatient);
router.get('/patients', DoctorController.listPatients);
router.get('/patients/:id', DoctorController.getPatientById);
router.post('/patients/:id/plan', DoctorController.updatePlan);
router.put('/patients/:id/profile', DoctorController.updatePatientProfile);
router.post('/patients/:id/assign-activity', DoctorController.assignActivity);
router.get('/patients/:id/sessions', DoctorController.getPatientSessions);
router.patch('/patients/:id/status', DoctorController.updatePatientStatus);
router.post('/patients/:id/photo', DoctorController.uploadPatientPhoto);
router.post('/patients/:id/sync-firebase', DoctorController.syncToFirebase);
router.post('/sync-all-firebase', DoctorController.syncAllToFirebase);
router.delete('/patients/:id', DoctorController.deletePatient);

export default router;
