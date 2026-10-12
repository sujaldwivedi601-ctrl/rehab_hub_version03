import { Response } from 'express';
import { AuthenticatedRequest, authorizePatientAccess } from '../middleware/auth.js';
import {
  ExerciseSessionRepository,
  CognitiveGameSessionRepository,
} from '../models/repositories.js';

async function resolveExerciseSession(sessionId: string, user: any) {
  const session = await ExerciseSessionRepository.findBySessionId(sessionId);
  if (!session) return { session: null, authorized: false };
  const authorized = await authorizePatientAccess(user, session.patientId);
  return { session, authorized };
}

async function resolveGameSession(sessionId: string, user: any) {
  const session = await CognitiveGameSessionRepository.findBySessionId(sessionId);
  if (!session) return { session: null, authorized: false };
  const authorized = await authorizePatientAccess(user, session.patientId);
  return { session, authorized };
}

function resolveTargetPatient(user: any, body: any): { patientId: string; error: string | null } {
  if (user.role === 'patient') {
    return { patientId: user._id, error: null };
  }
  const patientId = body.patientId;
  if (!patientId) {
    return { patientId: '', error: 'patientId is required for doctor/admin submissions' };
  }
  return { patientId, error: null };
}

export const SessionRecordController = {
  // ── EXERCISE SESSIONS ────────────────────────────────────────────────────
  // GET /api/v1/exercise-sessions
  async listExerciseSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.query.patientId as string;
      if (patientId && !(await authorizePatientAccess(req.user!, patientId))) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view these sessions' });
        return;
      }
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const skip = parseInt(req.query.skip as string) || 0;
      const result = await ExerciseSessionRepository.list({
        patientId,
        exerciseId: req.query.exerciseId as string,
        from: req.query.from as string,
        to: req.query.to as string,
        limit,
        skip,
      });
      res.json({ exercises: result.sessions, totalCount: result.total });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list exercise sessions' });
    }
  },

  // GET /api/v1/exercise-sessions/:sessionId
  async getExerciseSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { session, authorized } = await resolveExerciseSession(req.params.sessionId, req.user);
      if (!session) {
        res.status(404).json({ error: 'Not Found', message: 'Exercise session not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view this session' });
        return;
      }
      res.json({ exercise: session });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch exercise session' });
    }
  },

  // POST /api/v1/exercise-sessions
  async createExerciseSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { patientId, error } = resolveTargetPatient(req.user, req.body);
      if (error) {
        res.status(400).json({ error: 'Bad Request', message: error });
        return;
      }
      if (!(await authorizePatientAccess(req.user!, patientId))) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to record sessions for this patient' });
        return;
      }
      if (!req.body.sessionId || typeof req.body.sessionId !== 'string') {
        res.status(400).json({ error: 'Validation Error', message: 'sessionId is required and must be unique' });
        return;
      }
      if (!req.body.exerciseId || typeof req.body.exerciseId !== 'string') {
        res.status(400).json({ error: 'Validation Error', message: 'exerciseId is required' });
        return;
      }

      const existing = await ExerciseSessionRepository.findBySessionId(req.body.sessionId);
      if (existing) {
        res.status(200).json({ message: 'Duplicate submission ignored (idempotent)', sessionId: existing.sessionId, status: 'already_synced', session: existing });
        return;
      }

      const targetRepetitions = Math.max(1, Math.min(500, Number(req.body.targetRepetitions) || 12));
      const completedRepetitions = Math.max(0, Math.min(500, Number(req.body.completedRepetitions) || 0));
      const validRepetitions = Math.min(
        completedRepetitions,
        Math.max(0, Number(req.body.validRepetitions !== undefined ? req.body.validRepetitions : completedRepetitions))
      );
      const completionPercentage = Math.min(100, Math.round((completedRepetitions / targetRepetitions) * 100));

      const created = await ExerciseSessionRepository.create({
        ...req.body,
        sessionId: req.body.sessionId,
        patientId,
        exerciseId: req.body.exerciseId,
        exerciseName: req.body.exerciseName || 'Arm Raise (Anterior Shoulder Flexion)',
        targetRepetitions,
        completedRepetitions,
        validRepetitions,
        completionPercentage,
        sessionStatus: req.body.sessionStatus || (completionPercentage >= 100 ? 'completed' : 'partial'),
      });

      res.status(201).json({ message: 'Exercise session recorded successfully', session: created });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record exercise session' });
    }
  },

  // PATCH /api/v1/exercise-sessions/:sessionId
  async updateExerciseSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { session, authorized } = await resolveExerciseSession(req.params.sessionId, req.user);
      if (!session) {
        res.status(404).json({ error: 'Not Found', message: 'Exercise session not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to update this session' });
        return;
      }
      const { sessionId, patientId, _id, syncedAt, syncedFromServer, ...updates } = req.body;
      const updated = await ExerciseSessionRepository.update(session.sessionId, updates);
      res.json({ message: 'Exercise session updated successfully', exercise: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update exercise session' });
    }
  },

  // DELETE /api/v1/exercise-sessions/:sessionId
  async deleteExerciseSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { session, authorized } = await resolveExerciseSession(req.params.sessionId, req.user);
      if (!session) {
        res.status(404).json({ error: 'Not Found', message: 'Exercise session not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to delete this session' });
        return;
      }
      await ExerciseSessionRepository.delete(session.sessionId);
      res.json({ message: 'Exercise session deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete exercise session' });
    }
  },

  // ── COGNITIVE GAME SESSIONS ──────────────────────────────────────────────
  // GET /api/v1/game-sessions
  async listGameSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.query.patientId as string;
      if (patientId && !(await authorizePatientAccess(req.user!, patientId))) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view these sessions' });
        return;
      }
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const skip = parseInt(req.query.skip as string) || 0;
      const result = await CognitiveGameSessionRepository.list({
        patientId,
        gameId: req.query.gameId as string,
        cognitiveDomain: req.query.cognitiveDomain as string,
        from: req.query.from as string,
        to: req.query.to as string,
        limit,
        skip,
      });
      res.json({ games: result.sessions, totalCount: result.total });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list game sessions' });
    }
  },

  // GET /api/v1/game-sessions/:sessionId
  async getGameSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { session, authorized } = await resolveGameSession(req.params.sessionId, req.user);
      if (!session) {
        res.status(404).json({ error: 'Not Found', message: 'Game session not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view this session' });
        return;
      }
      res.json({ game: session });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch game session' });
    }
  },

  // POST /api/v1/game-sessions
  async createGameSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { patientId, error } = resolveTargetPatient(req.user, req.body);
      if (error) {
        res.status(400).json({ error: 'Bad Request', message: error });
        return;
      }
      if (!(await authorizePatientAccess(req.user!, patientId))) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to record sessions for this patient' });
        return;
      }
      if (!req.body.sessionId || typeof req.body.sessionId !== 'string') {
        res.status(400).json({ error: 'Validation Error', message: 'sessionId is required and must be unique' });
        return;
      }
      if (!req.body.gameId || typeof req.body.gameId !== 'string') {
        res.status(400).json({ error: 'Validation Error', message: 'gameId is required' });
        return;
      }

      const existing = await CognitiveGameSessionRepository.findBySessionId(req.body.sessionId);
      if (existing) {
        res.status(200).json({ message: 'Duplicate submission ignored (idempotent)', sessionId: existing.sessionId, status: 'already_synced', session: existing });
        return;
      }

      const created = await CognitiveGameSessionRepository.create({
        ...req.body,
        sessionId: req.body.sessionId,
        patientId,
        gameId: req.body.gameId,
        gameName: req.body.gameName || 'Cognitive Rehabilitation Game',
      });

      res.status(201).json({ message: 'Game session recorded successfully', session: created });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record game session' });
    }
  },

  // PATCH /api/v1/game-sessions/:sessionId
  async updateGameSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { session, authorized } = await resolveGameSession(req.params.sessionId, req.user);
      if (!session) {
        res.status(404).json({ error: 'Not Found', message: 'Game session not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to update this session' });
        return;
      }
      const { sessionId, patientId, _id, syncedAt, syncedFromServer, ...updates } = req.body;
      const updated = await CognitiveGameSessionRepository.update(session.sessionId, updates);
      res.json({ message: 'Game session updated successfully', game: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update game session' });
    }
  },

  // DELETE /api/v1/game-sessions/:sessionId
  async deleteGameSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { session, authorized } = await resolveGameSession(req.params.sessionId, req.user);
      if (!session) {
        res.status(404).json({ error: 'Not Found', message: 'Game session not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to delete this session' });
        return;
      }
      await CognitiveGameSessionRepository.delete(session.sessionId);
      res.json({ message: 'Game session deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete game session' });
    }
  },
};