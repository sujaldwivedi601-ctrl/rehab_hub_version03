export type UserRole = 'doctor' | 'patient' | 'admin';
export type AccountStatus = 'active' | 'pending_activation' | 'suspended';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  accountStatus: AccountStatus;
  mustChangePassword?: boolean;
  activationCode?: string;
  activationCodeExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  gender?: string;
  profilePic?: string;
  specialty?: string;
  hospital?: string;
  licenseNumber?: string;
  phone?: string;
  // 6-digit patient access code. Acts as the external primary key for a
  // patient's entire record (profile, plan, activities, diet, sessions).
  patientCode?: string;
}

export interface IPatientProfile {
  _id: string;
  patientId: string; // Foreign key to User._id
  patientCode?: string; // Unique 6-digit access code (external primary key)
  mrn: string; // Medical Record Number / Patient Identifier
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
  dietaryPlan?: {
    overview?: string;
    nutritionGoals?: string[];
    hydrationTargetMl?: number;
    meals?: Array<{ timing: string; meal: string; recommendations: string }>;
    foodsRecommended?: string[];
    foodsToAvoid?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'physical_exercise' | 'cognitive_game';
export type ActivityStatus = 'active' | 'completed' | 'paused';

export interface IAssignedActivity {
  activityId: string;
  activityType: ActivityType;
  activityName: string;
  exerciseId?: string; // e.g. 'arm_raise', 'shoulder_abduction', 'elbow_flexion'
  gameId?: string; // e.g. 'memory_match', 'reaction_time', 'stroop_test', etc.
  timeOfDay?: string; // e.g. 'Morning (09:00 AM)', 'Evening (05:00 PM)'
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
  scheduledDays?: string[]; // e.g. ['monday', 'wednesday', 'friday']
  frequencyPerDay?: number;
  startDate: string;
  endDate?: string;
  status: ActivityStatus;
}

export interface IRehabilitationPlan {
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
  activities: IAssignedActivity[];
  dietaryPlan?: {
    overview?: string;
    nutritionGoals?: string[];
    hydrationTargetMl?: number;
    meals?: Array<{ timing: string; meal: string; recommendations: string }>;
    foodsRecommended?: string[];
    foodsToAvoid?: string[];
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IExerciseMetrics {
  romMaxAngle?: number;
  romMinAngle?: number;
  avgCadenceRepsPerMin?: number;
  symmetryScore?: number; // 0 - 100
  formAccuracyPercentage?: number; // 0 - 100
  smoothnessScore?: number; // 0 - 100
  jointAnglesTracked?: string[];
}

export interface IExerciseSession {
  _id: string;
  sessionId: string; // Unique client-generated UUID for idempotent submission
  patientId: string;
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
  relevantMetrics: IExerciseMetrics;
  measurementQuality: 'high' | 'medium' | 'low';
  patientFeedback?: string;
  exerciseAlgorithmVersion: string;
  clientTimestamp: string;
  syncedAt: string;
  syncedFromServer: boolean;
}

export interface ICognitiveGameSession {
  _id: string;
  sessionId: string; // Unique client-generated UUID for idempotent submission
  patientId: string;
  assignedActivityId?: string;
  gameId: string;
  gameName: string;
  cognitiveDomain: string; // e.g. 'working_memory', 'processing_speed', 'executive_function'
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
  syncedAt: string;
  syncedFromServer: boolean;
}

export interface IRefreshToken {
  _id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revoked: boolean;
  replacedByTokenHash?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
