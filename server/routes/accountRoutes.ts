import { Router } from 'express';
import { UserController, DoctorControllerResource } from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export const userRouter = Router();
export const doctorRouter = Router();

// ── /api/v1/users ──────────────────────────────────────────────────────────
userRouter.use(authenticateToken);
userRouter.use(requireRole(['admin', 'doctor']));
userRouter.get('/', UserController.listUsers);
userRouter.get('/:id', UserController.getUserById);
userRouter.patch('/:id', UserController.updateUser);
userRouter.delete('/:id', requireRole(['admin']), UserController.deleteUser);

// ── /api/v1/doctors ────────────────────────────────────────────────────────
doctorRouter.use(authenticateToken);
doctorRouter.use(requireRole(['admin', 'doctor']));
doctorRouter.get('/', DoctorControllerResource.listDoctors);
doctorRouter.get('/:id', DoctorControllerResource.getDoctorById);
doctorRouter.patch('/:id', DoctorControllerResource.updateDoctor);
doctorRouter.delete('/:id', requireRole(['admin']), DoctorControllerResource.deleteDoctor);