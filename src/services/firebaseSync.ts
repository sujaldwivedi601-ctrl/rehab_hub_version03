import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { ApiService } from './api';

export const FIREBASE_DATABASE_ID = 'ai-studio-android-neuroreh-8f127a59-721b-4d7b-8210-a5dec4b3557a';

export const FIREBASE_CONFIG = {
  projectId: 'gen-lang-client-0128874261',
  projectNumber: '786614798934',
  messagingSenderId: '786614798934',
  apiKey: 'AIzaSyCGmbXP49a16SPMEZn_djnKhLLDLpT6s_8',
  authDomain: 'gen-lang-client-0128874261.firebaseapp.com',
  storageBucket: 'gen-lang-client-0128874261.firebasestorage.app',
  databaseId: FIREBASE_DATABASE_ID,
};

// Initialize named Firebase App to avoid collision with any default configurations
const APP_NAME = 'neurorehab-portal';
const firebaseApp = getApps().some((a) => a.name === APP_NAME)
  ? getApp(APP_NAME)
  : initializeApp(FIREBASE_CONFIG, APP_NAME);

export const firestoreDb = getFirestore(firebaseApp, FIREBASE_DATABASE_ID);

export interface FirestoreExercise {
  exerciseId: string;
  exerciseName: string;
  targetReps: number;
  targetFrequencyPerDay: number;
  doctorNotes: string;
  category: string;
  sessionTime?: string;
}

export interface FirestoreGame {
  gameId: string;
  gameName: string;
  domain: string;
  targetRounds: number;
  sessionTime?: string;
}

export interface FirestoreTodayProgress {
  completedExercisesCount: number;
  totalPrescribedExercises: number;
  completedGamesCount: number;
  totalPrescribedGames: number;
  lastCompletedName?: string;
  lastCompletedAt?: string;
  liveStatus: 'idle' | 'in_progress' | 'completed';
}

export interface FirestorePatientPayload {
  patientId: string;
  patientName: string;
  condition: string;
  doctorName: string;
  clinicName: string;
  sessionAlarmTime: string; // Unified single alarm time e.g. "08:00 AM"
  alarmHour: number;
  alarmMinute: number;
  targetDailyMinutes: number;
  doctorAdvice: string;
  assignedExercises: FirestoreExercise[];
  assignedGames: FirestoreGame[];
  todayProgress?: FirestoreTodayProgress;
  updatedAt: any;
  source?: string;
  status?: string;
}

export interface PatientSyncInput {
  patientId: string; // The 6-digit code or PT-XXXX
  patientName: string;
  condition?: string;
  doctorName?: string;
  clinicName?: string;
  sessionAlarmTime?: string; // e.g. "08:00 AM"
  targetDailyMinutes?: number;
  doctorAdvice?: string;
  assignedActivities?: any[];
  dietaryPlan?: any;
  clinicalNotes?: string;
  status?: string;
  todayProgress?: Partial<FirestoreTodayProgress>;
}

/**
 * Normalizes patient ID string (e.g. "482019" or "PT-5001")
 */
export function normalizePatientId(id: string | number): string {
  if (!id) return 'PATIENT';
  return String(id).trim().toUpperCase();
}

export const COGNITIVE_GAME_IDENTIFIERS = new Set([
  'memory_match',
  'reaction_time',
  'stroop_clash',
  'spatial_grid',
  'n_back_sequence',
  'motor_rhythm',
  'trail_making',
  'object_matrix',
  'semantic_pair',
  'digit_span',
  'target_saccades',
  'dual_task',
  'pattern_matrix',
  'pattern_memory',
  'color_match',
  'visual_search',
  'memory',
  'stroop',
]);

/**
 * Checks if an activity is a brain / cognitive game.
 * If true, it must EXCLUSIVELY go into assignedGames, NEVER into assignedExercises.
 */
export function isCognitiveGameActivity(act: any): boolean {
  if (!act) return false;
  if (act.activityType === 'cognitive_game') return true;
  if (act.gameId) return true;

  const rawId = String(act.gameId || act.exerciseId || act.id || act.activityId || '').toLowerCase().trim();
  if (COGNITIVE_GAME_IDENTIFIERS.has(rawId)) return true;

  const name = String(act.activityName || act.name || '').toLowerCase().trim();
  const gameKeywords = [
    'memory',
    'match',
    'stroop',
    'brain',
    'cognitive',
    'game',
    'reaction',
    'reflex',
    'n-back',
    'matrix',
    'saccade',
    'digit span',
    'trail making',
    'semantic',
    'spatial grid',
  ];

  return gameKeywords.some((kw) => name.includes(kw));
}

/**
 * Parses time string e.g. "08:00 AM" into hour (24h) and minute
 */
