import { Response } from 'express';
import { AuthenticatedRequest, authorizePatientAccess } from '../middleware/auth.js';
import {
  UserRepository,
  PatientProfileRepository,
  ExerciseSessionRepository,
  CognitiveGameSessionRepository,
} from '../models/repositories.js';
import { IExerciseSession, ICognitiveGameSession } from '../models/types.js';

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function last7DaysCount(items: { startedAt: string }[]): number {
  const cutoff = Date.now() - 7 * 86400000;
  return items.filter((i) => new Date(i.startedAt).getTime() >= cutoff).length;
}

function trend(values: number[]): { firstHalfAvg: number; secondHalfAvg: number; direction: 'improving' | 'declining' | 'stable' } {
  if (values.length < 2) return { firstHalfAvg: avg(values), secondHalfAvg: avg(values), direction: 'stable' };
  const half = Math.floor(values.length / 2);
  const first = values.slice(0, half);
  const second = values.slice(half);
  const f = avg(first);
  const s = avg(second);
  const direction = s > f + 1 ? 'improving' : s < f - 1 ? 'declining' : 'stable';
  return { firstHalfAvg: f, secondHalfAvg: s, direction };
}

function computeExerciseAnalytics(sessions: IExerciseSession[]) {
  const recent = sessions.slice().sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const byExercise: Record<string, { name: string; sessions: number; activeDurationSeconds: number[]; completedRepetitions: number[]; validRepetitions: number[]; completionPercentage: number[]; formAccuracy: number[]; symmetry: number[]; romMax: number[]; smoothness: number[] }> = {};

  for (const s of recent) {
    const key = s.exerciseId || 'unknown';
    if (!byExercise[key]) {
      byExercise[key] = {
        name: s.exerciseName || s.exerciseId,
        sessions: 0,
        activeDurationSeconds: [],
        completedRepetitions: [],
        validRepetitions: [],
        completionPercentage: [],
        formAccuracy: [],
        symmetry: [],
        romMax: [],
        smoothness: [],
      };
    }
    const e = byExercise[key];
    e.sessions++;
    e.activeDurationSeconds.push(s.activeDurationSeconds || 0);
    e.completedRepetitions.push(s.completedRepetitions || 0);
    e.validRepetitions.push(s.validRepetitions || 0);
    e.completionPercentage.push(s.completionPercentage || 0);
    if (s.relevantMetrics?.formAccuracyPercentage !== undefined) e.formAccuracy.push(s.relevantMetrics.formAccuracyPercentage);
    if (s.relevantMetrics?.symmetryScore !== undefined) e.symmetry.push(s.relevantMetrics.symmetryScore);
    if (s.relevantMetrics?.romMaxAngle !== undefined) e.romMax.push(s.relevantMetrics.romMaxAngle);
    if (s.relevantMetrics?.smoothnessScore !== undefined) e.smoothness.push(s.relevantMetrics.smoothnessScore);
  }

  const romTrend = trend(sessions.map((s) => s.relevantMetrics?.romMaxAngle).filter((v): v is number => v !== undefined));
  const accuracyTrend = trend(sessions.map((s) => s.relevantMetrics?.formAccuracyPercentage).filter((v): v is number => v !== undefined));

  return {
    totalSessions: sessions.length,
    sessionsLast7Days: last7DaysCount(recent),
    totalCompletedRepetitions: sessions.reduce((a, s) => a + (s.completedRepetitions || 0), 0),
    totalValidRepetitions: sessions.reduce((a, s) => a + (s.validRepetitions || 0), 0),
    totalActiveTimeSeconds: sessions.reduce((a, s) => a + (s.activeDurationSeconds || 0), 0),
    avgCompletionPercentage: avg(sessions.map((s) => s.completionPercentage || 0)),
    avgFormAccuracyPercentage: avg(sessions.map((s) => s.relevantMetrics?.formAccuracyPercentage).filter((v): v is number => v !== undefined)),
    avgSymmetryScore: avg(sessions.map((s) => s.relevantMetrics?.symmetryScore).filter((v): v is number => v !== undefined)),
    avgRomMaxAngle: avg(sessions.map((s) => s.relevantMetrics?.romMaxAngle).filter((v): v is number => v !== undefined)),
    avgTimePerSessionSeconds: sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (s.activeDurationSeconds || 0), 0) / sessions.length) : 0,
    romMaxTrend: romTrend,
    formAccuracyTrend: accuracyTrend,
    perExercise: Object.values(byExercise).map((e) => ({
      exerciseId: undefined as string | undefined,
      name: e.name,
      sessionCount: e.sessions,
      avgActiveDurationSeconds: avg(e.activeDurationSeconds),
      avgCompletedRepetitions: avg(e.completedRepetitions),
      avgValidRepetitions: avg(e.validRepetitions),
      avgCompletionPercentage: avg(e.completionPercentage),
      avgFormAccuracyPercentage: avg(e.formAccuracy),
      avgSymmetryScore: avg(e.symmetry),
      avgRomMaxAngle: avg(e.romMax),
      avgSmoothnessScore: avg(e.smoothness),
    })),
  };
}

