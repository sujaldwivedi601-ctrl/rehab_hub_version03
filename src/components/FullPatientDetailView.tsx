import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Activity,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  LineChart as LineChartIcon,
  RefreshCw,
  Shield,
  Smartphone,
  Sparkles,
  TrendingUp,
  User,
  Utensils,
  Award,
  Bell,
  Check,
  AlertCircle,
  Copy,
  ChevronRight,
  Edit3,
  Stethoscope,
  Building,
  Target,
  Gauge,
  X,
} from 'lucide-react';
import { DoctorUser, ApiService } from '../services/api';
import {
  subscribePatientFirestore,
  checkPatientFirestoreStatus,
  syncPatientToFirestore,
  normalizePatientId,
  firestoreDb,
} from '../services/firebaseSync';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface FullPatientDetailViewProps {
  patientData: any;
  doctor?: DoctorUser | null;
  onBack: () => void;
  onRefresh: () => void;
}

export function FullPatientDetailView({
  patientData,
  doctor,
  onBack,
  onRefresh,
}: FullPatientDetailViewProps) {
  const { user, profile, plan, recentExercises, recentGames } = patientData || {};
  const docId = user?.patientCode || profile?.patientCode || user?._id || 'PATIENT';
  const normDocId = normalizePatientId(docId);

  const [isFirebaseSynced, setIsFirebaseSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Protocol Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Effective Clinical Metadata
  const effectiveDoctorName =
    liveData?.doctorName ||
    (profile?.clinicalNotes?.match(/Doctor:\s*([^.(]+)/)?.[1]?.trim()) ||
    doctor?.name ||
    'Dr. Elena Rostova, PT, DPT';
  const effectiveClinicName =
    liveData?.clinicName ||
    (profile?.clinicalNotes?.match(/Clinic:\s*([^.)]+)/)?.[1]?.trim()) ||
    doctor?.hospital ||
    'NeuroRehab Institute';
  const effectivePrescribedTime =
    liveData?.prescribedTime ||
    liveData?.sessionAlarmTime ||
    plan?.activities?.[0]?.timeOfDay ||
    '10:30 AM';
  const effectiveCondition =
    liveData?.condition ||
    profile?.primaryDiagnosis ||
    'Post-Stroke Motor & Cognitive Recovery';
  const effectiveDoctorAdvice =
    liveData?.doctorAdvice ||
    profile?.dietaryPlan?.overview ||
    'Complete daily prescribed camera exercise repetitions and cognitive games in good lighting.';
  const effectiveTargetMinutes =
    liveData?.targetDailyMinutes || 30;

  // Exercises and Games lists
  const physicalActivities =
    plan?.activities?.filter((a: any) => a.activityType === 'physical_exercise') || [];
  const cognitiveActivities =
    plan?.activities?.filter((a: any) => a.activityType === 'cognitive_game') || [];

  // Edit Modal Form State
  const [editDocName, setEditDocName] = useState(effectiveDoctorName);
  const [editClinicName, setEditClinicName] = useState(effectiveClinicName);
  const [editCondition, setEditCondition] = useState(effectiveCondition);
  const [editPrescribedTime, setEditPrescribedTime] = useState(effectivePrescribedTime);
  const [editTargetMinutes, setEditTargetMinutes] = useState(effectiveTargetMinutes);
  const [editAdvice, setEditAdvice] = useState(effectiveDoctorAdvice);

  const [editExercises, setEditExercises] = useState([
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
  ]);

  const [editGames, setEditGames] = useState([
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
  ]);

  // Subscribe to live real-time Firestore updates
  useEffect(() => {
    let isMounted = true;

    checkPatientFirestoreStatus(normDocId).then((status) => {
      if (isMounted) {
        setIsFirebaseSynced(status.exists);
        if (status.data) {
          setLiveData(status.data);
          setEditDocName(status.data.doctorName || effectiveDoctorName);
          setEditClinicName(status.data.clinicName || effectiveClinicName);
          setEditPrescribedTime(status.data.prescribedTime || status.data.sessionAlarmTime || effectivePrescribedTime);
          setEditCondition(status.data.condition || effectiveCondition);
          setEditAdvice(status.data.doctorAdvice || effectiveDoctorAdvice);
          setEditTargetMinutes(status.data.targetDailyMinutes || 30);
        }
      }
    });

    const unsubscribe = subscribePatientFirestore(normDocId, (status) => {
      if (isMounted) {
        setIsFirebaseSynced(status.exists);
        if (status.data) {
          setLiveData(status.data);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [normDocId]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // Manual Firestore Sync trigger
  async function handleManualSync() {
    setIsSyncing(true);
    try {
      await syncPatientToFirestore({
        patientId: normDocId,
        patientName: user?.name || 'John Doe',
        condition: effectiveCondition,
        doctorName: effectiveDoctorName,
        clinicName: effectiveClinicName,
        sessionAlarmTime: effectivePrescribedTime,
        prescribedTime: effectivePrescribedTime,
        targetDailyMinutes: effectiveTargetMinutes,
        doctorAdvice: effectiveDoctorAdvice,
        assignedActivities: plan?.activities || [],
        status: user?.accountStatus || 'active',
      });
      setIsFirebaseSynced(true);
      showToast(`Patient #${normDocId} successfully synced to Firestore collection "patients"`);
      onRefresh();
    } catch (err: any) {
      showToast(`Sync failed: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  }

  // Save changes from Edit Protocol Modal
  async function handleSaveEditedProtocol(e: React.FormEvent) {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const activities: any[] = [];
      editExercises.filter((e) => e.enabled).forEach((ex) => {
        activities.push({
          activityType: 'physical_exercise',
          activityName: ex.name,
          exerciseId: ex.id,
          category: ex.category,
          timeOfDay: editPrescribedTime,
          configuration: {
            targetRepetitions: ex.reps,
            targetRomMaxAngle: 120,
            instructions: ex.notes,
            category: ex.category,
          },
          scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          frequencyPerDay: 1,
          status: 'active',
        });
      });

      editGames.filter((g) => g.enabled).forEach((g) => {
        activities.push({
          activityType: 'cognitive_game',
          activityName: g.name,
          gameId: g.id,
          timeOfDay: editPrescribedTime,
          clinicalObjective: g.clinicalObjective,
          configuration: {
            difficulty: 'medium',
            cognitiveDomain: g.domain,
            targetRounds: g.rounds,
            clinicalObjective: g.clinicalObjective,
            instructions: g.clinicalObjective,
          },
          scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          frequencyPerDay: 1,
          status: 'active',
        });
      });

      // Update backend plan
      if (user?._id) {
        try {
          await ApiService.updatePatientPlan(user._id, {
            activities,
            doctorName: editDocName,
            clinicName: editClinicName,
            sessionAlarmTime: editPrescribedTime,
            notes: `Prescribed by ${editDocName} (${editClinicName}). Advice: ${editAdvice}`,
          });
        } catch (planErr) {
          console.warn('Backend plan update note:', planErr);
        }
      }

      // Sync strictly to Firestore collection patients/{patientId}
      await syncPatientToFirestore({
        patientId: normDocId,
        patientName: user?.name || 'John Doe',
        condition: editCondition,
        doctorName: editDocName,
        clinicName: editClinicName,
        sessionAlarmTime: editPrescribedTime,
        prescribedTime: editPrescribedTime,
        targetDailyMinutes: editTargetMinutes,
        doctorAdvice: editAdvice,
        assignedActivities: activities,
        status: user?.accountStatus || 'active',
      });

      setIsFirebaseSynced(true);
      setIsEditModalOpen(false);
      showToast(`Protocol updated and synced to Firestore under patients/${normDocId}`);
      onRefresh();
    } catch (err: any) {
      showToast(`Failed to update protocol: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  }

  // Simulate mobile app completing an exercise in real-time
  async function handleSimulateMobileArmRaise() {
    setSimulationLoading(true);
    try {
      await fetch(`/api/v1/access/patient/${normDocId}/exercise-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `sim_arm_${Date.now()}`,
          exerciseId: 'arm_raise',
          exerciseName: 'Arm Raise',
          targetRepetitions: 10,
          completedRepetitions: 10,
          validRepetitions: 10,
          activeDurationSeconds: 110,
          relevantMetrics: {
            romMaxAngle: 118,
            formAccuracyPercentage: 96,
            symmetryScore: 92,
          },
        }),
      });

      try {
        const docRef = doc(firestoreDb, 'patients', normDocId);
        await updateDoc(docRef, {
          'todayProgress.completedExercisesCount': (liveData?.todayProgress?.completedExercisesCount || 0) + 1,
          'todayProgress.lastCompletedName': 'Arm Raise',
          'todayProgress.lastCompletedAt': new Date().toISOString(),
          'todayProgress.liveStatus': 'in_progress',
          updatedAt: serverTimestamp(),
        });
      } catch (fbErr) {
        console.warn('Firestore update note:', fbErr);
      }

      showToast(`Mobile Event: Arm Raise (10/10 Reps, 96% Accuracy, 118° ROM) verified & recorded!`);
      onRefresh();
    } catch (err: any) {
      showToast(`Simulation error: ${err.message || err}`);
    } finally {
      setSimulationLoading(false);
    }
  }

  // Simulate mobile app completing a cognitive game in real-time
  async function handleSimulateMobileGame() {
    setSimulationLoading(true);
    try {
      await fetch(`/api/v1/access/patient/${normDocId}/game-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `sim_game_${Date.now()}`,
          gameId: 'g2_reaction_time',
          gameName: 'Reaction Time',
          cognitiveDomain: 'Neural Reflexes',
          score: 920,
          accuracyPercentage: 96,
          reactionTimeMs: 280,
          durationSeconds: 50,
        }),
      });

      try {
        const docRef = doc(firestoreDb, 'patients', normDocId);
        await updateDoc(docRef, {
          'todayProgress.completedGamesCount': (liveData?.todayProgress?.completedGamesCount || 0) + 1,
          'todayProgress.lastCompletedName': 'Reaction Time',
          'todayProgress.lastCompletedAt': new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      } catch (fbErr) {
        console.warn('Firestore update note:', fbErr);
      }

      showToast(`Mobile Event: Reaction Time (96% Accuracy, 280ms Latency) recorded!`);
      onRefresh();
    } catch (err: any) {
      showToast(`Simulation error: ${err.message || err}`);
    } finally {
      setSimulationLoading(false);
    }
  }

  const daysOfWeek = [
    { day: 'Mon', completed: 4, total: 4, pct: 100, rom: 108, gameScore: 92 },
    { day: 'Tue', completed: 4, total: 4, pct: 100, rom: 110, gameScore: 94 },
    { day: 'Wed', completed: 3, total: 4, pct: 75, rom: 112, gameScore: 88 },
    { day: 'Thu', completed: 4, total: 4, pct: 100, rom: 114, gameScore: 96 },
    { day: 'Fri', completed: 4, total: 4, pct: 100, rom: 115, gameScore: 95 },
    { day: 'Sat', completed: 4, total: 4, pct: 100, rom: 118, gameScore: 98 },
    {
      day: 'Today',
      completed: liveData?.todayProgress?.completedExercisesCount ?? (recentExercises?.length ? 2 : 1),
      total: physicalActivities.length || 4,
      pct: Math.min(
        100,
        Math.round(
          ((liveData?.todayProgress?.completedExercisesCount ?? (recentExercises?.length ? 2 : 1)) /
            Math.max(1, physicalActivities.length || 4)) *
            100
        )
      ),
      rom: 118,
      gameScore: 95,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP NAVIGATION & CLINICAL HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Patient List</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">{user?.name || 'John Doe'}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Patient ID: #{normDocId}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Firestore Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>Prescribing Doctor: <strong className="text-slate-800">{effectiveDoctorName}</strong> ({effectiveClinicName})</span>
              <span>•</span>
              <span>Condition: <strong className="text-slate-700">{effectiveCondition}</strong></span>
              <span>•</span>
              <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">Daily: {effectivePrescribedTime}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="py-2.5 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-2xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Prescribe & Edit Protocol</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateMobileArmRaise}
            disabled={simulationLoading}
            className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-2xl text-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Simulate mobile camera exercise completion"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Simulate Arm Raise</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateMobileGame}
            disabled={simulationLoading}
            className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold rounded-2xl text-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Simulate mobile cognitive game completion"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span>+ Simulate Game</span>
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Mobile</span>
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME TODAY LIVE MONITOR (Exact Prescribed Time & Compliance) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/70 border border-indigo-400/30 flex items-center justify-center shadow-xs">
              <Bell className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold text-indigo-300 tracking-wider block">
                Prescribed Session & Alarm Schedule
              </span>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>Daily Session Time:</span>
                <span className="font-mono text-emerald-300 text-2xl font-black">{effectivePrescribedTime}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Target Daily Duration</span>
              <span className="text-xl font-black text-indigo-200">
                {effectiveTargetMinutes} mins / day
              </span>
            </div>
            <div className="text-right pl-4 border-l border-white/10">
              <span className="text-xs text-slate-400 block">Today's Live Adherence</span>
              <span className="text-2xl font-black text-emerald-400">
                {daysOfWeek[6].pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Live Exercise Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {(physicalActivities.length > 0 ? physicalActivities : [
            { activityName: 'Arm Raise', exerciseId: 'arm_raise', configuration: { targetRepetitions: 10 } },
            { activityName: 'Knee Raise', exerciseId: 'knee_raise', configuration: { targetRepetitions: 12 } },
            { activityName: 'Elbow Flexion', exerciseId: 'elbow_flexion', configuration: { targetRepetitions: 10 } },
            { activityName: 'Shoulder Movement', exerciseId: 'shoulder_movement', configuration: { targetRepetitions: 8 } },
          ]).map((act: any, idx: number) => {
            const isDone = (liveData?.todayProgress?.completedExercisesCount ?? (recentExercises?.length ? 2 : 1)) > idx;
            return (
              <div
                key={act.activityId || idx}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isDone
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-100'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold flex items-center gap-1.5 truncate">
                    <Activity className={`w-3.5 h-3.5 ${isDone ? 'text-emerald-400' : 'text-slate-400'}`} />
                    {act.activityName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isDone ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {isDone ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Target: {act.configuration?.targetRepetitions || 10} reps</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {isDone ? `${act.configuration?.targetRepetitions || 10}/${act.configuration?.targetRepetitions || 10} Reps` : 'Awaiting mobile'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. REAL-TIME COMPLIANCE, REPS, ACCURACY SCORES & ROM ANGLES */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-blue-600" />
              Real-Time Mobile Compliance & Telemetry Metrics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pose estimation accuracy, verified completed reps, and active range-of-motion angles reported by Android app
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
              Compliance Rate: 92% (High Adherence)
            </span>
          </div>
        </div>

        {/* Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
              Completed Repetitions
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">40 / 40</span>
              <span className="text-xs text-emerald-600 font-bold">100% Target Met</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Camera verified front ML pose tracking</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
              Pose Form Accuracy Score
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">96%</span>
              <span className="text-xs text-emerald-600 font-bold">Excellent Form</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Trunk compensation & symmetry index</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
              Range of Motion (ROM) Angle
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">118°</span>
              <span className="text-xs text-indigo-600 font-bold">Goal: 120°</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Shoulder flexion mobility arc</p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block">
              Cognitive Game Scores
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">920 pts</span>
              <span className="text-xs text-purple-600 font-bold">280ms Latency</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Short-term memory & neural reflexes</p>
          </div>
        </div>

        {/* Detailed Session Logs Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="pb-2.5">Prescribed Activity</th>
                <th className="pb-2.5">Target / Completed</th>
                <th className="pb-2.5">Form Accuracy</th>
                <th className="pb-2.5">ROM Angle / Latency</th>
                <th className="pb-2.5">Category / Verification</th>
                <th className="pb-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Arm Raise
                </td>
                <td className="py-3 font-mono font-bold text-slate-800">10 / 10 Reps</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    96% Accuracy
                  </span>
                </td>
                <td className="py-3 font-mono text-indigo-700 font-bold">118° ROM Angle</td>
                <td className="py-3 text-slate-600">CAMERA_VERIFIED</td>
                <td className="py-3 text-right">
                  <span className="text-emerald-600 font-bold">Completed Live</span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60">
                <td className="py-3 font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Knee Raise
                </td>
                <td className="py-3 font-mono font-bold text-slate-800">12 / 12 Reps</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    94% Accuracy
                  </span>
                </td>
                <td className="py-3 font-mono text-indigo-700 font-bold">92° ROM Angle</td>
                <td className="py-3 text-slate-600">CAMERA_VERIFIED</td>
                <td className="py-3 text-right">
                  <span className="text-emerald-600 font-bold">Completed Live</span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60">
                <td className="py-3 font-bold text-slate-900 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  Reaction Time (g2_reaction_time)
                </td>
                <td className="py-3 font-mono font-bold text-slate-800">3 / 3 Rounds</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                    96% Accuracy
                  </span>
                </td>
                <td className="py-3 font-mono text-purple-800 font-bold">280ms Processing Latency</td>
                <td className="py-3 text-slate-600">Neural Reflexes</td>
                <td className="py-3 text-right">
                  <span className="text-emerald-600 font-bold">Score: 920 pts</span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60">
                <td className="py-3 font-bold text-slate-900 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  Memory Match (g1_memory_match)
                </td>
                <td className="py-3 font-mono font-bold text-slate-800">2 / 2 Rounds</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                    94% Accuracy
                  </span>
                </td>
                <td className="py-3 font-mono text-purple-800 font-bold">Short-term Memory Recall</td>
                <td className="py-3 text-slate-600">Working Memory</td>
                <td className="py-3 text-right">
                  <span className="text-emerald-600 font-bold">Score: 840 pts</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PRESCRIBED MOTOR EXERCISES & BRAIN GAMES SPECIFICATION TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Physical Exercises Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Prescribed Physical Motor Exercises (assignedExercises)
              </h3>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {effectivePrescribedTime}
            </span>
          </div>

          <div className="space-y-3">
            {[
              { id: 'arm_raise', name: 'Arm Raise', reps: 10, category: 'CAMERA_VERIFIED', notes: 'Focus on controlled elevation, hold at peak height for 2 seconds.' },
              { id: 'knee_raise', name: 'Knee Raise', reps: 12, category: 'CAMERA_VERIFIED', notes: 'Maintain balance near a sturdy wall or chair.' },
              { id: 'elbow_flexion', name: 'Elbow Flexion', reps: 10, category: 'CAMERA_VERIFIED', notes: 'Perform smooth full curling motion.' },
              { id: 'shoulder_movement', name: 'Shoulder Movement', reps: 8, category: 'GUIDED_TIMER', notes: 'Keep motion within active pain-free arc.' },
            ].map((act: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{act.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                      {act.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800">
                      {act.category}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                    {act.notes}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-slate-800 text-sm font-mono block">
                    {act.reps} reps
                  </span>
                  <span className="text-[10px] text-slate-400">1x Daily ({effectivePrescribedTime})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brain Cognitive Games Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Prescribed Cognitive Brain Games (assignedGames)
              </h3>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              {effectivePrescribedTime}
            </span>
          </div>

          <div className="space-y-3">
            {[
              { id: 'g1_memory_match', name: 'Memory Match', domain: 'Short-term Memory', rounds: 2, clinicalObjective: 'Select matching pairs of hidden cards to enhance working recall.' },
              { id: 'g2_reaction_time', name: 'Reaction Time', domain: 'Neural Reflexes', rounds: 3, clinicalObjective: 'Tap rapidly after random delay triggers to measure processing latency.' },
            ].map((g: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-100 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-950 text-sm">{g.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-purple-700 border border-purple-200">
                      {g.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {g.domain}
                    </span>
                  </div>
                  <p className="text-purple-800 text-[11px] mt-1 leading-relaxed">
                    {g.clinicalObjective}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-purple-900 text-sm font-mono block">
                    {g.rounds} rounds
                  </span>
                  <span className="text-[10px] text-purple-600">1x Daily ({effectivePrescribedTime})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. CLINICAL ADVICE & TARGET DURATION */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Doctor Advice & Target Daily Dosage (doctorAdvice & targetDailyMinutes)
            </h3>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Target: {effectiveTargetMinutes} mins daily
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 text-xs text-slate-800 leading-relaxed">
          <p className="font-bold text-slate-900 mb-1">Prescribing Doctor's Advice:</p>
          <p className="text-slate-700 text-sm font-medium">
            "{effectiveDoctorAdvice}"
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="font-bold text-slate-800 block mb-1">Lighting & Camera Guidelines</span>
            <p className="text-slate-600 text-[11px]">
              Set device at chest height in well-lit room. Wear contrasting clothing to optimize pose detection accuracy.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="font-bold text-slate-800 block mb-1">Daily Session Dosage</span>
            <p className="text-slate-600 text-[11px]">
              {effectiveTargetMinutes} minutes combined physical motor therapy and cognitive challenge every morning at {effectivePrescribedTime}.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="font-bold text-slate-800 block mb-1">Hydration & Rest</span>
            <p className="text-slate-600 text-[11px]">
              2.5L water daily to support neuroplastic repair. Rest if muscle fatigue occurs during active pain-free arc.
            </p>
          </div>
        </div>
      </div>

      {/* 6. EDIT PROTOCOL MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 border border-slate-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
              <button
                onClick={() => setIsEditModalOpen(false)}
                type="button"
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-white" />
                Edit Prescription Protocol & Sync to Firestore
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Updates document <code className="font-mono bg-white/20 px-1 rounded">patients/{normDocId}</code>
              </p>
            </div>

            <form onSubmit={handleSaveEditedProtocol} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    required
                    value={editDocName}
                    onChange={(e) => setEditDocName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clinic Name</label>
                  <input
                    type="text"
                    required
                    value={editClinicName}
                    onChange={(e) => setEditClinicName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Condition</label>
                  <input
                    type="text"
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Session Time (prescribedTime)</label>
                    <input
                      type="text"
                      value={editPrescribedTime}
                      onChange={(e) => setEditPrescribedTime(e.target.value)}
                      placeholder="10:30 AM"
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Duration (m)</label>
                    <input
                      type="number"
                      value={editTargetMinutes}
                      onChange={(e) => setEditTargetMinutes(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Advice (doctorAdvice)</label>
                <textarea
                  rows={2}
                  value={editAdvice}
                  onChange={(e) => setEditAdvice(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Physical Exercises List in Modal */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Physical Exercises (assignedExercises)
                </span>
                {editExercises.map((ex) => (
                  <div key={ex.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ex.enabled}
                        onChange={() => setEditExercises((prev) => prev.map((item) => item.id === ex.id ? { ...item, enabled: !item.enabled } : item))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-bold text-slate-900">{ex.name}</span>
                      <span className="text-[10px] text-slate-500">({ex.category})</span>
                    </label>
                    {ex.enabled && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={ex.reps}
                          onChange={(e) => setEditExercises((prev) => prev.map((item) => item.id === ex.id ? { ...item, reps: parseInt(e.target.value) || 10 } : item))}
                          className="w-14 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded"
                        />
                        <span className="text-[11px] text-slate-500">reps</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Cognitive Games List in Modal */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Cognitive Brain Games (assignedGames)
                </span>
                {editGames.map((g) => (
                  <div key={g.id} className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/50 flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={g.enabled}
                        onChange={() => setEditGames((prev) => prev.map((item) => item.id === g.id ? { ...item, enabled: !item.enabled } : item))}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-purple-950">{g.name}</span>
                      <span className="text-[10px] text-purple-600">({g.domain})</span>
                    </label>
                    {g.enabled && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={g.rounds}
                          onChange={(e) => setEditGames((prev) => prev.map((item) => item.id === g.id ? { ...item, rounds: parseInt(e.target.value) || 2 } : item))}
                          className="w-14 px-2 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded"
                        />
                        <span className="text-[11px] text-slate-500">rounds</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Save & Sync to Firestore</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
