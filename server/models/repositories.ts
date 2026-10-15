import { v4 as uuidv4 } from 'uuid';
import { dbStore } from '../db/connection.js';
import {
  IUser,
  IPatientProfile,
  IRehabilitationPlan,
  IExerciseSession,
  ICognitiveGameSession,
  IRefreshToken,
} from './types.js';

// Unified repository layer that ensures persistent query execution
export const UserRepository = {
  async findById(id: string): Promise<IUser | null> {
    const user = dbStore.getState().users.find((u) => u._id === id);
    return user ? { ...user } : null;
  },

  async findByEmail(email: string): Promise<IUser | null> {
    const normalized = email.toLowerCase().trim();
    const user = dbStore.getState().users.find((u) => u.email.toLowerCase() === normalized);
    return user ? { ...user } : null;
  },

  async findByActivationCode(code: string): Promise<IUser | null> {
    const user = dbStore.getState().users.find((u) => u.activationCode === code);
    return user ? { ...user } : null;
  },

  async create(data: Partial<IUser>): Promise<IUser> {
    const now = new Date().toISOString();
    const newUser: IUser = {
      _id: data._id || `usr_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      name: data.name || '',
      email: (data.email || '').toLowerCase().trim(),
      passwordHash: data.passwordHash || '',
      role: data.role || 'patient',
      accountStatus: data.accountStatus || 'active',
      mustChangePassword: data.mustChangePassword ?? false,
      activationCode: data.activationCode,
      activationCodeExpiresAt: data.activationCodeExpiresAt,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: data.lastLoginAt,
      gender: data.gender,
      profilePic: data.profilePic,
      specialty: data.specialty,
      hospital: data.hospital,
      licenseNumber: data.licenseNumber,
      phone: data.phone,
      patientCode: data.patientCode,
    };
    dbStore.getState().users.push(newUser);
    dbStore.saveToFile();
    return { ...newUser };
  },

  async findByPatientCode(code: string): Promise<IUser | null> {
    const normalized = String(code).trim();
    const user = dbStore.getState().users.find((u) => u.patientCode === normalized);
    return user ? { ...user } : null;
  },

  async findByIdentifier(identifier: string): Promise<IUser | null> {
    const raw = String(identifier || '').trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    const upper = raw.toUpperCase();
    const stripped = upper.replace(/^(PT-|MRN-)/, '');

    // 1. By exact email
    const byEmail = dbStore.getState().users.find((u) => u.email.toLowerCase() === lower);
    if (byEmail) return { ...byEmail };

    // 2. By patient code (exact, uppercase, or stripped)
    const byCode = dbStore.getState().users.find(
      (u) =>
        u.patientCode === raw ||
        u.patientCode?.toUpperCase() === upper ||
        u.patientCode?.toUpperCase() === stripped ||
        u.patientCode?.toUpperCase().replace(/^PT-/, '') === stripped
    );
    if (byCode) return { ...byCode };

    // 3. By Patient Name (case-insensitive)
    const byName = dbStore.getState().users.find(
      (u) => u.name.toLowerCase().trim() === lower
    );
    if (byName) return { ...byName };

    // 4. By _id
    const byId = dbStore.getState().users.find((u) => u._id === raw);
    if (byId) return { ...byId };

    // 5. Cross-check PatientProfile repository by code or MRN
    const profile = dbStore.getState().patientProfiles.find(
      (p) =>
        p.patientCode === raw ||
        p.patientCode?.toUpperCase() === upper ||
        p.patientCode?.toUpperCase() === stripped ||
        p.mrn === raw ||
        p.mrn?.toUpperCase() === upper ||
        p.mrn?.toUpperCase() === `MRN-${stripped}`
    );
    if (profile) {
      const user = dbStore.getState().users.find((u) => u._id === profile.patientId);
      if (user) return { ...user };
    }

    return null;
  },

  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    const userIndex = dbStore.getState().users.findIndex((u) => u._id === id);
    if (userIndex === -1) return null;
    const now = new Date().toISOString();
    dbStore.getState().users[userIndex] = {
      ...dbStore.getState().users[userIndex],
      ...updates,
      updatedAt: now,
    };
    dbStore.saveToFile();
    return { ...dbStore.getState().users[userIndex] };
  },

  async list(): Promise<IUser[]> {
    return dbStore.getState().users.map((u) => ({ ...u }));
  },

  async listByRole(role: string): Promise<IUser[]> {
    return dbStore
      .getState()
      .users.filter((u) => u.role === role)
      .map((u) => ({ ...u }));
  },

  async delete(id: string): Promise<boolean> {
    const idx = dbStore.getState().users.findIndex((u) => u._id === id);
    if (idx === -1) return false;
    dbStore.getState().users.splice(idx, 1);
    dbStore.saveToFile();
    return true;
  },
};

export const PatientProfileRepository = {
  async findByPatientId(patientId: string): Promise<IPatientProfile | null> {
    const profile = dbStore.getState().patientProfiles.find((p) => p.patientId === patientId);
    return profile ? { ...profile } : null;
  },

  async findByCode(code: string): Promise<IPatientProfile | null> {
    const normalized = String(code).trim();
    const profile = dbStore.getState().patientProfiles.find((p) => p.patientCode === normalized);
    return profile ? { ...profile } : null;
  },

  async isCodeTaken(code: string): Promise<boolean> {
    const normalized = String(code).trim();
    return dbStore.getState().patientProfiles.some((p) => p.patientCode === normalized);
  },

  async findByDoctorId(doctorId: string): Promise<IPatientProfile[]> {
    return dbStore
      .getState()
      .patientProfiles.filter((p) => p.assignedDoctorIds.includes(doctorId))
      .map((p) => ({ ...p }));
  },

  async list(): Promise<IPatientProfile[]> {
    return dbStore.getState().patientProfiles.map((p) => ({ ...p }));
  },

  async create(data: Partial<IPatientProfile>): Promise<IPatientProfile> {
    const now = new Date().toISOString();
    const newProfile: IPatientProfile = {
      _id: data._id || `prof_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      patientId: data.patientId!,
      patientCode: data.patientCode,
      mrn: data.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
      assignedDoctorIds: data.assignedDoctorIds || [],
      preferredLanguage: data.preferredLanguage || 'en',
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      profilePhotoUrl: data.profilePhotoUrl,
      faceVerificationEnrolled: !!data.profilePhotoUrl || data.faceVerificationEnrolled || false,
      primaryDiagnosis: data.primaryDiagnosis,
      clinicalNotes: data.clinicalNotes,
      dietaryPlan: data.dietaryPlan,
      createdAt: now,
      updatedAt: now,
    };
    dbStore.getState().patientProfiles.push(newProfile);
    dbStore.saveToFile();
    return { ...newProfile };
  },

  async update(patientId: string, updates: Partial<IPatientProfile>): Promise<IPatientProfile | null> {
    const index = dbStore.getState().patientProfiles.findIndex((p) => p.patientId === patientId);
    if (index === -1) return null;
    const now = new Date().toISOString();
    dbStore.getState().patientProfiles[index] = {
      ...dbStore.getState().patientProfiles[index],
      ...updates,
      updatedAt: now,
    };
    dbStore.saveToFile();
    return { ...dbStore.getState().patientProfiles[index] };
  },

  async delete(patientId: string): Promise<boolean> {
    const idx = dbStore.getState().patientProfiles.findIndex((p) => p.patientId === patientId);
    if (idx !== -1) {
      dbStore.getState().patientProfiles.splice(idx, 1);
    }
    const userIdx = dbStore.getState().users.findIndex((u) => u._id === patientId);
    if (userIdx !== -1) {
      dbStore.getState().users.splice(userIdx, 1);
    }
    dbStore.getState().rehabilitationPlans = dbStore.getState().rehabilitationPlans.filter((p) => p.patientId !== patientId);
    dbStore.getState().exerciseSessions = dbStore.getState().exerciseSessions.filter((s) => s.patientId !== patientId);
    dbStore.getState().cognitiveGameSessions = dbStore.getState().cognitiveGameSessions.filter((s) => s.patientId !== patientId);
    dbStore.saveToFile();
    return true;
  },
};

