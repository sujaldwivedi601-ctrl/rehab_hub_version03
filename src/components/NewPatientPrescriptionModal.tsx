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
  Stethoscope,
  Building,
} from 'lucide-react';
import { ApiService, DoctorUser } from '../services/api';
import { syncPatientToFirestore, normalizePatientId } from '../services/firebaseSync';

export const EXERCISES_CATALOG = [
  {
    id: 'arm_raise',
    name: 'Arm Raise',
    defaultReps: 10,
    category: 'CAMERA_VERIFIED',
    notes: 'Focus on controlled elevation, hold at peak height for 2 seconds.',
  },
  {
    id: 'knee_raise',
    name: 'Knee Raise',
    defaultReps: 12,
    category: 'CAMERA_VERIFIED',
    notes: 'Maintain balance near a sturdy wall or chair.',
  },
  {
    id: 'elbow_flexion',
    name: 'Elbow Flexion',
    defaultReps: 10,
    category: 'CAMERA_VERIFIED',
    notes: 'Perform smooth full curling motion.',
  },
  {
    id: 'shoulder_movement',
    name: 'Shoulder Movement',
    defaultReps: 8,
    category: 'GUIDED_TIMER',
    notes: 'Keep motion within active pain-free arc.',
  },
  {
    id: 'seated_trunk_balance',
    name: 'Seated Trunk Balance',
    defaultReps: 10,
    category: 'CAMERA_VERIFIED',
    notes: 'Maintain upright posture with core stabilization.',
  },
];

export const COGNITIVE_GAMES_CATALOG = [
  {
    id: 'g1_memory_match',
    name: 'Memory Match',
    domain: 'Short-term Memory',
    defaultRounds: 2,
    clinicalObjective: 'Select matching pairs of hidden cards to enhance working recall.',
  },
  {
    id: 'g2_reaction_time',
    name: 'Reaction Time',
    domain: 'Neural Reflexes',
    defaultRounds: 3,
    clinicalObjective: 'Tap rapidly after random delay triggers to measure processing latency.',
  },
  {
    id: 'stroop_clash',
    name: 'Stroop Color Clash',
    domain: 'Inhibitory Control',
    defaultRounds: 2,
    clinicalObjective: 'Resolve conflicting color-word stimuli under timed conditions.',
  },
  {
    id: 'spatial_grid',
    name: 'Spatial Grid Recall',
    domain: 'Visuospatial Memory',
    defaultRounds: 2,
    clinicalObjective: 'Recall illuminated spatial patterns on dynamic matrix.',
  },
];

interface NewPatientPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newPatient: any) => void;
  doctor?: DoctorUser | null;
  initialPatientId?: string;
}

