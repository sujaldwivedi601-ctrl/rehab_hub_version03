import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

let db: any = null;
try {
  const APP_NAME = 'neurorehab-server-app';
  const app = getApps().some((a) => a.name === APP_NAME)
    ? getApp(APP_NAME)
    : initializeApp(FIREBASE_CONFIG, APP_NAME);
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
  sessionAlarmTime?: string;
  targetDailyMinutes?: number;
  doctorAdvice?: string;
  assignedActivities?: any[];
  dietaryPlan?: any;
  status?: string;
  todayProgress?: {
    completedExercisesCount?: number;
    totalPrescribedExercises?: number;
    completedGamesCount?: number;
    totalPrescribedGames?: number;
    lastCompletedName?: string;
    lastCompletedAt?: string;
  };
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

export async function syncPatientToFirestoreServer(params: SyncPatientParams): Promise<{ success: boolean; docId: string; error?: string }> {
  const rawId = String(params.patientId || '').trim();
  if (!rawId) {
    return { success: false, docId: '', error: 'Missing patientId' };
  }
  const docId = rawId.toUpperCase();

  try {
    if (!db) {
      const APP_NAME = 'neurorehab-server-app';
      const app = getApps().some((a) => a.name === APP_NAME)
        ? getApp(APP_NAME)
        : initializeApp(FIREBASE_CONFIG, APP_NAME);
      db = getFirestore(app, FIREBASE_DATABASE_ID);
    }

    const assignedExercises: any[] = [];
    const assignedGames: any[] = [];
    const sessionAlarmTime = params.sessionAlarmTime || '08:00 AM';

    const activities = Array.isArray(params.assignedActivities) ? params.assignedActivities : [];

    for (const act of activities) {
      if (isCognitiveGameActivity(act)) {
        // 1. Brain & Cognitive Games -> ONLY into assignedGames
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
        // 2. Physical Motor Exercises -> ONLY into assignedExercises
        const exName = String(act.activityName || act.name || '').trim();
        const exId = String(act.exerciseId || act.id || '').toLowerCase().trim();

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
          targetFrequencyPerDay: 1,
          doctorNotes: String(act.configuration?.instructions || act.doctorNotes || 'Perform at the prescribed 8:00 AM session with camera ML tracking.'),
          category: 'CAMERA_VERIFIED',
          sessionTime: sessionAlarmTime,
        });
      }
    }

    if (assignedExercises.length === 0 && assignedGames.length === 0) {
      assignedExercises.push({
        exerciseId: 'arm_raise',
        exerciseName: 'Arm Raise (Anterior Deltoid & Flexion)',
        targetReps: 15,
        targetFrequencyPerDay: 1,
        doctorNotes: 'Maintain upright posture and elevate arm smoothly with camera verification.',
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

    const targetMinutes = params.targetDailyMinutes && params.targetDailyMinutes > 0
      ? params.targetDailyMinutes
      : Math.max(20, (assignedExercises.length * 8) + (assignedGames.length * 5));

    const advice = params.doctorAdvice?.trim() ||
      params.dietaryPlan?.overview?.trim() ||
      'Perform your prescribed exercises at the scheduled morning alarm time with front camera verification. Stay hydrated and rest well.';

    // Dynamic Doctor Name - NEVER hardcode "Dr. Elena Rostova" or "Dr. Rostova"
    let doctorName = (params.doctorName || '').trim();
    if (!doctorName || doctorName.toLowerCase().includes('rostova') || doctorName.toLowerCase().includes('elena')) {
      doctorName = 'Dr. Riya Kewt, MD';
    }

    const clinicName = params.clinicName?.trim() || 'Metro Neurosciences Center';

    const payload = {
      patientId: docId,
      patientName: params.patientName?.trim() || 'Patient',
      condition: params.condition?.trim() || 'Stroke Rehabilitation',
      doctorName,
      clinicName,
      sessionAlarmTime,
      alarmHour: 8,
      alarmMinute: 0,
      targetDailyMinutes: targetMinutes,
      doctorAdvice: advice,
      assignedExercises,
      assignedGames,
      todayProgress: {
        completedExercisesCount: params.todayProgress?.completedExercisesCount ?? 0,
        totalPrescribedExercises: assignedExercises.length,
        completedGamesCount: params.todayProgress?.completedGamesCount ?? 0,
        totalPrescribedGames: assignedGames.length,
        lastCompletedName: params.todayProgress?.lastCompletedName || undefined,
        lastCompletedAt: params.todayProgress?.lastCompletedAt || undefined,
        liveStatus: (params.todayProgress?.completedExercisesCount ?? 0) > 0 ? 'in_progress' : 'idle',
      },
      updatedAt: serverTimestamp(),
      source: 'NeuroRehab Connect Shared Backend',
      status: params.status || 'active',
    };

    const docRef = doc(db, 'patients', docId);
    await setDoc(docRef, payload, { merge: true });

    console.log(`[Firebase Server Sync] Successfully synced patient ${docId} to mobile app collection 'patients' (DB: ${FIREBASE_DATABASE_ID}) with doctorName="${doctorName}" and alarm="${sessionAlarmTime}"`);
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

      let docName = (requestingDoctorName || doctorUser?.name || '').trim();
      if (!docName || docName.toLowerCase().includes('rostova') || docName.toLowerCase().includes('elena')) {
        docName = 'Dr. Riya Kewt, MD';
      }

      const clName = requestingClinicName?.trim() || doctorUser?.hospital?.trim() || 'Metro Neurosciences Center';

      const syncRes = await syncPatientToFirestoreServer({
        patientId: targetId,
        patientName: user.name,
        condition: prof.primaryDiagnosis,
        doctorName: docName,
        clinicName: clName,
        sessionAlarmTime: '08:00 AM',
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