export const RehabilitationPlanRepository = {
  async findActiveByPatientId(patientId: string): Promise<IRehabilitationPlan | null> {
    const plan = dbStore
      .getState()
      .rehabilitationPlans.find((p) => p.patientId === patientId && p.status === 'active');
    return plan ? { ...plan } : null;
  },

  async findByPatientId(patientId: string): Promise<IRehabilitationPlan[]> {
    return dbStore
      .getState()
      .rehabilitationPlans.filter((p) => p.patientId === patientId)
      .map((p) => ({ ...p }));
  },

  async findByPlanId(planId: string): Promise<IRehabilitationPlan | null> {
    const plan = dbStore.getState().rehabilitationPlans.find((p) => p.planId === planId);
    return plan ? { ...plan } : null;
  },

  async list(options?: { patientId?: string; status?: string }): Promise<IRehabilitationPlan[]> {
    let items = dbStore.getState().rehabilitationPlans;
    if (options?.patientId) items = items.filter((p) => p.patientId === options.patientId);
    if (options?.status) items = items.filter((p) => p.status === options.status);
    return items.map((p) => ({ ...p }));
  },

  async create(data: Partial<IRehabilitationPlan>): Promise<IRehabilitationPlan> {
    const now = new Date().toISOString();
    const newPlan: IRehabilitationPlan = {
      _id: data._id || `plan_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      planId: data.planId || `PLN-${Date.now().toString(36).toUpperCase()}`,
      patientId: data.patientId!,
      assignedByDoctorId: data.assignedByDoctorId!,
      title: data.title || 'Neurorehabilitation Protocol',
      version: data.version || 1,
      status: data.status || 'active',
      startDate: data.startDate || now,
      endDate: data.endDate,
      clinicalGoals: data.clinicalGoals || [],
      activities: data.activities || [],
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };
    dbStore.getState().rehabilitationPlans.push(newPlan);
    dbStore.saveToFile();
    return { ...newPlan };
  },

  async update(planId: string, updates: Partial<IRehabilitationPlan>): Promise<IRehabilitationPlan | null> {
    const index = dbStore.getState().rehabilitationPlans.findIndex((p) => p.planId === planId);
    if (index === -1) return null;
    const now = new Date().toISOString();
    dbStore.getState().rehabilitationPlans[index] = {
      ...dbStore.getState().rehabilitationPlans[index],
      ...updates,
      updatedAt: now,
    };
    dbStore.saveToFile();
    return { ...dbStore.getState().rehabilitationPlans[index] };
  },

  async delete(planId: string): Promise<boolean> {
    const idx = dbStore.getState().rehabilitationPlans.findIndex((p) => p.planId === planId);
    if (idx === -1) return false;
    dbStore.getState().rehabilitationPlans.splice(idx, 1);
    dbStore.saveToFile();
    return true;
  },
};

export const ExerciseSessionRepository = {
  async findBySessionId(sessionId: string): Promise<IExerciseSession | null> {
    const session = dbStore.getState().exerciseSessions.find((s) => s.sessionId === sessionId);
    return session ? { ...session } : null;
  },

  async findByPatientId(patientId: string, options?: { limit?: number; skip?: number; from?: string; to?: string }): Promise<{ sessions: IExerciseSession[]; total: number }> {
    let items = dbStore
      .getState()
      .exerciseSessions.filter((s) => s.patientId === patientId);

    if (options?.from) {
      items = items.filter((s) => s.startedAt >= options.from!);
    }
    if (options?.to) {
      items = items.filter((s) => s.startedAt <= options.to!);
    }

    // Sort descending by startedAt
    items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const total = items.length;
    const skip = options?.skip || 0;
    const limit = options?.limit || 50;
    const paginated = items.slice(skip, skip + limit);

    return { sessions: paginated.map((s) => ({ ...s })), total };
  },

  async findById(id: string): Promise<IExerciseSession | null> {
    const session = dbStore
      .getState()
      .exerciseSessions.find((s) => s._id === id || s.sessionId === id);
    return session ? { ...session } : null;
  },

  async list(options?: { patientId?: string; exerciseId?: string; limit?: number; skip?: number; from?: string; to?: string }): Promise<{ sessions: IExerciseSession[]; total: number }> {
    let items = dbStore.getState().exerciseSessions.slice();
    if (options?.patientId) items = items.filter((s) => s.patientId === options.patientId);
    if (options?.exerciseId) items = items.filter((s) => s.exerciseId === options.exerciseId);
    if (options?.from) items = items.filter((s) => s.startedAt >= options.from!);
    if (options?.to) items = items.filter((s) => s.startedAt <= options.to!);

    items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const total = items.length;
    const skip = options?.skip || 0;
    const limit = options?.limit || 100;
    return { sessions: items.slice(skip, skip + limit).map((s) => ({ ...s })), total };
  },

  async update(sessionId: string, updates: Partial<IExerciseSession>): Promise<IExerciseSession | null> {
    const idx = dbStore
      .getState()
      .exerciseSessions.findIndex((s) => s.sessionId === sessionId || s._id === sessionId);
    if (idx === -1) return null;
    dbStore.getState().exerciseSessions[idx] = {
      ...dbStore.getState().exerciseSessions[idx],
      ...updates,
      _id: dbStore.getState().exerciseSessions[idx]._id,
      sessionId: dbStore.getState().exerciseSessions[idx].sessionId,
      syncedAt: new Date().toISOString(),
    };
    dbStore.saveToFile();
    return { ...dbStore.getState().exerciseSessions[idx] };
  },

  async delete(sessionId: string): Promise<boolean> {
    const idx = dbStore
      .getState()
      .exerciseSessions.findIndex((s) => s.sessionId === sessionId || s._id === sessionId);
    if (idx === -1) return false;
    dbStore.getState().exerciseSessions.splice(idx, 1);
    dbStore.saveToFile();
    return true;
  },

  async create(data: Partial<IExerciseSession>): Promise<IExerciseSession> {
    const now = new Date().toISOString();
    const newSession: IExerciseSession = {
      _id: data._id || `es_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      sessionId: data.sessionId!,
      patientId: data.patientId!,
      assignedActivityId: data.assignedActivityId,
      exerciseId: data.exerciseId || 'arm_raise',
      exerciseName: data.exerciseName || 'Arm Raise',
      startedAt: data.startedAt || now,
      completedAt: data.completedAt || now,
      activeDurationSeconds: data.activeDurationSeconds || 0,
      elapsedDurationSeconds: data.elapsedDurationSeconds || 0,
      targetRepetitions: data.targetRepetitions || 0,
      completedRepetitions: data.completedRepetitions || 0,
      validRepetitions: data.validRepetitions || 0,
      completionPercentage: data.completionPercentage || 0,
      sessionStatus: data.sessionStatus || 'completed',
      relevantMetrics: data.relevantMetrics || {},
      measurementQuality: data.measurementQuality || 'high',
      patientFeedback: data.patientFeedback,
      exerciseAlgorithmVersion: data.exerciseAlgorithmVersion || '1.2.0',
      clientTimestamp: data.clientTimestamp || now,
      syncedAt: now,
      syncedFromServer: true,
    };
    dbStore.getState().exerciseSessions.push(newSession);
    dbStore.saveToFile();
    return { ...newSession };
  },
};

