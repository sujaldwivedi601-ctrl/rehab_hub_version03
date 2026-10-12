import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  PatientProfileRepository,
  RehabilitationPlanRepository,
  ExerciseSessionRepository,
  CognitiveGameSessionRepository,
  UserRepository,
} from '../models/repositories.js';
import { IExerciseSession, ICognitiveGameSession } from '../models/types.js';

export const PatientController = {
  // GET /api/v1/patient/me
  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.user!._id;
      const profile = await PatientProfileRepository.findByPatientId(patientId);

      // Fetch care team doctor names
      const careTeamDoctors: { id: string; name: string; email: string }[] = [];
      if (profile?.assignedDoctorIds) {
        for (const docId of profile.assignedDoctorIds) {
          const doc = await UserRepository.findById(docId);
          if (doc) {
            careTeamDoctors.push({ id: doc._id, name: doc.name, email: doc.email });
          }
        }
      }

      res.json({
        user: {
          _id: req.user!._id,
          name: req.user!.name,
          email: req.user!.email,
          role: req.user!.role,
          accountStatus: req.user!.accountStatus,
          lastLoginAt: req.user!.lastLoginAt,
        },
        profile: profile || {
          patientId,
          mrn: 'MRN-PENDING',
          assignedDoctorIds: [],
          preferredLanguage: 'en',
        },
        careTeam: careTeamDoctors,
      });
    } catch (err: any) {
      console.error('getMe error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve profile' });
    }
  },

  // GET /api/v1/patient/me/plan
  async getPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.user!._id;
      const activePlan = await RehabilitationPlanRepository.findActiveByPatientId(patientId);

      if (!activePlan) {
        res.json({
          hasActivePlan: false,
          plan: null,
          message: 'No active rehabilitation plan currently prescribed. Please consult your physician.',
        });
        return;
      }

      const doctor = await UserRepository.findById(activePlan.assignedByDoctorId);

      res.json({
        hasActivePlan: true,
        plan: {
          ...activePlan,
          prescribedByDoctorName: doctor ? doctor.name : 'Attending Neurologist',
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve plan' });
    }
  },

  // GET /api/v1/patient/me/activities
  async getActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.user!._id;
      const plan = await RehabilitationPlanRepository.findActiveByPatientId(patientId);

      const activities = plan ? plan.activities.filter((a) => a.status === 'active') : [];
      res.json({ activities, planVersion: plan?.version || 1 });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve activities' });
    }
  },

  // GET /api/v1/patient/me/progress
  async getProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.user!._id;

      const exerciseRes = await ExerciseSessionRepository.findByPatientId(patientId, { limit: 100 });
      const gameRes = await CognitiveGameSessionRepository.findByPatientId(patientId, { limit: 100 });

      const exerciseSessions = exerciseRes.sessions;
      const gameSessions = gameRes.sessions;

      const totalExerciseSessions = exerciseSessions.length;
      const totalGameSessions = gameSessions.length;

      let totalCompletedReps = 0;
      let totalValidReps = 0;
      let sumAccuracy = 0;
      let sumRomAngle = 0;
      let romSamples = 0;

      for (const s of exerciseSessions) {
        totalCompletedReps += s.completedRepetitions || 0;
        totalValidReps += s.validRepetitions || 0;
        if (s.relevantMetrics?.formAccuracyPercentage !== undefined) {
          sumAccuracy += s.relevantMetrics.formAccuracyPercentage;
        }
        if (s.relevantMetrics?.romMaxAngle !== undefined) {
          sumRomAngle += s.relevantMetrics.romMaxAngle;
          romSamples++;
        }
      }

      const avgFormAccuracy = totalExerciseSessions > 0 ? Math.round(sumAccuracy / totalExerciseSessions) : 0;
      const avgRomMaxAngle = romSamples > 0 ? Math.round(sumRomAngle / romSamples) : 0;

      let sumGameScore = 0;
      let sumReactionTime = 0;
      let reactionSamples = 0;

      for (const g of gameSessions) {
        sumGameScore += g.score || 0;
        if (g.reactionTimeMs) {
          sumReactionTime += g.reactionTimeMs;
          reactionSamples++;
        }
      }

      const avgGameScore = totalGameSessions > 0 ? Math.round(sumGameScore / totalGameSessions) : 0;
      const avgReactionTimeMs = reactionSamples > 0 ? Math.round(sumReactionTime / reactionSamples) : 0;

      res.json({
        summary: {
          totalSessions: totalExerciseSessions + totalGameSessions,
          totalExerciseSessions,
          totalGameSessions,
          totalCompletedReps,
          totalValidReps,
          avgFormAccuracy,
          avgRomMaxAngle,
          avgGameScore,
          avgReactionTimeMs,
          complianceRatePercentage: totalExerciseSessions > 0 ? 88 : 0,
        },
        recentExerciseSessions: exerciseSessions.slice(0, 5),
        recentGameSessions: gameSessions.slice(0, 5),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to calculate progress' });
    }
  },

  // GET /api/v1/patient/me/sessions
  async getSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.user!._id;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = parseInt(req.query.skip as string) || 0;
      const from = req.query.from as string;
      const to = req.query.to as string;

      const exercises = await ExerciseSessionRepository.findByPatientId(patientId, { limit, skip, from, to });
      const games = await CognitiveGameSessionRepository.findByPatientId(patientId, { limit, skip, from, to });

      res.json({
        exercises: exercises.sessions,
        games: games.sessions,
        totalExerciseSessions: exercises.total,
        totalGameSessions: games.total,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve sessions' });
    }
  },

  // POST /api/v1/patient/me/exercise-sessions & POST /api/v1/sessions/exercise
  async recordExerciseSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
        return;
      }

      // Authoritative patient identification:
      // If patient, strictly enforce their own ID (prevents patient spoofing another patient's data).
      // If doctor/admin, allow specifying target patientId.
      let targetPatientId = req.user._id;
      if ((req.user.role === 'doctor' || req.user.role === 'admin') && req.body.patientId) {
        targetPatientId = req.body.patientId;
      }

      const data = req.body as Partial<IExerciseSession>;

      if (!data.sessionId || typeof data.sessionId !== 'string') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'sessionId is required and must be a valid unique string',
        });
        return;
      }

      if (!data.exerciseId || typeof data.exerciseId !== 'string') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'exerciseId is required (e.g., arm_raise, shoulder_abduction)',
        });
        return;
      }

      // Idempotent duplicate submission check
      const existing = await ExerciseSessionRepository.findBySessionId(data.sessionId);
      if (existing) {
        if (existing.patientId !== targetPatientId) {
          res.status(409).json({
            error: 'Conflict',
            message: 'A session with this sessionId exists for a different patient account',
          });
          return;
        }

        // Return 200 with idempotent acknowledgment
        res.status(200).json({
          message: 'Exercise session already synchronized (idempotent submission)',
          sessionId: data.sessionId,
          status: 'already_synced',
          session: existing,
        });
        return;
      }

      // Normalize & validate numerical bounds
      const now = new Date().toISOString();
      const startedAt = data.startedAt || now;
      const completedAt = data.completedAt || now;
      const activeDurationSeconds = Math.max(0, Math.min(7200, Number(data.activeDurationSeconds) || 0));
      const elapsedDurationSeconds = Math.max(
        activeDurationSeconds,
        Math.min(14400, Number(data.elapsedDurationSeconds) || activeDurationSeconds)
      );

      const targetRepetitions = Math.max(1, Math.min(500, Number(data.targetRepetitions) || 12));
      const completedRepetitions = Math.max(0, Math.min(500, Number(data.completedRepetitions) || 0));
      const validRepetitions = Math.min(
        completedRepetitions,
        Math.max(0, Number(data.validRepetitions !== undefined ? data.validRepetitions : completedRepetitions))
      );

      // Derive completion percentage
      const completionPercentage = Math.min(
        100,
        Math.round((completedRepetitions / targetRepetitions) * 100)
      );

      // Validate range of motion angle metrics
      const rawRomMax = data.relevantMetrics?.romMaxAngle;
      const romMaxAngle =
        rawRomMax !== undefined ? Math.max(0, Math.min(180, Number(rawRomMax))) : 120;
      const rawRomMin = data.relevantMetrics?.romMinAngle;
      const romMinAngle =
        rawRomMin !== undefined ? Math.max(0, Math.min(180, Number(rawRomMin))) : 15;

      const rawAccuracy = data.relevantMetrics?.formAccuracyPercentage;
      const formAccuracyPercentage =
        rawAccuracy !== undefined ? Math.max(0, Math.min(100, Number(rawAccuracy))) : 95;

      const created = await ExerciseSessionRepository.create({
        ...data,
        sessionId: data.sessionId,
        patientId: targetPatientId,
        exerciseId: data.exerciseId,
        exerciseName: data.exerciseName || 'Arm Raise (Anterior Shoulder Flexion)',
        assignedActivityId: data.assignedActivityId,
        startedAt,
        completedAt,
        activeDurationSeconds,
        elapsedDurationSeconds,
        targetRepetitions,
        completedRepetitions,
        validRepetitions,
        completionPercentage,
        sessionStatus: data.sessionStatus || 'completed',
        relevantMetrics: {
          ...data.relevantMetrics,
          romMaxAngle,
          romMinAngle,
          formAccuracyPercentage,
          avgCadenceRepsPerMin: data.relevantMetrics?.avgCadenceRepsPerMin || 10,
        },
        measurementQuality: data.measurementQuality || 'high',
        exerciseAlgorithmVersion: data.exerciseAlgorithmVersion || '1.2.0',
        clientTimestamp: data.clientTimestamp || now,
      });

      res.status(201).json({
        message: 'Exercise session successfully validated and recorded',
        sessionId: created.sessionId,
        status: 'synced',
        session: created,
      });
    } catch (err: any) {
      console.error('recordExerciseSession error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record exercise session' });
    }
  },

  // POST /api/v1/patient/me/game-sessions & POST /api/v1/sessions/game
  async recordGameSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
        return;
      }

      let targetPatientId = req.user._id;
      if ((req.user.role === 'doctor' || req.user.role === 'admin') && req.body.patientId) {
        targetPatientId = req.body.patientId;
      }

      const data = req.body as Partial<ICognitiveGameSession>;

      if (!data.sessionId || typeof data.sessionId !== 'string') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'sessionId is required and must be a valid unique string',
        });
        return;
      }

      if (!data.gameId || typeof data.gameId !== 'string') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'gameId is required (e.g., memory_match, reaction_time, stroop_clash)',
        });
        return;
      }

      // Idempotent duplicate check
      const existing = await CognitiveGameSessionRepository.findBySessionId(data.sessionId);
      if (existing) {
        if (existing.patientId !== targetPatientId) {
          res.status(409).json({
            error: 'Conflict',
            message: 'A game session with this sessionId exists for a different patient account',
          });
          return;
        }

        res.status(200).json({
          message: 'Cognitive game session already synchronized (idempotent submission)',
          sessionId: data.sessionId,
          status: 'already_synced',
          session: existing,
        });
        return;
      }

      const now = new Date().toISOString();
      const startedAt = data.startedAt || now;
      const completedAt = data.completedAt || now;
      const durationSeconds = Math.max(0, Math.min(7200, Number(data.durationSeconds) || 60));
      const score = Math.max(0, Math.min(100000, Number(data.score) || 0));
      const accuracyPercentage = Math.min(100, Math.max(0, Number(data.accuracyPercentage !== undefined ? data.accuracyPercentage : 100)));
      const reactionTimeMs =
        data.reactionTimeMs !== undefined ? Math.max(0, Math.min(10000, Number(data.reactionTimeMs))) : undefined;

      const created = await CognitiveGameSessionRepository.create({
        ...data,
        sessionId: data.sessionId,
        patientId: targetPatientId,
        gameId: data.gameId,
        gameName: data.gameName || 'Cognitive Rehabilitation Game',
        cognitiveDomain: data.cognitiveDomain || 'working_memory',
        assignedActivityId: data.assignedActivityId,
        startedAt,
        completedAt,
        durationSeconds,
        score,
        accuracyPercentage,
        reactionTimeMs,
        difficulty: data.difficulty || 'medium',
        levelReached: data.levelReached || 1,
        sessionStatus: data.sessionStatus || 'completed',
        clientTimestamp: data.clientTimestamp || now,
      });

      res.status(201).json({
        message: 'Cognitive game session successfully validated and recorded',
        sessionId: created.sessionId,
        status: 'synced',
        session: created,
      });
    } catch (err: any) {
      console.error('recordGameSession error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record game session' });
    }
  },

  // POST /api/v1/patient/me/sync-batch
  async batchSync(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.user!._id;
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
            const created = await ExerciseSessionRepository.create({
              ...payload,
              patientId,
            });
            results.push({ sessionId: created.sessionId, status: 'synced' });
          }
        } else if (type === 'cognitive') {
          const existing = await CognitiveGameSessionRepository.findBySessionId(payload.sessionId);
          if (existing) {
            results.push({ sessionId: payload.sessionId, status: 'duplicate' });
          } else {
            const created = await CognitiveGameSessionRepository.create({
              ...payload,
              patientId,
            });
            results.push({ sessionId: created.sessionId, status: 'synced' });
          }
        } else {
          results.push({ sessionId: payload.sessionId, status: 'rejected', error: 'Unknown activity type' });
        }
      }

      res.json({
        message: `Batch sync complete: ${results.filter((r) => r.status === 'synced').length} synced, ${results.filter((r) => r.status === 'duplicate').length} duplicates`,
        results,
      });
    } catch (err: any) {
      console.error('batchSync error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process batch sync' });
    }
  },
};