function computeGameAnalytics(sessions: ICognitiveGameSession[]) {
  const recent = sessions.slice().sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const byDomain: Record<string, { domain: string; sessions: number; score: number[]; accuracy: number[]; reactionTime: number[] }> = {};

  for (const s of recent) {
    const key = s.cognitiveDomain || 'general';
    if (!byDomain[key]) {
      byDomain[key] = { domain: key, sessions: 0, score: [], accuracy: [], reactionTime: [] };
    }
    const d = byDomain[key];
    d.sessions++;
    d.score.push(s.score || 0);
    d.accuracy.push(s.accuracyPercentage || 0);
    if (s.reactionTimeMs !== undefined) d.reactionTime.push(s.reactionTimeMs);
  }

  return {
    totalSessions: sessions.length,
    sessionsLast7Days: last7DaysCount(recent),
    avgScore: avg(sessions.map((s) => s.score || 0)),
    avgAccuracyPercentage: avg(sessions.map((s) => s.accuracyPercentage || 0)),
    avgReactionTimeMs: avg(sessions.map((s) => s.reactionTimeMs).filter((v): v is number => v !== undefined)),
    perDomain: Object.values(byDomain).map((d) => ({
      domain: d.domain,
      sessionCount: d.sessions,
      avgScore: avg(d.score),
      avgAccuracyPercentage: avg(d.accuracy),
      avgReactionTimeMs: avg(d.reactionTime),
    })),
  };
}

function buildSummary(
  exerciseAnalytics: ReturnType<typeof computeExerciseAnalytics>,
  gameAnalytics: ReturnType<typeof computeGameAnalytics>,
  exercisesCount: number,
  gamesCount: number
) {
  const { totalSessions: _eTotal, sessionsLast7Days: _eWeek, ...eRest } = exerciseAnalytics;
  const { totalSessions: _gTotal, sessionsLast7Days: _gWeek, ...gRest } = gameAnalytics;
  return {
    totalSessions: exercisesCount + gamesCount,
    totalExerciseSessions: exercisesCount,
    totalGameSessions: gamesCount,
    sessionsLast7Days: exerciseAnalytics.sessionsLast7Days + gameAnalytics.sessionsLast7Days,
    ...eRest,
    ...gRest,
  };
}

function detectWeakAreas(exercises: IExerciseSession[], games: ICognitiveGameSession[]): Array<{ area: string; detail: string; metric: number; recommendation: string }> {
  const weak: Array<{ area: string; detail: string; metric: number; recommendation: string }> = [];

  const recentEx = exercises.slice().sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 10);
  const recentGames = games.slice().sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 10);

  const avgCompletion = avg(recentEx.map((s) => s.completionPercentage || 0));
  if (avgCompletion > 0 && avgCompletion < 80) {
    weak.push({
      area: 'Session completion',
      detail: `Completes only ~${avgCompletion}% of prescribed repetitions`,
      metric: avgCompletion,
      recommendation: 'Reduce target reps or break sessions into shorter, more frequent sets to improve endurance.',
    });
  }

  const avgForm = avg(recentEx.map((s) => s.relevantMetrics?.formAccuracyPercentage).filter((v): v is number => v !== undefined));
  if (avgForm > 0 && avgForm < 80) {
    weak.push({
      area: 'Exercise form accuracy',
      detail: `Average form accuracy of ${avgForm}% is below the 80% clinical threshold`,
      metric: avgForm,
      recommendation: 'Add guided form retraining and calm-down the movement cadence to reduce compensation patterns.',
    });
  }

  const avgSymmetry = avg(recentEx.map((s) => s.relevantMetrics?.symmetryScore).filter((v): v is number => v !== undefined));
  if (avgSymmetry > 0 && avgSymmetry < 80) {
    weak.push({
      area: 'Bilateral movement symmetry',
      detail: `Symmetry score of ${avgSymmetry}% indicates noticeable use of the unaffected side`,
      metric: avgSymmetry,
      recommendation: 'Focus on mirrored slow-paced movements and monitor scapular stability during elevation.',
    });
  }

  const avgRom = avg(recentEx.map((s) => s.relevantMetrics?.romMaxAngle).filter((v): v is number => v !== undefined));
  const targetRom = 120;
  if (avgRom > 0 && avgRom < targetRom) {
    weak.push({
      area: 'Range of motion',
      detail: `Average peak flexion of ${avgRom}° is ${targetRom - avgRom}° short of the ${targetRom}° goal`,
      metric: avgRom,
      recommendation: 'Prescribe assisted active range-of-motion progression toward the 120° flexion target.',
    });
  }

  const avgGameAccuracy = avg(recentGames.map((s) => s.accuracyPercentage || 0));
  if (avgGameAccuracy > 0 && avgGameAccuracy < 70) {
    weak.push({
      area: 'Cognitive accuracy',
      detail: `Average game accuracy of ${avgGameAccuracy}% is below the 70% threshold`,
      metric: avgGameAccuracy,
      recommendation: 'Step difficulty down to easy and re-introduce medium difficulty once accuracy exceeds 80%.',
    });
  }

  const reaction = avg(recentGames.map((s) => s.reactionTimeMs).filter((v): v is number => v !== undefined));
  if (reaction > 0 && reaction > 600) {
    weak.push({
      area: 'Processing speed',
      detail: `Average reaction time of ${reaction}ms is slower than the 600ms clinical target`,
      metric: reaction,
      recommendation: 'Schedule daily reaction-time drills; tracking this metric weekly will highlight improvement.',
    });
  }

  return weak;
}

