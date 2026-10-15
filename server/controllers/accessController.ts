import { Request, Response } from 'express';
import {
  UserRepository,
  PatientProfileRepository,
  RehabilitationPlanRepository,
  ExerciseSessionRepository,
  CognitiveGameSessionRepository,
} from '../models/repositories.js';
import { IExerciseSession, ICognitiveGameSession } from '../models/types.js';

// Code-based (6-digit patient code) access layer.
// The 6-digit code is the external primary key: it resolves a patient's
// profile, prescribed plan, assigned exercises & games, diet and sessions.
// These endpoints are intentionally unauthenticated so a patient can open
// their record from the mobile app simply by entering their 6-digit code.

async function resolvePatient(identifier: string) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;

  // Try UserRepository.findByIdentifier first
  const user = await UserRepository.findByIdentifier(raw);
  if (user) {
    const profile = await PatientProfileRepository.findByPatientId(user._id);
    if (profile) {
      return {
        code: profile.patientCode || user.patientCode || raw,
        profile,
        user,
      };
    }
  }

  // Fallback to checking PatientProfile directly
  const upper = raw.toUpperCase();
  const stripped = upper.replace(/^(PT-|MRN-)/, '');

  let profile = await PatientProfileRepository.findByCode(raw);
  if (!profile) profile = await PatientProfileRepository.findByCode(upper);
  if (!profile) profile = await PatientProfileRepository.findByCode(stripped);
  if (!profile) profile = await PatientProfileRepository.findByPatientId(raw);

  if (!profile) return null;

  const foundUser = await UserRepository.findById(profile.patientId);
  if (!foundUser) return null;

  return { code: profile.patientCode || foundUser.patientCode || raw, profile, user: foundUser };
}