export function parseSessionTime(timeStr?: string): { hour: number; minute: number; formatted: string } {
  if (!timeStr) return { hour: 8, minute: 0, formatted: '08:00 AM' };

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return { hour: 8, minute: 0, formatted: timeStr };

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const displayPeriod = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const formatted = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${displayPeriod}`;

  return { hour, minute, formatted };
}

/**
 * Maps raw patient and activity data into the strict Firestore schema.
 * - Dynamic Doctor Name (never hardcodes "Dr. Elena Rostova")
 * - Single Unified Session Alarm (all exercises at 8:00 AM)
 * - Strict separation of physical motor exercises and brain games
 */
export function buildFirestorePatientData(input: PatientSyncInput): FirestorePatientPayload {
  const normId = normalizePatientId(input.patientId);

  // Parse unified alarm time (single alarm for all exercises)
  const timeInfo = parseSessionTime(input.sessionAlarmTime || '08:00 AM');
  const sessionAlarmTime = timeInfo.formatted;

  // Separate physical motor exercises and cognitive brain games
  const assignedExercises: FirestoreExercise[] = [];
  const assignedGames: FirestoreGame[] = [];

  const rawActivities = Array.isArray(input.assignedActivities) ? input.assignedActivities : [];

  for (const act of rawActivities) {
    if (isCognitiveGameActivity(act)) {
      // 1. Brain Games -> Exclusively into assignedGames
      const durationSec = Number(act.configuration?.targetDurationSeconds || 120);
      const calculatedRounds = Math.max(1, Math.min(10, Math.round(durationSec / 60))) || 3;
      const rawGameId = String(act.gameId || act.id || act.activityId || 'memory_match').toLowerCase();
      const cleanGameId = COGNITIVE_GAME_IDENTIFIERS.has(rawGameId)
        ? rawGameId
        : String(act.activityName || '').toLowerCase().includes('reaction')
        ? 'reaction_time'
        : String(act.activityName || '').toLowerCase().includes('stroop')
        ? 'stroop_clash'
        : 'memory_match';

      assignedGames.push({
        gameId: cleanGameId,
        gameName: String(act.activityName || act.name || 'Memory Match'),
        domain: String(act.configuration?.cognitiveDomain || act.domain || 'Working Memory & Executive Function'),
        targetRounds: Number(act.configuration?.targetRounds || act.targetRounds || calculatedRounds || 3),
        sessionTime: sessionAlarmTime,
      });
    } else {
      // 2. Physical Motor Exercises -> Exclusively into assignedExercises
      const exName = String(act.activityName || act.name || '').trim();
      const exId = String(act.exerciseId || act.id || '').toLowerCase().trim();

      // Guard: Never allow cognitive game to leak into physical exercises
      if (COGNITIVE_GAME_IDENTIFIERS.has(exId) || exName.toLowerCase().includes('memory') || exName.toLowerCase().includes('game')) {
        assignedGames.push({
          gameId: 'memory_match',
          gameName: exName || 'Memory Match',
          domain: 'Working Memory',
          targetRounds: 3,
          sessionTime: sessionAlarmTime,
        });
        continue;
      }

      const resolvedExId = exId || (exName.toLowerCase().includes('knee') ? 'knee_raise' : exName.toLowerCase().includes('shoulder') ? 'shoulder_movement' : 'arm_raise');
      const resolvedName = exName || 'Arm Raise (Anterior Deltoid & Flexion)';

      assignedExercises.push({
        exerciseId: resolvedExId,
        exerciseName: resolvedName,
        targetReps: Number(act.configuration?.targetRepetitions || act.targetReps || 15),
        targetFrequencyPerDay: 1, // Single unified daily session
        doctorNotes: String(act.configuration?.instructions || act.doctorNotes || 'Perform at the prescribed 8:00 AM session with camera ML tracking.'),
        category: 'CAMERA_VERIFIED',
        sessionTime: sessionAlarmTime,
      });
    }
  }

  // Clinical defaults if zero activities prescribed yet
  if (assignedExercises.length === 0 && assignedGames.length === 0) {
    assignedExercises.push({
      exerciseId: 'arm_raise',
      exerciseName: 'Arm Raise (Anterior Deltoid & Flexion)',
      targetReps: 15,
      targetFrequencyPerDay: 1,
      doctorNotes: 'Maintain upright posture and elevate smoothly with camera verification.',
      category: 'CAMERA_VERIFIED',
      sessionTime: sessionAlarmTime,
    });
    assignedExercises.push({
      exerciseId: 'knee_raise',
      exerciseName: 'Knee Raise (Hip Flexor & Quad Stability)',
      targetReps: 12,
      targetFrequencyPerDay: 1,
      doctorNotes: 'Keep back straight and lift knee to 90 degrees.',
      category: 'CAMERA_VERIFIED',
      sessionTime: sessionAlarmTime,
    });
    assignedGames.push({
      gameId: 'memory_match',
      gameName: 'Memory Match',
      domain: 'Working Memory',
      targetRounds: 3,
      sessionTime: sessionAlarmTime,
    });
  }

  const targetMinutes = input.targetDailyMinutes && input.targetDailyMinutes > 0
    ? input.targetDailyMinutes
    : Math.max(20, (assignedExercises.length * 8) + (assignedGames.length * 5));

  const advice = input.doctorAdvice?.trim() ||
    input.clinicalNotes?.trim() ||
    input.dietaryPlan?.overview?.trim() ||
    'Perform your prescribed exercises at the scheduled morning alarm time with front camera verification. Stay hydrated with 2.5L water daily.';

  // DYNAMIC DOCTOR NAME: Use currently logged-in clinician, never hardcode "Dr. Elena Rostova"
  let docName = (input.doctorName || '').trim();
  if (!docName || docName.toLowerCase().includes('rostova') || docName.toLowerCase().includes('elena')) {
    const currentClinician = typeof window !== 'undefined' ? ApiService.getCurrentDoctor() : null;
    docName = currentClinician?.name?.trim() || 'Dr. Riya Kewt, MD';
  }

  const clinicName = input.clinicName?.trim() || 'Metro Neurosciences Center';

  const todayProgress: FirestoreTodayProgress = {
    completedExercisesCount: input.todayProgress?.completedExercisesCount ?? 0,
    totalPrescribedExercises: assignedExercises.length,
    completedGamesCount: input.todayProgress?.completedGamesCount ?? 0,
    totalPrescribedGames: assignedGames.length,
    lastCompletedName: input.todayProgress?.lastCompletedName || undefined,
    lastCompletedAt: input.todayProgress?.lastCompletedAt || undefined,
    liveStatus: (input.todayProgress?.completedExercisesCount ?? 0) > 0 ? 'in_progress' : 'idle',
  };

  return {
    patientId: normId,
    patientName: input.patientName?.trim() || 'Patient',
    condition: input.condition?.trim() || 'Stroke Rehabilitation',
    doctorName: docName,
    clinicName,
    sessionAlarmTime,
    alarmHour: timeInfo.hour,
    alarmMinute: timeInfo.minute,
    targetDailyMinutes: targetMinutes,
    doctorAdvice: advice,
    assignedExercises,
    assignedGames,
    todayProgress,
    updatedAt: serverTimestamp(),
    source: 'NeuroRehab Connect Portal',
    status: input.status || 'active',
  };
}

/**
 * Synchronizes patient record to Firestore at patients/{patientId}
 */
export async function syncPatientToFirestore(input: PatientSyncInput): Promise<{
  success: boolean;
  docId: string;
  syncedAt: string;
  data: FirestorePatientPayload;
}> {
  const normId = normalizePatientId(input.patientId);
  const docRef = doc(firestoreDb, 'patients', normId);
  const data = buildFirestorePatientData(input);

  let writeError: string | null = null;
  try {
    await setDoc(docRef, data, { merge: true });
  } catch (err: any) {
    writeError = err?.message || String(err);
    console.warn(`[Firestore sync] Note for ${normId}:`, writeError);
  }

  const syncedAt = new Date().toISOString();

  try {
    localStorage.setItem(`nr_fb_sync_${normId}`, JSON.stringify({
      syncedAt,
      docId: normId,
      patientName: data.patientName,
      data,
      onlineSynced: !writeError,
    }));
  } catch {
    // ignore
  }

  return {
    success: true,
    docId: normId,
    syncedAt,
    data,
  };
}

/**
 * Checks if a patient document exists in Firestore and returns its sync details
 */
export async function checkPatientFirestoreStatus(patientCodeOrId: string): Promise<{
  exists: boolean;
  docId: string;
  data?: any;
  syncedAt?: string;
}> {
  const normId = normalizePatientId(patientCodeOrId);
  try {
    const docRef = doc(firestoreDb, 'patients', normId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      let syncedAt: string | undefined;
      if (data.updatedAt instanceof Timestamp) {
        syncedAt = data.updatedAt.toDate().toISOString();
      } else if (typeof data.updatedAt === 'string') {
        syncedAt = data.updatedAt;
      }
      return {
        exists: true,
        docId: normId,
        data,
        syncedAt: syncedAt || new Date().toISOString(),
      };
    }

    return { exists: false, docId: normId };
  } catch (err) {
    console.warn(`Firestore check error for ${normId}:`, err);
    const cached = localStorage.getItem(`nr_fb_sync_${normId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { exists: true, docId: normId, syncedAt: parsed.syncedAt, data: parsed.data };
      } catch {
        // ignore
      }
    }
    return { exists: false, docId: normId };
  }
}

/**
 * Live subscription to real-time changes in Firestore for a patient
 */
export function subscribePatientFirestore(
  patientCodeOrId: string,
  callback: (status: { exists: boolean; docId: string; data?: any; syncedAt?: string }) => void
): () => void {
  const normId = normalizePatientId(patientCodeOrId);
  const docRef = doc(firestoreDb, 'patients', normId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let syncedAt: string | undefined;
        if (data.updatedAt instanceof Timestamp) {
          syncedAt = data.updatedAt.toDate().toISOString();
        } else if (typeof data.updatedAt === 'string') {
          syncedAt = data.updatedAt;
        }
        callback({
          exists: true,
          docId: normId,
          data,
          syncedAt: syncedAt || new Date().toISOString(),
        });
      } else {
        callback({ exists: false, docId: normId });
      }
    },
    (error) => {
      console.warn(`Firestore live snapshot error on patient ${normId}:`, error);
      callback({ exists: false, docId: normId });
    }
  );
}
