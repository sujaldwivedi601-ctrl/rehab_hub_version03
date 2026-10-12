import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

const FIREBASE_DATABASE_ID = cleanDatabaseId(process.env.VITE_FIREBASE_DATABASE_ID);

const FIREBASE_CONFIG = {
  projectId: cleanProjectId(process.env.VITE_FIREBASE_PROJECT_ID),
  projectNumber: '786614798934',
  messagingSenderId: '786614798934',
  apiKey: 'AIzaSyCGmbXP49a16SPMEZn_djnKhLLDLpT6s_8',
  authDomain: 'gen-lang-client-0128874261.firebaseapp.com',
  storageBucket: 'gen-lang-client-0128874261.firebasestorage.app',
  databaseId: FIREBASE_DATABASE_ID,
};

// Initialize server-side Firebase instance with the custom database ID
let db: any = null;
try {
  const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG, 'server-app') : getApp('server-app');
  db = getFirestore(app, FIREBASE_DATABASE_ID);
} catch (err) {
  console.warn('[Firebase Server Sync] Initialization warning:', err);
}

export interface SyncPatientParams {
  patientId: string;
  patientName: string;
  condition?: string;
  doctorName?: string;
  clinicName?: string;
  targetDailyMinutes?: number;
  doctorAdvice?: string;
  assignedActivities?: any[];
  dietaryPlan?: any;
  status?: string;
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

export async function syncPatientToFirestoreServer(params: SyncPatientParams): Promise<{ success: boolean; docId: string; error?: string }> {
  const rawId = String(params.patientId || '').trim();
  if (!rawId) {
    return { success: false, docId: '', error: 'Missing patientId' };
  }
  const docId = rawId.toUpperCase();

  try {
    if (!db) {
      const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG, 'server-app') : getApp('server-app');
      db = getFirestore(app, FIREBASE_DATABASE_ID);
    }

    const assignedExercises: any[] = [];
    const assignedGames: any[] = [];

    const activities = Array.isArray(params.assignedActivities) ? params.assignedActivities : [];

    for (const act of activities) {
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
        // Never put games into assignedExercises
        if (COGNITIVE_GAME_IDENTIFIERS.has(exId) || String(act.activityName || '').toLowerCase().includes('memory')) {
          continue;
        }

        assignedExercises.push({
          exerciseId: exId,
          exerciseName: String(act.activityName || act.name || 'Arm Raise (Anterior Deltoid & Flexion)'),
          targetReps: Number(act.configuration?.targetRepetitions || act.targetReps || 12),
          targetFrequencyPerDay: Number(act.frequencyPerDay || act.targetFrequencyPerDay || 2),
          doctorNotes: String(act.configuration?.instructions || act.doctorNotes || 'Maintain upright posture and elevate arm smoothly.'),
          category: 'CAMERA_VERIFIED',
        });
      }
    }

    // Default only if patient has zero activities at all
    if (activities.length === 0) {
      assignedExercises.push({
        exerciseId: 'arm_raise',
        exerciseName: 'Arm Raise (Anterior Deltoid & Flexion)',
        targetReps: 12,
        targetFrequencyPerDay: 2,
        doctorNotes: 'Keep arm straight and elevate smoothly without compensatory trunk leaning.',
        category: 'CAMERA_VERIFIED',
      });
      assignedGames.push({
        gameId: 'memory_match',
        gameName: 'Memory Match',
        domain: 'Working Memory',
        targetRounds: 3,
      });
    }

    const targetMinutes = params.targetDailyMinutes && params.targetDailyMinutes > 0
      ? params.targetDailyMinutes
      : Math.max(20, (assignedExercises.length * 10) + (assignedGames.length * 5));

    const advice = params.doctorAdvice?.trim() ||
      params.dietaryPlan?.overview?.trim() ||
      'Perform your prescribed range of motion exercises twice daily with front-facing camera verification. Stay well hydrated and maintain restorative sleep.';

    // Dynamic Doctor Name - NEVER hardcode "Dr. Elena Rostova" or "Dr. Rostova"
    const doctorName = params.doctorName?.trim() || 'Attending Physician';
    const clinicName = params.clinicName?.trim() || 'NeuroRehab Institute';

    const payload = {
      patientId: docId,
      patientName: params.patientName?.trim() || 'Patient',
      condition: params.condition?.trim() || 'Stroke Rehabilitation',
      doctorName,
      clinicName,
      targetDailyMinutes: targetMinutes,
      doctorAdvice: advice,
      assignedExercises,
      assignedGames,
      updatedAt: serverTimestamp(),
      source: 'NeuroRehab Connect Shared Backend',
      status: params.status || 'active',
    };

    const docRef = doc(db, 'patients', docId);
    await setDoc(docRef, payload, { merge: true });

    console.log(`[Firebase Server Sync] Successfully synced patient ${docId} to mobile app collection 'patients' (DB: ${FIREBASE_DATABASE_ID}) with doctorName="${doctorName}"`);
    return { success: true, docId };
  } catch (err: any) {
    console.error(`[Firebase Server Sync] Failed to sync patient ${docId}:`, err?.message || err);
    return { success: false, docId, error: err?.message || String(err) };
  }
}

/**
 * Synchronizes all existing patients in the database to Mobile App's Firestore
 */
export async function syncAllPatientsToFirestoreServer(requestingDoctorName?: string, requestingClinicName?: string): Promise<{
  total: number;
  synced: number;
  results: Array<{ docId: string; success: boolean }>;
}> {
  try {
    const { UserRepository, PatientProfileRepository, RehabilitationPlanRepository } = await import('../models/repositories.js');
    const profiles = await PatientProfileRepository.list();
    const results: Array<{ docId: string; success: boolean }> = [];

    for (const prof of profiles) {
      const user = await UserRepository.findById(prof.patientId);
      if (!user) continue;

      const plan = await RehabilitationPlanRepository.findActiveByPatientId(user._id);
      const doctorUser = prof.assignedDoctorIds?.[0]
        ? await UserRepository.findById(prof.assignedDoctorIds[0])
        : null;

      const targetId = user.patientCode || prof.patientCode || prof.mrn?.replace(/^MRN-/, '') || user._id;

      const docName = requestingDoctorName?.trim() || doctorUser?.name?.trim() || 'Attending Physician';
      const clName = requestingClinicName?.trim() || doctorUser?.hospital?.trim() || 'NeuroRehab Institute';

      const syncRes = await syncPatientToFirestoreServer({
        patientId: targetId,
        patientName: user.name,
        condition: prof.primaryDiagnosis,
        doctorName: docName,
        clinicName: clName,
        targetDailyMinutes: 30,
        doctorAdvice: prof.dietaryPlan?.overview || prof.clinicalNotes || plan?.notes,
        assignedActivities: plan?.activities,
        dietaryPlan: prof.dietaryPlan,
        status: user.accountStatus,
      });

      results.push({ docId: targetId.toUpperCase(), success: syncRes.success });
    }

    console.log(`[Firebase Server Sync] Synced ${results.filter((r) => r.success).length}/${results.length} patients to database ${FIREBASE_DATABASE_ID}`);
    return {
      total: results.length,
      synced: results.filter((r) => r.success).length,
      results,
    };
  } catch (err: any) {
    console.error('[Firebase Server Sync] Error in syncAllPatientsToFirestoreServer:', err);
    return { total: 0, synced: 0, results: [] };
  }
}