export const AccessController = {
  // GET /api/v1/access/patient/:code
  // Returns the complete patient record bundle for the given 6-digit code.
  async getPatientByCode(req: Request, res: Response): Promise<void> {
    try {
      const resolved = await resolvePatient(req.params.code);
      if (!resolved) {
        res.status(404).json({
          error: 'Not Found',
          message: 'No patient found for this 6-digit code. Please check the code and try again.',
        });
        return;
      }

      const { code, profile, user } = resolved;

      const plan = await RehabilitationPlanRepository.findActiveByPatientId(user._id);
      const exercises = await ExerciseSessionRepository.findByPatientId(user._id, { limit: 20 });
      const games = await CognitiveGameSessionRepository.findByPatientId(user._id, { limit: 20 });

      const activeActivities = plan ? plan.activities.filter((a) => a.status === 'active') : [];
      const physicalExercises = activeActivities.filter((a) => a.activityType === 'physical_exercise');
      const cognitiveGames = activeActivities.filter((a) => a.activityType === 'cognitive_game');

      const careTeam: { id: string; name: string; email: string }[] = [];
      for (const docId of profile.assignedDoctorIds || []) {
        const doc = await UserRepository.findById(docId);
        if (doc) careTeam.push({ id: doc._id, name: doc.name, email: doc.email });
      }

      res.json({
        found: true,
        patientCode: code,
        accessUrl: `/api/v1/access/patient/${code}`,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          accountStatus: user.accountStatus,
          lastLoginAt: user.lastLoginAt,
        },
        profile: {
          patientId: profile.patientId,
          patientCode: profile.patientCode,
          mrn: profile.mrn,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          phoneNumber: profile.phoneNumber,
          emergencyContactName: profile.emergencyContactName,
          emergencyContactPhone: profile.emergencyContactPhone,
          profilePhotoUrl: profile.profilePhotoUrl,
          primaryDiagnosis: profile.primaryDiagnosis,
          clinicalNotes: profile.clinicalNotes,
          preferredLanguage: profile.preferredLanguage,
        },
        plan: plan
          ? {
              planId: plan.planId,
              title: plan.title,
              version: plan.version,
              status: plan.status,
              startDate: plan.startDate,
              clinicalGoals: plan.clinicalGoals,
              notes: plan.notes,
            }
          : null,
        activities: {
          physicalExercises,
          cognitiveGames,
        },
        dietaryPlan: profile.dietaryPlan || plan?.dietaryPlan || null,
        careTeam,
        recentSessions: {
          exercises: exercises.sessions,
          games: games.sessions,
        },
      });
    } catch (err: any) {
      console.error('getPatientByCode error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load patient record' });
    }
  },

  // GET /api/v1/access/patient/:code/sessions
  async getSessionsByCode(req: Request, res: Response): Promise<void> {
    try {
      const resolved = await resolvePatient(req.params.code);
      if (!resolved) {
        res.status(404).json({ error: 'Not Found', message: 'No patient found for this 6-digit code.' });
        return;
      }
      const { user } = resolved;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const skip = parseInt(req.query.skip as string) || 0;

      const exercises = await ExerciseSessionRepository.findByPatientId(user._id, { limit, skip });
      const games = await CognitiveGameSessionRepository.findByPatientId(user._id, { limit, skip });

      res.json({
        patientCode: resolved.code,
        exercises: exercises.sessions,
        games: games.sessions,
        totalExerciseSessions: exercises.total,
        totalGameSessions: games.total,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load sessions' });
    }
  },

  // POST /api/v1/access/patient/:code/exercise-sessions
  async recordExerciseByCode(req: Request, res: Response): Promise<void> {
    try {
      const resolved = await resolvePatient(req.params.code);
      if (!resolved) {
        res.status(404).json({ error: 'Not Found', message: 'No patient found for this 6-digit code.' });
        return;
      }
      const { user } = resolved;
      const data = req.body as Partial<IExerciseSession>;

      if (!data.sessionId || typeof data.sessionId !== 'string') {
        res.status(400).json({ error: 'Validation Error', message: 'sessionId is required' });
        return;
      }
      if (!data.exerciseId || typeof data.exerciseId !== 'string') {
        res.status(400).json({ error: 'Validation Error', message: 'exerciseId is required' });
        return;
      }

      const existing = await ExerciseSessionRepository.findBySessionId(data.sessionId);
      if (existing) {
        res.status(200).json({
          message: 'Exercise session already synchronized (idempotent submission)',
          sessionId: data.sessionId,
          status: 'already_synced',
          session: existing,
        });
        return;
      }

      const now = new Date().toISOString();
      const targetRepetitions = Math.max(1, Math.min(500, Number(data.targetRepetitions) || 12));
      const completedRepetitions = Math.max(0, Math.min(500, Number(data.completedRepetitions) || 0));
      const completionPercentage = Math.min(100, Math.round((completedRepetitions / targetRepetitions) * 100));

      const created = await ExerciseSessionRepository.create({
        ...data,
        sessionId: data.sessionId,
        patientId: user._id,
        exerciseId: data.exerciseId,
        exerciseName: data.exerciseName || 'Arm Raise (Anterior Shoulder Flexion)',
        startedAt: data.startedAt || now,
        completedAt: data.completedAt || now,
        activeDurationSeconds: Math.max(0, Math.min(7200, Number(data.activeDurationSeconds) || 0)),
        elapsedDurationSeconds: Math.max(0, Number(data.elapsedDurationSeconds) || 0),
        targetRepetitions,
        completedRepetitions,
        validRepetitions: Math.min(
          completedRepetitions,
          Math.max(0, Number(data.validRepetitions ?? completedRepetitions))
        ),
        completionPercentage,
        sessionStatus: data.sessionStatus || 'completed',
        relevantMetrics: {
          ...data.relevantMetrics,
          romMaxAngle:
            data.relevantMetrics?.romMaxAngle !== undefined
              ? Math.max(0, Math.min(180, Number(data.relevantMetrics.romMaxAngle)))
              : undefined,
          romMinAngle:
            data.relevantMetrics?.romMinAngle !== undefined
              ? Math.max(0, Math.min(180, Number(data.relevantMetrics.romMinAngle)))
              : undefined,
          formAccuracyPercentage:
            data.relevantMetrics?.formAccuracyPercentage !== undefined
              ? Math.max(0, Math.min(100, Number(data.relevantMetrics.formAccuracyPercentage)))
              : undefined,
        },
        measurementQuality: data.measurementQuality || 'high',
        exerciseAlgorithmVersion: data.exerciseAlgorithmVersion || '1.2.0',
        clientTimestamp: data.clientTimestamp || now,
      });

      res.status(201).json({
        message: 'Exercise session recorded under patient code',
        patientCode: resolved.code,
        status: 'synced',
        session: created,
      });
    } catch (err: any) {
      console.error('recordExerciseByCode error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record exercise session' });
    }
  },

  // POST /api/v1/access/patient/:code/game-sessions
  async recordGameByCode(req: Request, res: Response): Promise<void> {
    try {
      const resolved = await resolvePatient(req.params.code);
      if (!resolved) {
        res.status(404).json({ error: 'Not Found', message: 'No patient found for this 6-digit code.' });
        return;
      }
      const { user } = resolved;
      const data = req.body as Partial<ICognitiveGameSession>;

      if (!data.sessionId || typeof data.sessionId !== 'string') {
        res.status(400).json({ error: 'Validation Error', message: 'sessionId is required' });
        return;
      }
      if (!data.gameId || typeof data.gameId !== 'string') {
        res.status(400).json({ error: 'Validation Error', message: 'gameId is required' });
        return;
      }

      const existing = await CognitiveGameSessionRepository.findBySessionId(data.sessionId);
      if (existing) {
        res.status(200).json({
          message: 'Cognitive game session already synchronized (idempotent submission)',
          sessionId: data.sessionId,
          status: 'already_synced',
          session: existing,
        });
        return;
      }

      const now = new Date().toISOString();
      const created = await CognitiveGameSessionRepository.create({
        ...data,
        sessionId: data.sessionId,
        patientId: user._id,
        gameId: data.gameId,
        gameName: data.gameName || 'Cognitive Rehabilitation Game',
        cognitiveDomain: data.cognitiveDomain || 'working_memory',
        startedAt: data.startedAt || now,
        completedAt: data.completedAt || now,
        durationSeconds: Math.max(0, Math.min(7200, Number(data.durationSeconds) || 60)),
        score: Math.max(0, Math.min(100000, Number(data.score) || 0)),
        accuracyPercentage: Math.min(100, Math.max(0, Number(data.accuracyPercentage ?? 100))),
        reactionTimeMs:
          data.reactionTimeMs !== undefined ? Math.max(0, Math.min(10000, Number(data.reactionTimeMs))) : undefined,
        difficulty: data.difficulty || 'medium',
        levelReached: data.levelReached || 1,
        sessionStatus: data.sessionStatus || 'completed',
        clientTimestamp: data.clientTimestamp || now,
      });

      res.status(201).json({
        message: 'Cognitive game session recorded under patient code',
        patientCode: resolved.code,
        status: 'synced',
        session: created,
      });
    } catch (err: any) {
      console.error('recordGameByCode error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record game session' });
    }
  },

  // POST /api/v1/access/patient/:code/sync-batch
  async batchSyncByCode(req: Request, res: Response): Promise<void> {
    try {
      const resolved = await resolvePatient(req.params.code);
      if (!resolved) {
        res.status(404).json({ error: 'Not Found', message: 'No patient found for this 6-digit code.' });
        return;
      }
      const { user } = resolved;
      const { items } = req.body;

      if (!Array.isArray(items)) {
        res.status(400).json({ error: 'Bad Request', message: 'items must be an array' });
        return;
      }

      const results = [];
      for (const item of items) {
        const { type, payload } = item;
        if (!payload || !payload.sessionId) {
          results.push({ status: 'rejected', error: 'Missing sessionId' });
          continue;
        }

        if (type === 'exercise') {
          const existing = await ExerciseSessionRepository.findBySessionId(payload.sessionId);
          if (existing) {
            results.push({ sessionId: payload.sessionId, status: 'duplicate' });
          } else {
            const created = await ExerciseSessionRepository.create({ ...payload, patientId: user._id });
            results.push({ sessionId: created.sessionId, status: 'synced' });
          }
        } else if (type === 'cognitive') {
          const existing = await CognitiveGameSessionRepository.findBySessionId(payload.sessionId);
          if (existing) {
            results.push({ sessionId: payload.sessionId, status: 'duplicate' });
          } else {
            const created = await CognitiveGameSessionRepository.create({ ...payload, patientId: user._id });
            results.push({ sessionId: created.sessionId, status: 'synced' });
          }
        } else {
          results.push({ sessionId: payload.sessionId, status: 'rejected', error: 'Unknown activity type' });
        }
      }

      res.json({
        patientCode: resolved.code,
        message: `Batch sync complete: ${results.filter((r) => r.status === 'synced').length} synced, ${results.filter((r) => r.status === 'duplicate').length} duplicates`,
        results,
      });
    } catch (err: any) {
      console.error('batchSyncByCode error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process batch sync' });
    }
  },
};
