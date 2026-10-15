import {
  UserRepository,
  PatientProfileRepository,
  RehabilitationPlanRepository,
  ExerciseSessionRepository,
  CognitiveGameSessionRepository,
} from '../models/repositories.js';
import { dbStore } from './connection.js';
import { hashPassword } from '../utils/jwt.js';
import { syncPatientToFirestoreServer } from '../services/firebaseServerSync.js';

export async function seedInitialData(): Promise<void> {
  await seedPt4028PatientIfMissing();

  const users = await UserRepository.list();
  if (users.length > 0) {
    const existingRiya = await UserRepository.findByEmail('dr.riya@neurorehab-connect.health');
    if (!existingRiya) {
      const defaultPasswordHash = await hashPassword('Password123!');
      await UserRepository.create({
        _id: 'doc_riya_kewt',
        name: 'Dr. Riya Kewt, MD',
        email: 'dr.riya@neurorehab-connect.health',
        passwordHash: defaultPasswordHash,
        role: 'doctor',
        accountStatus: 'active',
      });
    }
    return;
  }

  console.log('Seeding initial clinical database for NeuroRehab Connect...');

  const defaultPasswordHash = await hashPassword('Password123!');
  const tempPasswordHash = await hashPassword('Neuro#Temp9421!');

  // 1. Clinicians
  const doctor = await UserRepository.create({
    _id: 'doc_sarah_chen',
    name: 'Dr. Sarah Chen, MD (Neurology)',
    email: 'doctor.chen@neurorehab-connect.health',
    passwordHash: defaultPasswordHash,
    role: 'doctor',
    accountStatus: 'active',
  });

  const doctorRiya = await UserRepository.create({
    _id: 'doc_riya_kewt',
    name: 'Dr. Riya Kewt, MD',
    email: 'dr.riya@neurorehab-connect.health',
    passwordHash: defaultPasswordHash,
    role: 'doctor',
    accountStatus: 'active',
  });

  // 2. Active Patient Alex Rivera
  const patientAlex = await UserRepository.create({
    _id: 'usr_alex_rivera',
    name: 'Alex Rivera',
    email: 'alex.rivera@patient.neurorehab.health',
    passwordHash: defaultPasswordHash,
    role: 'patient',
    accountStatus: 'active',
    patientCode: '482019',
  });

  await PatientProfileRepository.create({
    patientId: patientAlex._id,
    patientCode: '482019',
    mrn: 'MRN-482019',
    assignedDoctorIds: [doctor._id],
    preferredLanguage: 'en',
    dateOfBirth: '1974-06-15',
    emergencyContactName: 'Elena Rivera',
    emergencyContactPhone: '+1-555-019-2834',
    primaryDiagnosis: 'Right Hemiparesis / Post-MCA Ischemic Stroke (Month 3)',
    clinicalNotes: 'Demonstrating consistent proximal shoulder recovery. Target active flexion >120 degrees without scapular compensation.',
  });

  // Alex's Active Rehabilitation Plan
  await RehabilitationPlanRepository.create({
    planId: 'PLN-ALEX-2026-V2',
    patientId: patientAlex._id,
    assignedByDoctorId: doctor._id,
    title: 'Phase II Upper Limb Motor Recovery & Cognitive Protocol',
    version: 2,
    status: 'active',
    startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    clinicalGoals: [
      'Elevate active shoulder flexion past 120 degrees without trunk tilt',
      'Improve cognitive working memory score to >80% accuracy',
      'Achieve daily compliance of 2 arm raise sessions and 1 cognitive challenge',
    ],
    activities: [
      {
        activityId: 'act_arm_raise_alex',
        activityType: 'physical_exercise',
        activityName: 'Arm Raise (Anterior Deltoid & Flexion)',
        exerciseId: 'arm_raise',
        configuration: {
          targetRepetitions: 12,
          targetRomMinAngle: 15,
          targetRomMaxAngle: 120,
          targetDurationSeconds: 180,
          cadenceRepsPerMin: 10,
          cameraOrientation: 'portrait',
          instructions: 'Face the camera in a seated or standing position. Smoothly raise your affected arm upwards while keeping your spine straight.',
        },
        scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        frequencyPerDay: 2,
        startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
        status: 'active',
      },
      {
        activityId: 'act_memory_alex',
        activityType: 'cognitive_game',
        activityName: 'Memory Match (Working Memory)',
        gameId: 'memory_match',
        configuration: {
          difficulty: 'medium',
          cognitiveDomain: 'working_memory',
          targetDurationSeconds: 120,
          instructions: 'Uncover paired clinical symbols to challenge short-term visual working memory.',
        },
        scheduledDays: ['monday', 'wednesday', 'friday'],
        frequencyPerDay: 1,
        startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
        status: 'active',
      },
      {
        activityId: 'act_reaction_alex',
        activityType: 'cognitive_game',
        activityName: 'Reaction Time (Processing Speed)',
        gameId: 'reaction_time',
        configuration: {
          difficulty: 'medium',
          cognitiveDomain: 'processing_speed',
          targetDurationSeconds: 60,
          instructions: 'Tap the target stimulus as quickly as possible upon visual cues.',
        },
        scheduledDays: ['tuesday', 'thursday'],
        frequencyPerDay: 1,
        startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
        status: 'active',
      },
    ],
    notes: 'Prescribed following in-clinic physical therapy evaluation.',
  });

  // Seed sample synchronized historical exercise sessions for Alex
  const now = Date.now();
  for (let i = 4; i >= 1; i--) {
    const sessionTime = new Date(now - i * 86400000).toISOString();
    await ExerciseSessionRepository.create({
      sessionId: `es_alex_hist_${i}`,
      patientId: patientAlex._id,
      assignedActivityId: 'act_arm_raise_alex',
      exerciseId: 'arm_raise',
      exerciseName: 'Arm Raise',
      startedAt: sessionTime,
      completedAt: new Date(new Date(sessionTime).getTime() + 145000).toISOString(),
      activeDurationSeconds: 135,
      elapsedDurationSeconds: 145,
      targetRepetitions: 12,
      completedRepetitions: 12,
      validRepetitions: 11 - (i % 2),
      completionPercentage: 100,
      sessionStatus: 'completed',
      relevantMetrics: {
        romMaxAngle: 112 + i * 2, // Steady improvement from 114 to 120
        romMinAngle: 14,
        avgCadenceRepsPerMin: 9,
        symmetryScore: 84 + i,
        formAccuracyPercentage: 88 + i * 2,
        smoothnessScore: 86 + i,
      },
      measurementQuality: 'high',
      patientFeedback: 'Arm felt less fatigued compared to last week.',
      exerciseAlgorithmVersion: '1.2.0',
      clientTimestamp: sessionTime,
    });
  }

  // Seed sample synchronized cognitive game sessions for Alex
  for (let i = 3; i >= 1; i--) {
    const gameTime = new Date(now - i * 86400000 + 3600000).toISOString();
    await CognitiveGameSessionRepository.create({
      sessionId: `cgs_alex_hist_${i}`,
      patientId: patientAlex._id,
      assignedActivityId: 'act_memory_alex',
      gameId: 'memory_match',
      gameName: 'Memory Match',
      cognitiveDomain: 'working_memory',
      startedAt: gameTime,
      completedAt: new Date(new Date(gameTime).getTime() + 85000).toISOString(),
      durationSeconds: 85,
      score: 720 + i * 50,
      accuracyPercentage: 85 + i * 3,
      reactionTimeMs: 420 - i * 20,
      difficulty: 'medium',
      levelReached: 3,
      sessionStatus: 'completed',
      clientTimestamp: gameTime,
    });
  }

  // 3. Pending Activation Patient Maya Lin
  const patientMaya = await UserRepository.create({
    _id: 'usr_maya_lin',
    name: 'Maya Lin',
    email: 'maya.lin@patient.neurorehab.health',
    passwordHash: tempPasswordHash,
    role: 'patient',
    accountStatus: 'pending_activation',
    mustChangePassword: true,
    activationCode: 'ACT-9421-8832',
    activationCodeExpiresAt: new Date(now + 14 * 86400000).toISOString(),
    patientCode: '912440',
  });

  await PatientProfileRepository.create({
    patientId: patientMaya._id,
    patientCode: '912440',
    mrn: 'MRN-912440',
    assignedDoctorIds: [doctor._id],
    preferredLanguage: 'en',
    dateOfBirth: '1989-11-23',
    primaryDiagnosis: 'Traumatic Brain Injury (TBI) motor & executive recovery',
    clinicalNotes: 'Initial discharge from acute rehab. Needs gentle onboarding with cognitive games and upper extremity mobility.',
  });

  await RehabilitationPlanRepository.create({
    planId: 'PLN-MAYA-2026-V1',
    patientId: patientMaya._id,
    assignedByDoctorId: doctor._id,
    title: 'Post-TBI Cognitive & Motor Baseline Protocol',
    version: 1,
    status: 'active',
    startDate: new Date().toISOString(),
    clinicalGoals: ['Establish daily cognitive game engagement', 'Monitor reaction time stability'],
    activities: [
      {
        activityId: 'act_maya_reaction',
        activityType: 'cognitive_game',
        activityName: 'Reaction Time (Processing Speed)',
        gameId: 'reaction_time',
        configuration: {
          difficulty: 'easy',
          cognitiveDomain: 'processing_speed',
          targetDurationSeconds: 60,
        },
        scheduledDays: ['monday', 'wednesday', 'friday'],
        frequencyPerDay: 1,
        startDate: new Date().toISOString(),
        status: 'active',
      },
    ],
  });

  console.log('Seed completed successfully: Dr. Sarah Chen, Alex Rivera (active), Maya Lin (pending activation).');
}

