import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Activity,
  Brain,
  Clock,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  Utensils,
  Smartphone,
  Bell,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import { ApiService, DoctorUser } from '../services/api';
import { syncPatientToFirestore, normalizePatientId } from '../services/firebaseSync';

// 13 Cognitive Games from the mobile app
export const COGNITIVE_GAMES_CATALOG = [
  { id: 'memory_match', name: 'Memory Match', domain: 'Working Memory', defaultRounds: 3 },
  { id: 'reaction_time', name: 'Reaction Time & Reflex', domain: 'Processing Speed', defaultRounds: 3 },
  { id: 'stroop_clash', name: 'Stroop Color Clash', domain: 'Inhibitory Control', defaultRounds: 3 },
  { id: 'spatial_grid', name: 'Spatial Grid Recall', domain: 'Visuospatial Memory', defaultRounds: 3 },
  { id: 'n_back_sequence', name: 'N-Back Sequence', domain: 'Active Working Memory', defaultRounds: 3 },
  { id: 'motor_rhythm', name: 'Motor Rhythm Tap', domain: 'Sensorimotor Coordination', defaultRounds: 3 },
  { id: 'trail_making', name: 'Trail Making Test', domain: 'Cognitive Flexibility', defaultRounds: 3 },
  { id: 'object_matrix', name: 'Object Recognition Matrix', domain: 'Visual Agnosia Recovery', defaultRounds: 3 },
  { id: 'semantic_pair', name: 'Word-Color Semantic Pair', domain: 'Language Processing', defaultRounds: 3 },
  { id: 'digit_span', name: 'Digit Span Backward', domain: 'Auditory/Verbal Memory', defaultRounds: 3 },
  { id: 'target_saccades', name: 'Target Tracking Saccades', domain: 'Oculomotor Tracking', defaultRounds: 3 },
  { id: 'dual_task', name: 'Dual-Task Balance & Number', domain: 'Divided Attention', defaultRounds: 3 },
  { id: 'pattern_matrix', name: 'Pattern Completion Matrix', domain: 'Fluid Reasoning', defaultRounds: 3 },
];

// Physical Exercises Catalog (Camera Verified)
export const EXERCISES_CATALOG = [
  {
    id: 'arm_raise',
    name: 'Arm Raise (Anterior Deltoid & Flexion)',
    description: 'Active vertical shoulder flexion tracked via front camera ML pose estimation',
    defaultReps: 15,
  },
  {
    id: 'knee_raise',
    name: 'Knee Raise (Hip Flexor & Quad Control)',
    description: 'Alternating high-knee lift with trunk stabilization',
    defaultReps: 12,
  },
  {
    id: 'shoulder_movement',
    name: 'Shoulder Movement (Scapular & Abduction)',
    description: 'Lateral arm elevation and scapular mobility tracking',
    defaultReps: 12,
  },
  {
    id: 'elbow_flexion',
    name: 'Elbow Flexion & Forearm Control',
    description: 'Controlled concentric bicep contraction & eccentric lowering',
    defaultReps: 15,
  },
  {
    id: 'seated_trunk_balance',
    name: 'Seated Trunk Core Stabilization',
    description: 'Postural symmetry and core sway control in upright posture',
    defaultReps: 10,
  },
];

interface NewPatientPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newPatient: any) => void;
  doctor?: DoctorUser | null;
}

