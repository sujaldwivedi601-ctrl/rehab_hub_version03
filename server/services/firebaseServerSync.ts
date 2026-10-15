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
  prescribedTime?: string;
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
          ? 'g2_reaction_time'
          : String(act.activityName || '').toLowerCase().includes('stroop')
          ? 'stroop_clash'
          : 'g1_memory_match';

        const defaultObj = cleanGameId.includes('memory')
          ? 'Select matching pairs of hidden cards to enhance working recall.'
          : cleanGameId.includes('reaction')
          ? 'Tap rapidly after random delay triggers to measure processing latency.'
          : 'Complete cognitive challenges to stimulate neuroplasticity.';

        assignedGames.push({
          gameId: cleanGameId.startsWith('g1_') || cleanGameId.startsWith('g2_') ? cleanGameId : (cleanGameId === 'memory_match' ? 'g1_memory_match' : cleanGameId === 'reaction_time' ? 'g2_reaction_time' : cleanGameId),
          gameName: String(act.activityName || act.name || 'Memory Match'),
          domain: String(act.configuration?.cognitiveDomain || act.domain || (cleanGameId.includes('memory') ? 'Short-term Memory' : 'Neural Reflexes')),
          targetRounds: Number(act.configuration?.targetRounds || act.targetRounds || calculatedRounds || 2),
          clinicalObjective: String(act.clinicalObjective || act.configuration?.clinicalObjective || defaultObj),
          sessionTime: sessionAlarmTime,
        });
      } else {
        // 2. Physical Motor Exercises -> ONLY into assignedExercises
        const exName = String(act.activityName || act.name || '').trim();
        const exId = String(act.exerciseId || act.id || '').toLowerCase().trim();

        if (COGNITIVE_GAME_IDENTIFIERS.has(exId) || exName.toLowerCase().includes('memory') || exName.toLowerCase().includes('game')) {
          assignedGames.push({
            gameId: 'g1_memory_match',
            gameName: exName || 'Memory Match',
            domain: 'Short-term Memory',
            targetRounds: 2,
            clinicalObjective: 'Select matching pairs of hidden cards to enhance working recall.',
            sessionTime: sessionAlarmTime,
          });
          continue;
        }

        const resolvedExId = exId || (exName.toLowerCase().includes('knee') ? 'knee_raise' : exName.toLowerCase().includes('elbow') ? 'elbow_flexion' : exName.toLowerCase().includes('shoulder') ? 'shoulder_movement' : 'arm_raise');
        const resolvedName = exName || 'Arm Raise';

        const defaultNote = resolvedExId === 'arm_raise'
          ? 'Focus on controlled elevation, hold at peak height for 2 seconds.'
          : resolvedExId === 'knee_raise'
          ? 'Maintain balance near a sturdy wall or chair.'
          : resolvedExId === 'elbow_flexion'
          ? 'Perform smooth full curling motion.'
          : resolvedExId === 'shoulder_movement'
          ? 'Keep motion within active pain-free arc.'
          : 'Perform smoothly with front camera verification.';

        assignedExercises.push({
          exerciseId: resolvedExId,
          exerciseName: resolvedName,
          targetReps: Number(act.configuration?.targetRepetitions || act.targetReps || 10),
          doctorNotes: String(act.configuration?.instructions || act.doctorNotes || defaultNote),
          targetFrequencyPerDay: 1,
          category: act.category || act.configuration?.category || (resolvedExId === 'shoulder_movement' ? 'GUIDED_TIMER' : 'CAMERA_VERIFIED'),
          sessionTime: sessionAlarmTime,
        });
      }
    }

    if (assignedExercises.length === 0 && assignedGames.length === 0) {
      assignedExercises.push({
        exerciseId: 'arm_raise',
        exerciseName: 'Arm Raise',
        targetReps: 10,
        doctorNotes: 'Focus on controlled elevation, hold at peak height for 2 seconds.',
        targetFrequencyPerDay: 1,
        category: 'CAMERA_VERIFIED',
        sessionTime: sessionAlarmTime,
      });
      assignedExercises.push({
        exerciseId: 'knee_raise',
        exerciseName: 'Knee Raise',
        targetReps: 12,
        doctorNotes: 'Maintain balance near a sturdy wall or chair.',
        targetFrequencyPerDay: 1,
        category: 'CAMERA_VERIFIED',
        sessionTime: sessionAlarmTime,
      });
      assignedExercises.push({
        exerciseId: 'elbow_flexion',
        exerciseName: 'Elbow Flexion',
        targetReps: 10,
        doctorNotes: 'Perform smooth full curling motion.',
        targetFrequencyPerDay: 1,
        category: 'CAMERA_VERIFIED',
        sessionTime: sessionAlarmTime,
      });
      assignedExercises.push({
        exerciseId: 'shoulder_movement',
        exerciseName: 'Shoulder Movement',
        targetReps: 8,
        doctorNotes: 'Keep motion within active pain-free arc.',
        targetFrequencyPerDay: 1,
        category: 'GUIDED_TIMER',
        sessionTime: sessionAlarmTime,
      });

      assignedGames.push({
        gameId: 'g1_memory_match',
        gameName: 'Memory Match',
        domain: 'Short-term Memory',
        targetRounds: 2,
        clinicalObjective: 'Select matching pairs of hidden cards to enhance working recall.',
        sessionTime: sessionAlarmTime,
      });
      assignedGames.push({
        gameId: 'g2_reaction_time',
        gameName: 'Reaction Time',
        domain: 'Neural Reflexes',
        targetRounds: 3,
        clinicalObjective: 'Tap rapidly after random delay triggers to measure processing latency.',
        sessionTime: sessionAlarmTime,
      });
    }

    const targetMinutes = params.targetDailyMinutes && params.targetDailyMinutes > 0
      ? params.targetDailyMinutes
      : 30;

    const advice = params.doctorAdvice?.trim() ||
      params.dietaryPlan?.overview?.trim() ||
      'Complete daily prescribed camera exercise repetitions and cognitive games in good lighting.';

    const doctorName = (params.doctorName || '').trim() || 'Dr. Elena Rostova, PT, DPT';
    const clinicName = (params.clinicName || '').trim() || 'NeuroRehab Institute';
    const condition = params.condition?.trim() || 'Post-Stroke Motor & Cognitive Recovery';
    const prescribedTime = params.prescribedTime || params.sessionAlarmTime || '10:30 AM';

    // Parse hour and minute from prescribedTime string
    let parsedHour = 10;
    let parsedMinute = 30;
    const timeMatch = prescribedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      parsedMinute = parseInt(timeMatch[2], 10);
      const meridian = timeMatch[3]?.toUpperCase();
      if (meridian === 'PM' && h < 12) h += 12;
      if (meridian === 'AM' && h === 12) h = 0;
      parsedHour = h;
    }

    const patientRealName = params.patientName?.trim() || 'John Doe';
    const strippedCode = docId.replace(/^(PT-|MRN-)/, '');

    const payload = {
      patientId: docId,
      patientName: patientRealName,
      name: patientRealName,
      patientCode: docId,
      code: strippedCode,
      loginCode: docId,
      doctorName,
      clinicName,
      condition,
      doctorAdvice: advice,
      targetDailyMinutes: targetMinutes,
      prescribedTime,
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
      sessionAlarmTime: prescribedTime,
      alarmHour: parsedHour,
      alarmMinute: parsedMinute,
      updatedAt: serverTimestamp(),
      source: 'NeuroRehab Connect Shared Backend',
      status: params.status || 'active',
    };

    // 1. Primary write to 'patients' collection
    const docRef = doc(db, 'patients', docId);
    await setDoc(docRef, payload, { merge: true });

    // 2. Mirror writes to handle all mobile lookup variations:
    try {
      // Numerical code alias (e.g. '4028')
      if (strippedCode && strippedCode !== docId) {
        await setDoc(doc(db, 'patients', strippedCode), payload, { merge: true });
      }
      // Name slug alias (e.g. 'john_doe')
      const nameSlug = patientRealName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (nameSlug && nameSlug.length > 2) {
        await setDoc(doc(db, 'patients', nameSlug), payload, { merge: true });
      }
      // 'users' and 'prescriptions' mirror collections
      await setDoc(doc(db, 'users', docId), payload, { merge: true });
      await setDoc(doc(db, 'prescriptions', docId), payload, { merge: true });
    } catch (mirrorErr) {
      console.warn('[Firebase Server Sync] Note on mirror sync:', mirrorErr);
    }

    console.log(`[Firebase Server Sync] Successfully synced patient ${docId} (${patientRealName}) to mobile app collections (DB: ${FIREBASE_DATABASE_ID}) with doctorName="${doctorName}", clinic="${clinicName}", prescribedTime="${prescribedTime}"`);
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

      // Real doctor and clinic name preservation
      let docName = (requestingDoctorName || doctorUser?.name || '').trim();
      if (!docName) {
        docName = prof.clinicalNotes?.match(/Doctor:\s*([^.(]+)/)?.[1]?.trim() || 'Dr. Elena Rostova, PT, DPT';
      }

      const clName = requestingClinicName?.trim() || doctorUser?.hospital?.trim() || 'NeuroRehab Institute';
      const prescribedTime = plan?.activities?.[0]?.timeOfDay || '10:30 AM';

      const syncRes = await syncPatientToFirestoreServer({
        patientId: targetId,
        patientName: user.name,
        condition: prof.primaryDiagnosis,
        doctorName: docName,
        clinicName: clName,
        sessionAlarmTime: prescribedTime,
        prescribedTime,
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
