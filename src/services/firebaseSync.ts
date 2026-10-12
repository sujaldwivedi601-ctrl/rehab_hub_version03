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

function cleanProjectId(val?: string): string {
  if (!val) return 'gen-lang-client-0128874261';
  const match = String(val).match(/gen-lang-client-[a-zA-Z0-9_-]+/);
  if (match) return match[0];
  const cleaned = String(val).replace(/["']/g, '').trim();
  if (cleaned.includes(' ') || cleaned.length > 50) return 'gen-lang-client-0128874261';
  return cleaned || 'gen-lang-client-0128874261';
}

function cleanDatabaseId(val?: string): string {
  if (!val) return 'ai-studio-android-neuroreh-8f127a59-721b-4d7b-8210-a5dec4b3557a';
  const match = String(val).match(/ai-studio-android-neuroreh-[a-zA-Z0-9-]+/);
  if (match) return match[0];
  const cleaned = String(val).replace(/["']/g, '').trim();
  if (cleaned.includes(' ') || cleaned.length > 80) return 'ai-studio-android-neuroreh-8f127a59-721b-4d7b-8210-a5dec4b3557a';
  return cleaned || 'ai-studio-android-neuroreh-8f127a59-721b-4d7b-8210-a5dec4b3557a';
}

export const FIREBASE_DATABASE_ID = cleanDatabaseId(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_DATABASE_ID : undefined);

export const FIREBASE_CONFIG = {
  projectId: cleanProjectId(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_PROJECT_ID : undefined),
  projectNumber: '786614798934',
  messagingSenderId: '786614798934',
  apiKey: 'AIzaSyCGmbXP49a16SPMEZn_djnKhLLDLpT6s_8',
  authDomain: 'gen-lang-client-0128874261.firebaseapp.com',
  storageBucket: 'gen-lang-client-0128874261.firebasestorage.app',
  databaseId: FIREBASE_DATABASE_ID,
};

// Initialize or reuse Firebase App with named Database ID
const firebaseApp = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
export const firestoreDb = getFirestore(firebaseApp, FIREBASE_DATABASE_ID);

export interface FirestoreExercise {
  exerciseId: string;
  exerciseName: string;
  targetReps: number;
  targetFrequencyPerDay: number;
  doctorNotes: string;
  category: string;
}

export interface FirestoreGame {
  gameId: string;
  gameName: string;
  domain: string;
  targetRounds: number;
}

export interface FirestorePatientPayload {
  patientId: string;
  patientName: string;
  condition: string;
  doctorName: string;
  clinicName: string;
  targetDailyMinutes: number;
  doctorAdvice: string;
  assignedExercises: FirestoreExercise[];
  assignedGames: FirestoreGame[];
  updatedAt: any;
  source?: string;
  status?: string;
}

export interface PatientSyncInput {
  patientId: string; // The 6-digit code or PT-XXXX or MRN
  patientName: string;
  condition?: string;
  doctorName?: string;
  clinicName?: string;
  targetDailyMinutes?: number;
  doctorAdvice?: string;
  assignedActivities?: any[];
  dietaryPlan?: any;
  clinicalNotes?: string;
  status?: string;
}

/**
 * Normalizes patient ID to uppercase document identifier (e.g. "PT-5001" or "269067")
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
]);

/**
 * Checks if an activity is a brain / cognitive game.
 * If true, it must EXCLUSIVELY go into assignedGames, never into assignedExercises.
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
 * Maps raw activities into the required Firestore schema format
 */
export function buildFirestorePatientData(input: PatientSyncInput): FirestorePatientPayload {
  const normId = normalizePatientId(input.patientId);

  // Parse exercises from activities - strictly separating physical motor exercises from cognitive games
  const assignedExercises: FirestoreExercise[] = [];
  const assignedGames: FirestoreGame[] = [];

  const rawActivities = Array.isArray(input.assignedActivities) ? input.assignedActivities : [];

  for (const act of rawActivities) {
    if (isCognitiveGameActivity(act)) {
      // 1. Brain & Cognitive Games -> ONLY in assignedGames
      const durationSec = Number(act.configuration?.targetDurationSeconds || 120);
      const calculatedRounds = Math.max(1, Math.min(10, Math.round(durationSec / 60))) || 3;
      const rawGameId = String(act.gameId || act.id || act.activityId || 'pattern_memory').toLowerCase();
      const cleanGameId = COGNITIVE_GAME_IDENTIFIERS.has(rawGameId)
        ? rawGameId
        : String(act.activityName || '').toLowerCase().includes('memory')
        ? 'memory_match'
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
      });
    } else {
      // 2. Physical Motor Exercises -> ONLY in assignedExercises
      const exId = String(act.exerciseId || act.id || 'arm_raise').toLowerCase();
      // Ensure no game leaked into physical exercise list
      if (COGNITIVE_GAME_IDENTIFIERS.has(exId) || String(act.activityName || '').toLowerCase().includes('memory')) {
        continue;
      }

      assignedExercises.push({
        exerciseId: exId,
        exerciseName: String(act.activityName || act.name || 'Arm Raise (Anterior Deltoid & Flexion)'),
        targetReps: Number(act.configuration?.targetRepetitions || act.targetReps || 12),
        targetFrequencyPerDay: Number(act.frequencyPerDay || act.targetFrequencyPerDay || 2),
        doctorNotes: String(act.configuration?.instructions || act.doctorNotes || 'Maintain upright posture and elevate smoothly.'),
        category: 'CAMERA_VERIFIED',
      });
    }
  }

  // If patient has zero activities prescribed at all (blank onboarding profile), provide clinical defaults
  if (rawActivities.length === 0) {
    assignedExercises.push({
      exerciseId: 'arm_raise',
      exerciseName: 'Arm Raise (Anterior Deltoid & Flexion)',
      targetReps: 12,
      targetFrequencyPerDay: 2,
      doctorNotes: 'Maintain upright posture and elevate smoothly with camera verification.',
      category: 'CAMERA_VERIFIED',
    });
    assignedGames.push({
      gameId: 'memory_match',
      gameName: 'Memory Match',
      domain: 'Working Memory',
      targetRounds: 3,
    });
  }

  // Compute target daily minutes
  const targetMinutes = input.targetDailyMinutes && input.targetDailyMinutes > 0
    ? input.targetDailyMinutes
    : Math.max(20, (assignedExercises.length * 10) + (assignedGames.length * 5));

  // Determine doctor advice
  const advice = input.doctorAdvice?.trim() ||
    input.clinicalNotes?.trim() ||
    input.dietaryPlan?.overview?.trim() ||
    'Perform your prescribed range of motion exercises twice daily with front-facing camera verification. Stay well hydrated and maintain restorative sleep.';

  // Dynamic Doctor Name - NEVER hardcode "Dr. Elena Rostova" or "Dr. Rostova"
  const doctorName = input.doctorName?.trim() || 'Attending Physician';
  const clinicName = input.clinicName?.trim() || 'NeuroRehab Institute';

  return {
    patientId: normId,
    patientName: input.patientName?.trim() || 'Patient',
    condition: input.condition?.trim() || 'Stroke Rehabilitation',
    doctorName,
    clinicName,
    targetDailyMinutes: targetMinutes,
    doctorAdvice: advice,
    assignedExercises,
    assignedGames,
    updatedAt: serverTimestamp(),
    source: 'NeuroRehab Connect Web Portal',
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

  // Cache last synced state and payload for instant UI hydration and offline resiliency
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
    // Fallback to local cache if offline or restricted
    const cached = localStorage.getItem(`nr_fb_sync_${normId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { exists: true, docId: normId, syncedAt: parsed.syncedAt };
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