export const CognitiveGameSessionRepository = {
  async findBySessionId(sessionId: string): Promise<ICognitiveGameSession | null> {
    const session = dbStore.getState().cognitiveGameSessions.find((s) => s.sessionId === sessionId);
    return session ? { ...session } : null;
  },

  async findByPatientId(patientId: string, options?: { limit?: number; skip?: number; from?: string; to?: string }): Promise<{ sessions: ICognitiveGameSession[]; total: number }> {
    let items = dbStore
      .getState()
      .cognitiveGameSessions.filter((s) => s.patientId === patientId);

    if (options?.from) {
      items = items.filter((s) => s.startedAt >= options.from!);
    }
    if (options?.to) {
      items = items.filter((s) => s.startedAt <= options.to!);
    }

    items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const total = items.length;
    const skip = options?.skip || 0;
    const limit = options?.limit || 50;
    const paginated = items.slice(skip, skip + limit);

    return { sessions: paginated.map((s) => ({ ...s })), total };
  },

  async findById(id: string): Promise<ICognitiveGameSession | null> {
    const session = dbStore
      .getState()
      .cognitiveGameSessions.find((s) => s._id === id || s.sessionId === id);
    return session ? { ...session } : null;
  },

  async list(options?: { patientId?: string; gameId?: string; cognitiveDomain?: string; limit?: number; skip?: number; from?: string; to?: string }): Promise<{ sessions: ICognitiveGameSession[]; total: number }> {
    let items = dbStore.getState().cognitiveGameSessions.slice();
    if (options?.patientId) items = items.filter((s) => s.patientId === options.patientId);
    if (options?.gameId) items = items.filter((s) => s.gameId === options.gameId);
    if (options?.cognitiveDomain) items = items.filter((s) => s.cognitiveDomain === options.cognitiveDomain);
    if (options?.from) items = items.filter((s) => s.startedAt >= options.from!);
    if (options?.to) items = items.filter((s) => s.startedAt <= options.to!);

    items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const total = items.length;
    const skip = options?.skip || 0;
    const limit = options?.limit || 100;
    return { sessions: items.slice(skip, skip + limit).map((s) => ({ ...s })), total };
  },

  async update(sessionId: string, updates: Partial<ICognitiveGameSession>): Promise<ICognitiveGameSession | null> {
    const idx = dbStore
      .getState()
      .cognitiveGameSessions.findIndex((s) => s.sessionId === sessionId || s._id === sessionId);
    if (idx === -1) return null;
    dbStore.getState().cognitiveGameSessions[idx] = {
      ...dbStore.getState().cognitiveGameSessions[idx],
      ...updates,
      _id: dbStore.getState().cognitiveGameSessions[idx]._id,
      sessionId: dbStore.getState().cognitiveGameSessions[idx].sessionId,
      syncedAt: new Date().toISOString(),
    };
    dbStore.saveToFile();
    return { ...dbStore.getState().cognitiveGameSessions[idx] };
  },

  async delete(sessionId: string): Promise<boolean> {
    const idx = dbStore
      .getState()
      .cognitiveGameSessions.findIndex((s) => s.sessionId === sessionId || s._id === sessionId);
    if (idx === -1) return false;
    dbStore.getState().cognitiveGameSessions.splice(idx, 1);
    dbStore.saveToFile();
    return true;
  },

  async create(data: Partial<ICognitiveGameSession>): Promise<ICognitiveGameSession> {
    const now = new Date().toISOString();
    const newSession: ICognitiveGameSession = {
      _id: data._id || `cgs_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      sessionId: data.sessionId!,
      patientId: data.patientId!,
      assignedActivityId: data.assignedActivityId,
      gameId: data.gameId || 'memory_match',
      gameName: data.gameName || 'Memory Match',
      cognitiveDomain: data.cognitiveDomain || 'working_memory',
      startedAt: data.startedAt || now,
      completedAt: data.completedAt || now,
      durationSeconds: data.durationSeconds || 0,
      score: data.score || 0,
      accuracyPercentage: data.accuracyPercentage || 0,
      reactionTimeMs: data.reactionTimeMs,
      difficulty: data.difficulty || 'medium',
      levelReached: data.levelReached || 1,
      sessionStatus: data.sessionStatus || 'completed',
      clientTimestamp: data.clientTimestamp || now,
      syncedAt: now,
      syncedFromServer: true,
    };
    dbStore.getState().cognitiveGameSessions.push(newSession);
    dbStore.saveToFile();
    return { ...newSession };
  },
};

export const RefreshTokenRepository = {
  async create(data: Partial<IRefreshToken>): Promise<IRefreshToken> {
    const now = new Date().toISOString();
    const token: IRefreshToken = {
      _id: `rt_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      tokenHash: data.tokenHash!,
      userId: data.userId!,
      expiresAt: data.expiresAt!,
      revoked: false,
      replacedByTokenHash: data.replacedByTokenHash,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: now,
    };
    dbStore.getState().refreshTokens.push(token);
    dbStore.saveToFile();
    return { ...token };
  },

  async findByHash(tokenHash: string): Promise<IRefreshToken | null> {
    const found = dbStore.getState().refreshTokens.find((t) => t.tokenHash === tokenHash);
    return found ? { ...found } : null;
  },

  async revoke(tokenHash: string, replacedByHash?: string): Promise<boolean> {
    const token = dbStore.getState().refreshTokens.find((t) => t.tokenHash === tokenHash);
    if (!token) return false;
    token.revoked = true;
    if (replacedByHash) {
      token.replacedByTokenHash = replacedByHash;
    }
    dbStore.saveToFile();
    return true;
  },

  async revokeAllForUser(userId: string): Promise<number> {
    let count = 0;
    for (const token of dbStore.getState().refreshTokens) {
      if (token.userId === userId && !token.revoked) {
        token.revoked = true;
        count++;
      }
    }
    if (count > 0) dbStore.saveToFile();
    return count;
  },
};
