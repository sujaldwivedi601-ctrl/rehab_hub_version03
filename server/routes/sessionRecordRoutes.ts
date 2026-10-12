import { Router } from 'express';
import { SessionRecordController } from '../controllers/sessionRecordController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const exerciseRouter = Router();
const gameRouter = Router();

exerciseRouter.use(authenticateToken);
exerciseRouter.use(requireRole(['patient', 'doctor', 'admin']));
exerciseRouter.get('/', SessionRecordController.listExerciseSessions);
exerciseRouter.post('/', SessionRecordController.createExerciseSession);
exerciseRouter.get('/:sessionId', SessionRecordController.getExerciseSession);
exerciseRouter.patch('/:sessionId', SessionRecordController.updateExerciseSession);
exerciseRouter.delete('/:sessionId', SessionRecordController.deleteExerciseSession);

gameRouter.use(authenticateToken);
gameRouter.use(requireRole(['patient', 'doctor', 'admin']));
gameRouter.get('/', SessionRecordController.listGameSessions);
gameRouter.post('/', SessionRecordController.createGameSession);
gameRouter.get('/:sessionId', SessionRecordController.getGameSession);
gameRouter.patch('/:sessionId', SessionRecordController.updateGameSession);
gameRouter.delete('/:sessionId', SessionRecordController.deleteGameSession);

export { exerciseRouter, gameRouter };