// Backfill a unique 6-digit `patientCode` onto any legacy patient records that
// predate the code-based access layer. The code becomes the external primary
// key used by the mobile app to resolve a patient's entire record.
export async function migratePatientCodes(): Promise<void> {
  const state = dbStore.getState();
  const used = new Set(
    state.patientProfiles.map((p) => p.patientCode).filter((c): c is string => !!c)
  );

  function extractCode(profile: any, user: any): string | null {
    const fromNotes = /6-?Digit\s*ID\s*:\s*(\d{6})/i.exec(profile?.clinicalNotes || '');
    if (fromNotes) return fromNotes[1];

    const localPart = (user?.email || '').split('@')[0] || '';
    const fromEmail = /(\d{6})/.exec(localPart);
    if (fromEmail) return fromEmail[1];

    const fromMrn = /(\d{6})/.exec(profile?.mrn || '');
    if (fromMrn) return fromMrn[1];

    return null;
  }

  let changed = false;
  for (const profile of state.patientProfiles) {
    if (profile.patientCode) continue;
    const user = state.users.find((u) => u._id === profile.patientId);

    let code = extractCode(profile, user);
    if (!code || used.has(code)) {
      do {
        code = String(Math.floor(100000 + Math.random() * 900000));
      } while (used.has(code));
    }

    profile.patientCode = code;
    used.add(code);
    if (user) user.patientCode = code;
    changed = true;
    console.log(`Assigned patient code ${code} to ${user?.name || profile.patientId}`);
  }

  if (changed) dbStore.saveToFile();
}