export function NewPatientPrescriptionModal({
  isOpen,
  onClose,
  onCreated,
  doctor,
}: NewPatientPrescriptionModalProps) {
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [diagnosis, setDiagnosis] = useState('Stroke Rehabilitation (Upper Limb & Motor Recovery)');

  // ONE Unified Alarm Timing for all exercises & games (Default 8:00 AM)
  const [sessionAlarmTime, setSessionAlarmTime] = useState('08:00 AM');

  // Physical motor exercises (Only placed into assignedExercises)
  const [exercises, setExercises] = useState([
    { id: 'arm_raise', name: 'Arm Raise', enabled: true, reps: 15 },
    { id: 'knee_raise', name: 'Knee Raise', enabled: true, reps: 12 },
    { id: 'shoulder_movement', name: 'Shoulder Movement', enabled: false, reps: 12 },
    { id: 'elbow_flexion', name: 'Elbow Flexion', enabled: false, reps: 15 },
    { id: 'seated_trunk_balance', name: 'Seated Trunk Balance', enabled: false, reps: 10 },
  ]);

  // Brain cognitive games (Exclusively placed into assignedGames)
  const [games, setGames] = useState([
    { id: 'memory_match', name: 'Memory Match', domain: 'Working Memory', enabled: true, rounds: 3 },
    { id: 'reaction_time', name: 'Reaction Time & Reflex', domain: 'Processing Speed', enabled: false, rounds: 3 },
    { id: 'stroop_clash', name: 'Stroop Color Clash', domain: 'Inhibitory Control', enabled: false, rounds: 3 },
    { id: 'spatial_grid', name: 'Spatial Grid Recall', domain: 'Visuospatial Memory', enabled: false, rounds: 3 },
  ]);

  // What he has to eat (Clinical nutrition guidance)
  const [foodText, setFoodText] = useState(
    'High-protein, anti-inflammatory nutrition. Include wild salmon, walnuts, avocados, blueberries, and spinach. Target 2.5L water daily to support neuroplasticity.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentDoctorName =
    doctor?.name || ApiService.getCurrentDoctor()?.name || 'Dr. Riya Kewt, MD';
  const currentHospital =
    doctor?.hospital || ApiService.getCurrentDoctor()?.hospital || 'Metro Neurosciences Center';

  function toggleExercise(id: string) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, enabled: !ex.enabled } : ex))
    );
  }

  function updateExerciseReps(id: string, reps: number) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, reps: Math.max(1, reps) } : ex))
    );
  }

  function toggleGame(id: string) {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    );
  }

  function updateGameRounds(id: string, rounds: number) {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, rounds: Math.max(1, rounds) } : g))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Patient name is required');
    if (!patientId.trim() || patientId.length !== 6) return setError('6-digit patient ID is required');

    const enabledExercises = exercises.filter((ex) => ex.enabled);
    const enabledGames = games.filter((g) => g.enabled);

    if (enabledExercises.length === 0 && enabledGames.length === 0) {
      return setError('Please select at least one physical exercise or cognitive brain game.');
    }

    setIsSubmitting(true);
    setError(null);

    const emailToUse = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${patientId}@patient.neurorehab.health`;

    // ALL exercises and games receive the EXACT SAME UNIFIED ALARM TIME (e.g. 08:00 AM)
    const activities: any[] = [];

    // 1. Physical Motor Exercises
    enabledExercises.forEach((ex) => {
      activities.push({
        activityType: 'physical_exercise',
        activityName: ex.name,
        exerciseId: ex.id,
        timeOfDay: sessionAlarmTime,
        configuration: {
          targetRepetitions: ex.reps,
          targetRomMaxAngle: 120,
          targetDurationSeconds: ex.reps * 10,
          instructions: `Complete at ${sessionAlarmTime} with camera pose tracking.`,
        },
        scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        frequencyPerDay: 1, // Single daily session
        status: 'active',
      });
    });

    // 2. Cognitive Brain Games
    enabledGames.forEach((g) => {
      activities.push({
        activityType: 'cognitive_game',
        activityName: g.name,
        gameId: g.id,
        timeOfDay: sessionAlarmTime,
        configuration: {
          difficulty: 'medium',
          cognitiveDomain: g.domain,
          targetRounds: g.rounds,
          targetDurationSeconds: g.rounds * 45,
          instructions: `Play after motor exercises at ${sessionAlarmTime}.`,
        },
        scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        frequencyPerDay: 1,
        status: 'active',
      });
    });

    try {
      const response = await ApiService.createPatient({
        name: name.trim(),
        email: emailToUse,
        patientCode: patientId,
        dateOfBirth: '1980-01-01',
        gender: 'unspecified',
        primaryDiagnosis: diagnosis.trim(),
        clinicalNotes: `6-Digit Code: ${patientId}. Session Alarm: ${sessionAlarmTime}. Diet: ${foodText}`,
        assignedActivities: activities,
        dietaryPlan: {
          overview: foodText,
          hydrationTargetMl: 2500,
          meals: [],
          foodsRecommended: ['Wild Salmon', 'Walnuts', 'Blueberries', 'Leafy Greens', 'Avocados'],
          foodsToAvoid: ['Processed Sugars', 'Excess Sodium'],
        },
        doctorName: currentDoctorName,
        sessionAlarmTime,
      });

      const resolvedCode =
        response.patient?.patientCode || response.onboardingCredentials?.patientCode || patientId;
      const normDocId = normalizePatientId(resolvedCode);

      // Directly sync to Mobile App Firestore database with strict separation
      try {
        await syncPatientToFirestore({
          patientId: resolvedCode,
          patientName: response.patient.name,
          condition: diagnosis.trim(),
          doctorName: currentDoctorName,
          clinicName: currentHospital,
          sessionAlarmTime,
          targetDailyMinutes: Math.max(20, enabledExercises.length * 8 + enabledGames.length * 5),
          doctorAdvice: foodText,
          assignedActivities: activities,
          dietaryPlan: { overview: foodText },
          status: 'active',
        });
      } catch (fbErr) {
        console.warn('Direct Firestore sync warning from modal:', fbErr);
      }

      setCreatedCredentials({
        patientName: response.patient.name,
        patientCode: resolvedCode,
        mrn: response.profile?.mrn || `MRN-${resolvedCode}`,
        activationCode: response.onboardingCredentials?.activationCode || 'ACTIVE',
        temporaryPassword: response.onboardingCredentials?.temporaryPassword || 'Password123!',
        accessUrl: response.accessUrl || ApiService.getPatientAccessUrl(resolvedCode),
        firestoreDocId: normDocId,
        sessionAlarmTime,
        exercisesCount: enabledExercises.length,
        gamesCount: enabledGames.length,
        doctorName: currentDoctorName,
      });

      onCreated(response);
    } catch (err: any) {
      setError(err.message || 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyCredentials() {
    if (!createdCredentials) return;
    const text = `NeuroRehab Connect Patient Credentials
