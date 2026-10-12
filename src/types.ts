export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'doctor' | 'patient' | 'admin';
  accountStatus: 'active' | 'pending_activation' | 'suspended';
  mustChangePassword?: boolean;
  specialty?: string;
  hospital?: string;
  licenseNumber?: string;
  phone?: string;
  lastLoginAt?: string;
}

export interface MealRecommendation {
  timing: string;
  meal: string;
  recommendations: string;
}

export interface DietaryPlan {
  overview?: string;
  nutritionGoals?: string[];
  hydrationTargetMl?: number;
  meals?: MealRecommendation[];
  foodsRecommended?: string[];
  foodsToAvoid?: string[];
}

export interface PatientProfile {
  _id: string;
  patientId: string;
  patientCode?: string;
  mrn: string;
  assignedDoctorIds: string[];
  preferredLanguage: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profilePhotoUrl?: string;
  faceVerificationEnrolled?: boolean;
  primaryDiagnosis?: string;
  clinicalNotes?: string;
  dietaryPlan?: DietaryPlan;
  createdAt: string;
  updatedAt?: string;
}

export interface AssignedActivity {
  activityId: string;
  activityType: 'physical_exercise' | 'cognitive_game';
  activityName: string;
  exerciseId?: string;
  gameId?: string;
  timeOfDay?: string; // e.g. "Morning (08:30 AM)", "Afternoon (02:00 PM)"
  configuration: {
    targetRepetitions?: number;
    targetDurationSeconds?: number;
    targetRomMinAngle?: number;
    targetRomMaxAngle?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cadenceRepsPerMin?: number;
    cameraOrientation?: 'portrait' | 'landscape';
    instructions?: string;
    cognitiveDomain?: string;
  };
  scheduledDays?: string[];
  frequencyPerDay?: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'paused';
}

export interface RehabilitationPlan {
  _id: string;
  planId: string;
  patientId: string;
  assignedByDoctorId: string;
  title: string;
  version: number;
  status: 'active' | 'completed' | 'archived';
  startDate: string;
  endDate?: string;
  clinicalGoals: string[];
  activities: AssignedActivity[];
  dietaryPlan?: DietaryPlan;
  notes?: string;
  prescribedByDoctorName?: string;
}

export interface ExerciseSession {
  _id?: string;
  sessionId: string;
  patientId?: string;
  assignedActivityId?: string;
  exerciseId: string;
  exerciseName: string;
  startedAt: string;
  completedAt: string;
  activeDurationSeconds: number;
  elapsedDurationSeconds: number;
  targetRepetitions: number;
  completedRepetitions: number;
  validRepetitions: number;
  completionPercentage: number;
  sessionStatus: 'completed' | 'partial' | 'abandoned';
  relevantMetrics: {
    romMaxAngle?: number;
    romMinAngle?: number;
    avgCadenceRepsPerMin?: number;
    symmetryScore?: number;
    formAccuracyPercentage?: number;
    smoothnessScore?: number;
  };
  measurementQuality: 'high' | 'medium' | 'low';
  patientFeedback?: string;
  exerciseAlgorithmVersion: string;
  clientTimestamp: string;
  syncedAt?: string;
  syncedFromServer?: boolean;
}

export interface CognitiveGameSession {
  _id?: string;
  sessionId: string;
  patientId?: string;
  assignedActivityId?: string;
  gameId: string;
  gameName: string;
  cognitiveDomain: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  score: number;
  accuracyPercentage: number;
  reactionTimeMs?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  levelReached?: number;
  sessionStatus: 'completed' | 'partial' | 'abandoned';
  clientTimestamp: string;
  syncedAt?: string;
  syncedFromServer?: boolean;
}

export interface DoctorProfile {
  _id: string;
  name: string;
  email: string;
  role: 'doctor' | 'admin';
  specialty?: string;
  hospital?: string;
  licenseNumber?: string;
  phone?: string;
}

export type SyncState = 'saved_locally' | 'waiting_to_sync' | 'syncing' | 'synced' | 'sync_failed';

export interface LocalSyncQueueItem {
  id: string;
  type: 'exercise' | 'cognitive';
  payload: ExerciseSession | CognitiveGameSession;
  queuedAt: string;
  status: SyncState;
  retryAttempts: number;
  lastError?: string;
}

