import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Exercise Session Validation Schema
export const ExerciseSessionValidationSchema = z.object({
  sessionId: z.string().min(3, 'sessionId must be at least 3 characters long'),
  exerciseId: z.string().min(2, 'exerciseId must be at least 2 characters long'),
  exerciseName: z.string().optional().default('Arm Raise (Anterior Shoulder Flexion)'),
  assignedActivityId: z.string().optional(),
  patientId: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  activeDurationSeconds: z.coerce
    .number()
    .min(0, 'activeDurationSeconds cannot be negative')
    .max(7200, 'activeDurationSeconds exceeds maximum realistic set time')
    .default(60),
  elapsedDurationSeconds: z.coerce
    .number()
    .min(0, 'elapsedDurationSeconds cannot be negative')
    .max(14400, 'elapsedDurationSeconds exceeds maximum realistic time')
    .optional(),
  targetRepetitions: z.coerce
    .number()
    .int('targetRepetitions must be an integer')
    .min(1, 'targetRepetitions must be at least 1')
    .max(500, 'targetRepetitions exceeds safety threshold')
    .default(12),
  completedRepetitions: z.coerce
    .number()
    .int('completedRepetitions must be an integer')
    .min(0, 'completedRepetitions cannot be negative')
    .max(500, 'completedRepetitions exceeds safety threshold')
    .default(0),
  validRepetitions: z.coerce
    .number()
    .int('validRepetitions must be an integer')
    .min(0, 'validRepetitions cannot be negative')
    .max(500, 'validRepetitions exceeds safety threshold')
    .optional(),
  completionPercentage: z.coerce
    .number()
    .min(0, 'completionPercentage cannot be negative')
    .max(100, 'completionPercentage cannot exceed 100')
    .optional(),
  sessionStatus: z.enum(['completed', 'partial', 'abandoned']).default('completed'),
  relevantMetrics: z
    .object({
      romMaxAngle: z.coerce
        .number()
        .min(0, 'romMaxAngle cannot be negative')
        .max(180, 'romMaxAngle exceeds anatomical joint range of 180 degrees')
        .optional(),
      romMinAngle: z.coerce
        .number()
        .min(0, 'romMinAngle cannot be negative')
        .max(180, 'romMinAngle exceeds anatomical joint range of 180 degrees')
        .optional(),
      avgCadenceRepsPerMin: z.coerce
        .number()
        .min(0, 'avgCadenceRepsPerMin cannot be negative')
        .max(120, 'avgCadenceRepsPerMin exceeds realistic cadence')
        .optional(),
      symmetryScore: z.coerce.number().min(0).max(100).optional(),
      formAccuracyPercentage: z.coerce
        .number()
        .min(0, 'formAccuracyPercentage cannot be negative')
        .max(100, 'formAccuracyPercentage cannot exceed 100')
        .optional(),
      smoothnessScore: z.coerce.number().min(0).max(100).optional(),
    })
    .optional()
    .default({}),
  measurementQuality: z.enum(['high', 'medium', 'low']).default('high'),
  patientFeedback: z.string().max(1000).optional(),
  exerciseAlgorithmVersion: z.string().default('1.2.0'),
  clientTimestamp: z.string().optional(),
});

// Cognitive Game Session Validation Schema
export const CognitiveGameSessionValidationSchema = z.object({
  sessionId: z.string().min(3, 'sessionId must be at least 3 characters long'),
  gameId: z.string().min(2, 'gameId must be at least 2 characters long'),
  gameName: z.string().optional().default('Cognitive Rehabilitation Game'),
  assignedActivityId: z.string().optional(),
  patientId: z.string().optional(),
  cognitiveDomain: z
    .string()
    .min(2, 'cognitiveDomain must be specified')
    .default('working_memory'),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  durationSeconds: z.coerce
    .number()
    .min(0, 'durationSeconds cannot be negative')
    .max(7200, 'durationSeconds exceeds maximum game session duration')
    .default(60),
  score: z.coerce
    .number()
    .min(0, 'score cannot be negative')
    .max(100000, 'score exceeds maximum allowable threshold')
    .default(0),
  accuracyPercentage: z.coerce
    .number()
    .min(0, 'accuracyPercentage cannot be negative')
    .max(100, 'accuracyPercentage cannot exceed 100')
    .default(100),
  reactionTimeMs: z.coerce
    .number()
    .min(0, 'reactionTimeMs cannot be negative')
    .max(10000, 'reactionTimeMs exceeds physiological range')
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  levelReached: z.coerce.number().int().min(1).max(100).optional().default(1),
  sessionStatus: z.enum(['completed', 'partial', 'abandoned']).default('completed'),
  clientTimestamp: z.string().optional(),
});

// Generic validation middleware generator
export function validateRequestBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = (result.error?.issues || []).map((issue: any) => ({
        field: Array.isArray(issue.path) ? issue.path.join('.') : '',
        message: issue.message || 'Invalid value',
      }));

      res.status(400).json({
        error: 'Validation Failed',
        message: 'The submitted session payload contains invalid or missing required fields',
        validationErrors: issues,
      });
      return;
    }

    // Replace req.body with the sanitized and typed data
    req.body = result.data;
    next();
  };
}