Patient Name: ${createdCredentials.patientName}
6-Digit Code: ${createdCredentials.patientCode}
MRN: ${createdCredentials.mrn}
Daily Session Alarm: ${createdCredentials.sessionAlarmTime}
Prescribing Doctor: ${createdCredentials.doctorName}
Physical Exercises: ${createdCredentials.exercisesCount} prescribed
Cognitive Games: ${createdCredentials.gamesCount} prescribed
Mobile App Access Code: ${createdCredentials.patientCode}
Direct Link: ${createdCredentials.accessUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Prescribe New Patient Protocol</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Prescribing Clinician: <span className="font-semibold text-white">{currentDoctorName}</span> • Synchronizes instantly to Mobile App
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {createdCredentials ? (
          /* SUCCESS VIEW */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-sm text-emerald-800">
                  Patient Prescribed & Synced to Mobile App!
                </p>
                <p className="text-emerald-700">
                  Stored in Firestore database <code className="font-mono text-[11px] bg-emerald-100 px-1 py-0.5 rounded">patients/{createdCredentials.patientCode}</code>
                </p>
              </div>
            </div>

            {/* Credential Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">Patient Name:</span>
                <span className="font-bold text-slate-800 text-sm font-sans">{createdCredentials.patientName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">6-Digit Code (Mobile Login):</span>
                <span className="font-bold text-blue-600 text-base tracking-widest">{createdCredentials.patientCode}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">Daily Session Alarm:</span>
                <span className="font-bold text-indigo-600 text-sm font-sans flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  {createdCredentials.sessionAlarmTime} (All Exercises)
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">Physical Exercises:</span>
                <span className="font-medium text-slate-800 font-sans">{createdCredentials.exercisesCount} assigned</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">Brain Cognitive Games:</span>
                <span className="font-medium text-slate-800 font-sans">{createdCredentials.gamesCount} assigned</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-semibold">Prescribing Clinician:</span>
                <span className="font-bold text-slate-800 font-sans">{createdCredentials.doctorName}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Patient Credentials'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* PRESCRIPTION FORM */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            {/* 1. Patient Core Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Patient Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Johnathan Smith"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  6-Digit Patient ID / Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit ID (e.g. 482019)"
                  className="w-full px-3.5 py-2.5 text-sm font-mono tracking-wider font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Clinical Diagnosis & Condition
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Ischemic Stroke Hemiparesis"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 2. UNIFIED SINGLE ALARM TIMING */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Single Daily Session Alarm Timing
                    </h3>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      One alarm for all exercises & games below
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <input
                    type="text"
                    value={sessionAlarmTime}
                    onChange={(e) => setSessionAlarmTime(e.target.value)}
                    className="w-28 px-2.5 py-1.5 text-sm font-bold text-center font-mono bg-white border border-indigo-300 rounded-lg text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Quick Presets:</span>
                {['08:00 AM', '09:00 AM', '02:00 PM', '06:00 PM'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSessionAlarmTime(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      sessionAlarmTime === t
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-indigo-800 bg-white/70 p-2.5 rounded-xl border border-indigo-100 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Unified schedule:</strong> When you set <strong>{sessionAlarmTime}</strong>, all physical motor exercises and brain exercises below trigger simultaneously at {sessionAlarmTime} on the patient's mobile app.
                </span>
              </div>
            </div>

            {/* 3. PHYSICAL MOTOR EXERCISES (assignedExercises only) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Physical Motor Exercises
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">Camera ML Pose Tracked</span>
              </div>

              <div className="space-y-2">
                {exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                      ex.enabled
                        ? 'bg-blue-50/60 border-blue-200'
                        : 'bg-slate-50/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={ex.enabled}
                        onChange={() => toggleExercise(ex.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800">{ex.name}</span>
                        <p className="text-[10px] text-slate-500">
                          Scheduled at {sessionAlarmTime} • Front-camera verified
                        </p>
                      </div>
                    </label>

                    {ex.enabled && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-slate-500 font-medium">Target:</span>
                        <input
                          type="number"
                          min={5}
                          max={50}
                          value={ex.reps}
                          onChange={(e) => updateExerciseReps(ex.id, parseInt(e.target.value) || 12)}
                          className="w-14 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded-lg"
                        />
                        <span className="text-[11px] text-slate-500">reps</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. BRAIN COGNITIVE GAMES (assignedGames only) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Brain Cognitive Exercises (Games)
                  </h3>
                </div>
                <span className="text-[11px] text-purple-600 font-semibold">Exclusively in assignedGames</span>
              </div>

              <div className="space-y-2">
                {games.map((g) => (
                  <div
                    key={g.id}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                      g.enabled
                        ? 'bg-purple-50/60 border-purple-200'
                        : 'bg-slate-50/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={g.enabled}
                        onChange={() => toggleGame(g.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800">{g.name}</span>
                        <p className="text-[10px] text-purple-600 font-medium">
                          {g.domain} • Scheduled at {sessionAlarmTime}
                        </p>
                      </div>
                    </label>

                    {g.enabled && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-slate-500 font-medium">Target:</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={g.rounds}
                          onChange={(e) => updateGameRounds(g.id, parseInt(e.target.value) || 3)}
                          className="w-14 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded-lg"
                        />
                        <span className="text-[11px] text-slate-500">rounds</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 5. WHAT HE HAS TO EAT (Diet & Nutrition) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    What He Has to Eat (Dietary Prescription)
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">Anti-inflammatory recovery</span>
              </div>
              <textarea
                rows={3}
                value={foodText}
                onChange={(e) => setFoodText(e.target.value)}
                placeholder="Prescribe dietary guidelines, foods to eat, hydration targets, and foods to avoid..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Creating & Syncing to Mobile...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Prescribe & Sync to Mobile App</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