export async function seedPt4028PatientIfMissing(): Promise<void> {
  const state = dbStore.getState();
  const existingPatient = state.users.find((u) => u.patientCode === 'PT-4028' || u._id === 'usr_pt_4028');

  // Ensure Dr. Elena Rostova account exists
  let elenaDoc = state.users.find((u) => u._id === 'doc_elena_rostova' || u.email === 'dr.elena.rostova@neurorehab-institute.health');
  const defaultPasswordHash = await hashPassword('Password123!');
  if (!elenaDoc) {
    elenaDoc = await UserRepository.create({
      _id: 'doc_elena_rostova',
      name: 'Dr. Elena Rostova, PT, DPT',
      email: 'dr.elena.rostova@neurorehab-institute.health',
      passwordHash: defaultPasswordHash,
      role: 'doctor',
      accountStatus: 'active',
      specialty: 'Physical Therapy & Neurorehabilitation',
      hospital: 'NeuroRehab Institute',
    });
  }

  // Get all doctor IDs so PT-4028 is accessible to all logged-in doctors
  const allDoctorIds = state.users.filter((u) => u.role === 'doctor').map((u) => u._id);
  if (!allDoctorIds.includes('doc_elena_rostova')) allDoctorIds.push('doc_elena_rostova');

  if (existingPatient) {
    // Ensure PT-4028 is assigned to all current doctors in profile
    const prof = state.patientProfiles.find((p) => p.patientId === existingPatient._id || p.patientCode === 'PT-4028');
    if (prof) {
      let updated = false;
      for (const dId of allDoctorIds) {
        if (!prof.assignedDoctorIds.includes(dId)) {
          prof.assignedDoctorIds.push(dId);
          updated = true;
        }
      }
      if (updated) dbStore.saveToFile();
    }
    return;
  }

  console.log('[Seed] Seeding sample patient PT-4028 (John Doe) with exact clinical protocol...');

  const patient = await UserRepository.create({
    _id: 'usr_pt_4028',
    name: 'John Doe',
    email: 'john.doe.pt4028@patient.neurorehab.health',
    passwordHash: defaultPasswordHash,
    role: 'patient',
    accountStatus: 'active',
    patientCode: 'PT-4028',
  });

  await PatientProfileRepository.create({
    _id: 'prof_pt_4028',
    patientId: patient._id,
    patientCode: 'PT-4028',
    mrn: 'MRN-PT-4028',
    assignedDoctorIds: allDoctorIds,
    preferredLanguage: 'en',
    dateOfBirth: '1978-04-12',
    gender: 'Male',
    primaryDiagnosis: 'Post-Stroke Motor & Cognitive Recovery',
    clinicalNotes: 'Prescribing Doctor: Dr. Elena Rostova, PT, DPT (NeuroRehab Institute). Prescribed Time: 10:30 AM. Complete daily prescribed camera exercise repetitions and cognitive games in good lighting.',
    dietaryPlan: {
      overview: 'Complete daily prescribed camera exercise repetitions and cognitive games in good lighting. Maintain high protein and 2.5L hydration.',
      hydrationTargetMl: 2500,
    },
  });

  const exercises = [
    {
      exerciseId: 'arm_raise',
      exerciseName: 'Arm Raise',
      targetReps: 10,
      doctorNotes: 'Focus on controlled elevation, hold at peak height for 2 seconds.',
      targetFrequencyPerDay: 1,
      category: 'CAMERA_VERIFIED',
    },
    {
      exerciseId: 'knee_raise',
      exerciseName: 'Knee Raise',
      targetReps: 12,
      doctorNotes: 'Maintain balance near a sturdy wall or chair.',
      targetFrequencyPerDay: 1,
      category: 'CAMERA_VERIFIED',
    },
    {
      exerciseId: 'elbow_flexion',
      exerciseName: 'Elbow Flexion',
      targetReps: 10,
      doctorNotes: 'Perform smooth full curling motion.',
      targetFrequencyPerDay: 1,
      category: 'CAMERA_VERIFIED',
    },
    {
      exerciseId: 'shoulder_movement',
      exerciseName: 'Shoulder Movement',
      targetReps: 8,
      doctorNotes: 'Keep motion within active pain-free arc.',
      targetFrequencyPerDay: 1,
      category: 'GUIDED_TIMER',
    },
  ];

  const games = [
    {
      gameId: 'g1_memory_match',
      gameName: 'Memory Match',
      domain: 'Short-term Memory',
      targetRounds: 2,
      clinicalObjective: 'Select matching pairs of hidden cards to enhance working recall.',
    },
    {
      gameId: 'g2_reaction_time',
      gameName: 'Reaction Time',
      domain: 'Neural Reflexes',
      targetRounds: 3,
      clinicalObjective: 'Tap rapidly after random delay triggers to measure processing latency.',
    },
  ];

  const activities = [
    ...exercises.map((ex, idx) => ({
      activityId: `act_pt4028_ex_${idx}`,
      activityType: 'physical_exercise' as const,
      activityName: ex.exerciseName,
      exerciseId: ex.exerciseId,
      timeOfDay: '10:30 AM',
      category: ex.category,
      configuration: {
        targetRepetitions: ex.targetReps,
        targetRomMaxAngle: 120,
        instructions: ex.doctorNotes,
        category: ex.category,
      },
      scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      frequencyPerDay: 1,
      startDate: new Date().toISOString(),
      status: 'active' as const,
    })),
    ...games.map((g, idx) => ({
      activityId: `act_pt4028_gm_${idx}`,
      activityType: 'cognitive_game' as const,
      activityName: g.gameName,
      gameId: g.gameId,
      timeOfDay: '10:30 AM',
      clinicalObjective: g.clinicalObjective,
      configuration: {
        targetRounds: g.targetRounds,
        cognitiveDomain: g.domain,
        clinicalObjective: g.clinicalObjective,
      },
      scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      frequencyPerDay: 1,
      startDate: new Date().toISOString(),
      status: 'active' as const,
    })),
  ];

  await RehabilitationPlanRepository.create({
    planId: 'PLN-PT-4028-V1',
    patientId: patient._id,
    assignedByDoctorId: 'doc_elena_rostova',
    title: 'Post-Stroke Motor & Cognitive Recovery Protocol',
    version: 1,
    status: 'active',
    startDate: new Date().toISOString(),
    clinicalGoals: [
      'Elevate active shoulder flexion past 120 degrees without trunk compensation',
      'Maintain >90% form accuracy on camera-verified physical therapy',
      'Achieve short-term memory recall and reaction latency <300ms',
    ],
    activities,
    notes: 'Prescribed by Dr. Elena Rostova, PT, DPT (NeuroRehab Institute) for daily 10:30 AM sessions.',
  });

  // Seed sample completed exercise sessions for compliance and telemetry metrics
  const now = Date.now();
  await ExerciseSessionRepository.create({
    sessionId: `es_pt4028_arm`,
    patientId: patient._id,
    assignedActivityId: 'act_pt4028_ex_0',
    exerciseId: 'arm_raise',
    exerciseName: 'Arm Raise',
    startedAt: new Date(now - 3600000).toISOString(),
    completedAt: new Date(now - 3600000 + 120000).toISOString(),
    activeDurationSeconds: 110,
    elapsedDurationSeconds: 120,
    targetRepetitions: 10,
    completedRepetitions: 10,
    validRepetitions: 10,
    completionPercentage: 100,
    sessionStatus: 'completed',
    relevantMetrics: {
      romMaxAngle: 118,
      romMinAngle: 15,
      avgCadenceRepsPerMin: 10,
      symmetryScore: 92,
      formAccuracyPercentage: 96,
      smoothnessScore: 94,
    },
    measurementQuality: 'high',
    patientFeedback: 'Arm movement felt very fluid and smooth.',
    exerciseAlgorithmVersion: '1.2.0',
    clientTimestamp: new Date(now - 3600000).toISOString(),
  });

  await ExerciseSessionRepository.create({
    sessionId: `es_pt4028_knee`,
    patientId: patient._id,
    assignedActivityId: 'act_pt4028_ex_1',
    exerciseId: 'knee_raise',
    exerciseName: 'Knee Raise',
    startedAt: new Date(now - 3200000).toISOString(),
    completedAt: new Date(now - 3200000 + 100000).toISOString(),
    activeDurationSeconds: 95,
    elapsedDurationSeconds: 100,
    targetRepetitions: 12,
    completedRepetitions: 12,
    validRepetitions: 12,
    completionPercentage: 100,
    sessionStatus: 'completed',
    relevantMetrics: {
      romMaxAngle: 92,
      formAccuracyPercentage: 94,
    },
    clientTimestamp: new Date(now - 3200000).toISOString(),
  });

  // Seed sample completed cognitive game sessions
  await CognitiveGameSessionRepository.create({
    sessionId: `cgs_pt4028_mem`,
    patientId: patient._id,
    assignedActivityId: 'act_pt4028_gm_0',
    gameId: 'g1_memory_match',
    gameName: 'Memory Match',
    cognitiveDomain: 'Short-term Memory',
    startedAt: new Date(now - 2800000).toISOString(),
    completedAt: new Date(now - 2800000 + 75000).toISOString(),
    durationSeconds: 75,
    score: 840,
    accuracyPercentage: 94,
    reactionTimeMs: 380,
    difficulty: 'medium',
    levelReached: 2,
    sessionStatus: 'completed',
    clientTimestamp: new Date(now - 2800000).toISOString(),
  });

  await CognitiveGameSessionRepository.create({
    sessionId: `cgs_pt4028_react`,
    patientId: patient._id,
    assignedActivityId: 'act_pt4028_gm_1',
    gameId: 'g2_reaction_time',
    gameName: 'Reaction Time',
    cognitiveDomain: 'Neural Reflexes',
    startedAt: new Date(now - 2400000).toISOString(),
    completedAt: new Date(now - 2400000 + 55000).toISOString(),
    durationSeconds: 55,
    score: 920,
    accuracyPercentage: 96,
    reactionTimeMs: 280,
    difficulty: 'medium',
    levelReached: 3,
    sessionStatus: 'completed',
    clientTimestamp: new Date(now - 2400000).toISOString(),
  });

  // Synchronize immediately to Firestore under patients/PT-4028
  try {
    await syncPatientToFirestoreServer({
      patientId: 'PT-4028',
      patientName: 'John Doe',
      doctorName: 'Dr. Elena Rostova, PT, DPT',
      clinicName: 'NeuroRehab Institute',
      condition: 'Post-Stroke Motor & Cognitive Recovery',
      sessionAlarmTime: '10:30 AM',
      prescribedTime: '10:30 AM',
      targetDailyMinutes: 30,
      doctorAdvice: 'Complete daily prescribed camera exercise repetitions and cognitive games in good lighting.',
      assignedActivities: activities,
      status: 'active',
      todayProgress: {
        completedExercisesCount: 2,
        totalPrescribedExercises: 4,
        completedGamesCount: 2,
        totalPrescribedGames: 2,
        lastCompletedName: 'Knee Raise',
        lastCompletedAt: new Date().toISOString(),
      },
    });
    console.log('[Seed] Successfully seeded and synced PT-4028 (John Doe) to Firestore collection "patients"');
  } catch (err) {
    console.warn('[Seed] Firestore sync warning for PT-4028:', err);
  }
}