export function NewPatientPrescriptionModal({
  isOpen,
  onClose,
  onCreated,
  doctor,
  initialPatientId,
}: NewPatientPrescriptionModalProps) {
  const [name, setName] = useState('John Doe');
  const [patientId, setPatientId] = useState(initialPatientId || 'PT-4028');
  const [condition, setCondition] = useState('Post-Stroke Motor & Cognitive Recovery');

  // Prescribing Doctor Details
  const [doctorName, setDoctorName] = useState(
    doctor?.name || ApiService.getCurrentDoctor()?.name || 'Dr. Elena Rostova, PT, DPT'
  );
  const [clinicName, setClinicName] = useState(
    doctor?.hospital || ApiService.getCurrentDoctor()?.hospital || 'NeuroRehab Institute'
  );

  // Exact Daily Session / Alarm Timing (e.g., 10:30 AM)
  const [sessionAlarmTime, setSessionAlarmTime] = useState('10:30 AM');
  const [targetDailyMinutes, setTargetDailyMinutes] = useState(30);

  // Clinical Advice
  const [doctorAdvice, setDoctorAdvice] = useState(
    'Complete daily prescribed camera exercise repetitions and cognitive games in good lighting.'
  );

  // Physical motor exercises
  const [exercises, setExercises] = useState([
    {
      id: 'arm_raise',
      name: 'Arm Raise',
      enabled: true,
      reps: 10,
      category: 'CAMERA_VERIFIED',
      notes: 'Focus on controlled elevation, hold at peak height for 2 seconds.',
    },
    {
      id: 'knee_raise',
      name: 'Knee Raise',
      enabled: true,
      reps: 12,
      category: 'CAMERA_VERIFIED',
      notes: 'Maintain balance near a sturdy wall or chair.',
    },
    {
      id: 'elbow_flexion',
      name: 'Elbow Flexion',
      enabled: true,
      reps: 10,
      category: 'CAMERA_VERIFIED',
      notes: 'Perform smooth full curling motion.',
    },
    {
      id: 'shoulder_movement',
      name: 'Shoulder Movement',
      enabled: true,
      reps: 8,
      category: 'GUIDED_TIMER',
      notes: 'Keep motion within active pain-free arc.',
    },
    {
      id: 'seated_trunk_balance',
      name: 'Seated Trunk Balance',
      enabled: false,
      reps: 10,
      category: 'CAMERA_VERIFIED',
      notes: 'Maintain upright posture with core stabilization.',
    },
  ]);

  // Brain cognitive games
  const [games, setGames] = useState([
    {
      id: 'g1_memory_match',
      name: 'Memory Match',
      domain: 'Short-term Memory',
      enabled: true,
      rounds: 2,
      clinicalObjective: 'Select matching pairs of hidden cards to enhance working recall.',
    },
    {
      id: 'g2_reaction_time',
      name: 'Reaction Time',
      domain: 'Neural Reflexes',
      enabled: true,
      rounds: 3,
      clinicalObjective: 'Tap rapidly after random delay triggers to measure processing latency.',
    },
    {
      id: 'stroop_clash',
      name: 'Stroop Color Clash',
      domain: 'Inhibitory Control',
      enabled: false,
      rounds: 2,
      clinicalObjective: 'Resolve conflicting color-word stimuli under timed conditions.',
    },
    {
      id: 'spatial_grid',
      name: 'Spatial Grid Recall',
      domain: 'Visuospatial Memory',
      enabled: false,
      rounds: 2,
      clinicalObjective: 'Recall illuminated spatial patterns on dynamic matrix.',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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

  function updateExerciseCategory(id: string, category: string) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, category } : ex))
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
    if (!patientId.trim()) return setError('Patient ID is required (e.g. PT-4028)');

    const enabledExercises = exercises.filter((ex) => ex.enabled);
    const enabledGames = games.filter((g) => g.enabled);

    if (enabledExercises.length === 0 && enabledGames.length === 0) {
      return setError('Please select at least one physical exercise or cognitive brain game.');
    }

    setIsSubmitting(true);
    setError(null);

    const cleanId = patientId.trim().toUpperCase();
    const emailToUse = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '')}@patient.neurorehab.health`;

    // Strict Activities Mapping
    const activities: any[] = [];

    enabledExercises.forEach((ex) => {
      activities.push({
        activityType: 'physical_exercise',
        activityName: ex.name,
        exerciseId: ex.id,
        category: ex.category,
        timeOfDay: sessionAlarmTime,
        configuration: {
          targetRepetitions: ex.reps,
          targetRomMaxAngle: 120,
          targetDurationSeconds: ex.reps * 10,
          instructions: ex.notes,
          category: ex.category,
        },
        scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        frequencyPerDay: 1,
        status: 'active',
      });
    });

    enabledGames.forEach((g) => {
      activities.push({
        activityType: 'cognitive_game',
        activityName: g.name,
        gameId: g.id,
        timeOfDay: sessionAlarmTime,
        clinicalObjective: g.clinicalObjective,
        configuration: {
          difficulty: 'medium',
          cognitiveDomain: g.domain,
          targetRounds: g.rounds,
          clinicalObjective: g.clinicalObjective,
          targetDurationSeconds: g.rounds * 45,
          instructions: g.clinicalObjective,
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
        patientCode: cleanId,
        dateOfBirth: '1978-04-12',
        gender: 'Male',
        primaryDiagnosis: condition.trim(),
        clinicalNotes: `Patient ID: ${cleanId}. Prescribed Time: ${sessionAlarmTime}. Doctor: ${doctorName.trim()} (${clinicName.trim()}). Advice: ${doctorAdvice.trim()}`,
        assignedActivities: activities,
        dietaryPlan: {
          overview: doctorAdvice.trim(),
          hydrationTargetMl: 2500,
        },
        doctorName: doctorName.trim(),
        clinicName: clinicName.trim(),
        sessionAlarmTime,
        targetDailyMinutes,
      });

      const resolvedCode =
        response.patient?.patientCode || response.onboardingCredentials?.patientCode || cleanId;
      const normDocId = normalizePatientId(resolvedCode);

      // Directly sync to Mobile App Firestore database matching the exact schema
      try {
        await syncPatientToFirestore({
          patientId: resolvedCode,
          patientName: response.patient?.name || name.trim(),
          condition: condition.trim(),
          doctorName: doctorName.trim(),
          clinicName: clinicName.trim(),
          sessionAlarmTime,
          prescribedTime: sessionAlarmTime,
          targetDailyMinutes,
          doctorAdvice: doctorAdvice.trim(),
          assignedActivities: activities,
          status: 'active',
        });
      } catch (fbErr) {
        console.warn('Direct Firestore sync warning from modal:', fbErr);
      }

      setCreatedCredentials({
        patientName: response.patient?.name || name.trim(),
        patientCode: resolvedCode,
        mrn: response.profile?.mrn || `MRN-${resolvedCode}`,
        activationCode: response.onboardingCredentials?.activationCode || 'ACTIVE',
        temporaryPassword: response.onboardingCredentials?.temporaryPassword || 'Password123!',
        accessUrl: response.accessUrl || ApiService.getPatientAccessUrl(resolvedCode),
        firestoreDocId: normDocId,
        prescribedTime: sessionAlarmTime,
        exercisesCount: enabledExercises.length,
        gamesCount: enabledGames.length,
        doctorName: doctorName.trim(),
        clinicName: clinicName.trim(),
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
Patient ID: ${createdCredentials.patientCode}
MRN: ${createdCredentials.mrn}
Prescribed Session Time: ${createdCredentials.prescribedTime}
Prescribing Doctor: ${createdCredentials.doctorName} (${createdCredentials.clinicName})
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
                Strict Firestore sync to collection <code className="font-mono bg-white/20 px-1 py-0.5 rounded text-white">patients/{patientId}</code>
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
                  Patient Prescribed & Synced to Firestore!
                </p>
                <p className="text-emerald-700">
                  Stored under document ID <code className="font-mono text-[11px] bg-emerald-100 px-1.5 py-0.5 rounded font-bold">patients/{createdCredentials.patientCode}</code>
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
                <span className="text-slate-500 font-sans font-semibold">Patient ID (Firestore Doc ID):</span>
                <span className="font-bold text-blue-600 text-base tracking-widest">{createdCredentials.patientCode}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">Prescribed Session Time:</span>
                <span className="font-bold text-indigo-600 text-sm font-sans flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  {createdCredentials.prescribedTime}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">Prescribing Doctor:</span>
                <span className="font-medium text-slate-800 font-sans">{createdCredentials.doctorName} • {createdCredentials.clinicName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">Physical Exercises:</span>
                <span className="font-medium text-slate-800 font-sans">{createdCredentials.exercisesCount} assigned</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-semibold">Cognitive Brain Games:</span>
                <span className="font-medium text-slate-800 font-sans">{createdCredentials.gamesCount} assigned</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Protocol Summary'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Done & View Patient</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* PRESCRIPTION FORM */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* 1. Patient & Doctor Core Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                1. Patient & Prescribing Clinician Identification
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Patient ID (Firestore Doc ID) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPatientId('PT-4028')}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Use PT-4028
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value.toUpperCase())}
                    placeholder="e.g. PT-4028 or 482019"
                    className="w-full px-3.5 py-2.5 text-sm font-mono tracking-wider font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Prescribing Doctor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Elena Rostova, PT, DPT"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Clinic Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="e.g. NeuroRehab Institute"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Clinical Diagnosis & Condition
                  </label>
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. Post-Stroke Motor & Cognitive Recovery"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. EXACT PRESCRIBED TIME & DURATION */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                      Prescribed Daily Session / Alarm Time
                    </h3>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      Exact synchronization to <code className="font-mono text-indigo-900 font-bold">prescribedTime</code> field
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <input
                      type="text"
                      value={sessionAlarmTime}
                      onChange={(e) => setSessionAlarmTime(e.target.value)}
                      placeholder="10:30 AM"
                      className="w-28 px-2.5 py-1.5 text-sm font-bold text-center font-mono bg-white border border-indigo-300 rounded-lg text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Daily:</span>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={targetDailyMinutes}
                      onChange={(e) => setTargetDailyMinutes(parseInt(e.target.value) || 30)}
                      className="w-16 px-2 py-1.5 text-sm font-bold text-center font-mono bg-white border border-indigo-300 rounded-lg text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
                    />
                    <span className="text-xs font-bold text-slate-600">mins</span>
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Preset times:</span>
                {['10:30 AM', '08:00 AM', '09:00 AM', '02:00 PM', '05:00 PM'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSessionAlarmTime(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      sessionAlarmTime === t
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. PHYSICAL MOTOR EXERCISES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Physical Exercises (assignedExercises)
                  </h3>
                </div>
                <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full">
                  CAMERA_VERIFIED & GUIDED_TIMER
                </span>
              </div>

              <div className="space-y-2">
                {exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      ex.enabled
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-slate-50/50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={ex.enabled}
                          onChange={() => toggleExercise(ex.id)}
                          className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{ex.name}</span>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                              {ex.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{ex.notes}</p>
                        </div>
                      </label>

                      {ex.enabled && (
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={ex.category}
                            onChange={(e) => updateExerciseCategory(ex.id, e.target.value)}
                            className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700"
                          >
                            <option value="CAMERA_VERIFIED">CAMERA_VERIFIED</option>
                            <option value="GUIDED_TIMER">GUIDED_TIMER</option>
                          </select>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={ex.reps}
                              onChange={(e) => updateExerciseReps(ex.id, parseInt(e.target.value) || 10)}
                              className="w-14 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded-lg"
                            />
                            <span className="text-[11px] text-slate-500 font-semibold">reps</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. BRAIN COGNITIVE GAMES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Cognitive Brain Games (assignedGames)
                  </h3>
                </div>
                <span className="text-[11px] text-purple-600 font-bold bg-purple-50 px-2.5 py-0.5 rounded-full">
                  Executive Function & Latency
                </span>
              </div>

              <div className="space-y-2">
                {games.map((g) => (
                  <div
                    key={g.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      g.enabled
                        ? 'bg-purple-50/50 border-purple-200'
                        : 'bg-slate-50/50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={g.enabled}
                          onChange={() => toggleGame(g.id)}
                          className="w-4 h-4 mt-0.5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-950">{g.name}</span>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-purple-700 border border-purple-200">
                              {g.id}
                            </span>
                            <span className="text-[10px] text-purple-600 font-semibold">
                              ({g.domain})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{g.clinicalObjective}</p>
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
                            onChange={(e) => updateGameRounds(g.id, parseInt(e.target.value) || 2)}
                            className="w-14 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded-lg"
                          />
                          <span className="text-[11px] text-slate-500 font-semibold">rounds</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. CLINICAL DOCTOR ADVICE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Clinical Advice & Instructions (doctorAdvice)
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Stored in Firestore
                </span>
              </div>
              <textarea
                rows={3}
                value={doctorAdvice}
                onChange={(e) => setDoctorAdvice(e.target.value)}
                placeholder="Prescribe instructions, posture guidelines, lighting guidance, hydration targets..."
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
                    <span>Syncing to Firestore...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Save & Prescribe to Firestore</span>
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