export const AnalyticsController = {
  // GET /api/v1/analytics/patients/:patientId
  async getPatientProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.patientId;
      const isAuthorized = await authorizePatientAccess(req.user!, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view this patient analytics' });
        return;
      }

      const user = await UserRepository.findById(patientId);
      if (!user) {
        res.status(404).json({ error: 'Not Found', message: 'Patient not found' });
        return;
      }

      const [exerciseRes, gameRes] = await Promise.all([
        ExerciseSessionRepository.findByPatientId(patientId, { limit: 500 }),
        CognitiveGameSessionRepository.findByPatientId(patientId, { limit: 500 }),
      ]);

      const exercises = exerciseRes.sessions;
      const games = gameRes.sessions;
      const exerciseAnalytics = computeExerciseAnalytics(exercises);
      const gameAnalytics = computeGameAnalytics(games);
      const weakAreas = detectWeakAreas(exercises, games);

      res.json({
        patient: { _id: user._id, name: user.name, patientCode: user.patientCode },
        summary: buildSummary(exerciseAnalytics, gameAnalytics, exercises.length, games.length),
        areasNeedingImprovement: weakAreas,
        exercises: exerciseAnalytics.perExercise,
        games: gameAnalytics.perDomain,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to compute patient analytics' });
    }
  },

  // GET /api/v1/analytics/me
  async getMyProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.user!._id;
      const [exerciseRes, gameRes] = await Promise.all([
        ExerciseSessionRepository.findByPatientId(patientId, { limit: 500 }),
        CognitiveGameSessionRepository.findByPatientId(patientId, { limit: 500 }),
      ]);

      const exercises = exerciseRes.sessions;
      const games = gameRes.sessions;
      const exerciseAnalytics = computeExerciseAnalytics(exercises);
      const gameAnalytics = computeGameAnalytics(games);

      res.json({
        patient: { _id: req.user!._id, name: req.user!.name },
        summary: buildSummary(exerciseAnalytics, gameAnalytics, exercises.length, games.length),
        areasNeedingImprovement: detectWeakAreas(exercises, games),
        exercises: exerciseAnalytics.perExercise,
        games: gameAnalytics.perDomain,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to compute analytics' });
    }
  },

  // GET /api/v1/analytics/overview
  async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const role = req.user!.role;
      const profiles = role === 'admin'
        ? await PatientProfileRepository.list()
        : await PatientProfileRepository.findByDoctorId(req.user!._id);

      const rows = [];
      for (const profile of profiles) {
        const user = await UserRepository.findById(profile.patientId);
        if (!user) continue;
        const [exerciseRes, gameRes] = await Promise.all([
          ExerciseSessionRepository.list({ patientId: user._id, limit: 500 }),
          CognitiveGameSessionRepository.list({ patientId: user._id, limit: 500 }),
        ]);
        const exercises = exerciseRes.sessions;
        const games = gameRes.sessions;
        rows.push({
          patientId: user._id,
          name: user.name,
          patientCode: user.patientCode,
          accountStatus: user.accountStatus,
          totalSessions: exercises.length + games.length,
          totalExerciseSessions: exercises.length,
          totalGameSessions: games.length,
          sessionsLast7Days: last7DaysCount(exercises) + last7DaysCount(games),
          avgCompletionPercentage: avg(exercises.map((s) => s.completionPercentage || 0)),
          avgFormAccuracyPercentage: avg(exercises.map((s) => s.relevantMetrics?.formAccuracyPercentage).filter((v): v is number => v !== undefined)),
          avgRomMaxAngle: avg(exercises.map((s) => s.relevantMetrics?.romMaxAngle).filter((v): v is number => v !== undefined)),
          avgGameAccuracyPercentage: avg(games.map((s) => s.accuracyPercentage || 0)),
          weakAreaCount: detectWeakAreas(exercises, games).length,
        });
      }

      rows.sort((a, b) => new Date(b.sessionsLast7Days) > new Date(a.sessionsLast7Days) ? 1 : -1);

      res.json({
        generatedAt: new Date().toISOString(),
        totalPatients: rows.length,
        patients: rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to compute overview analytics' });
    }
  },
};