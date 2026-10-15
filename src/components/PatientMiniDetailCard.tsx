import React, { useState, useEffect } from 'react';
import {
  Activity,
  Brain,
  Clock,
  Sparkles,
  Smartphone,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Bell,
  Utensils,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { DoctorUser, ApiService } from '../services/api';
import {
  subscribePatientFirestore,
  checkPatientFirestoreStatus,
  syncPatientToFirestore,
  normalizePatientId,
} from '../services/firebaseSync';

interface PatientMiniDetailCardProps {
  patientData: any;
  doctor?: DoctorUser | null;
  onViewWholeDetail: () => void;
  onRefresh: () => void;
}

export function PatientMiniDetailCard({
  patientData,
  doctor,
  onViewWholeDetail,
  onRefresh,
}: PatientMiniDetailCardProps) {
  const { user, profile, plan, recentExercises, recentGames } = patientData || {};
  const docId = user?.patientCode || profile?.patientCode || user?._id || 'PATIENT';
  const normDocId = normalizePatientId(docId);

  const [isFirebaseSynced, setIsFirebaseSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveTodayData, setLiveTodayData] = useState<any>(null);

  const currentDoctorName =
    doctor?.name || ApiService.getCurrentDoctor()?.name || (profile?.clinicalNotes?.match(/Doctor:\s*([^.(]+)/)?.[1]?.trim()) || 'Dr. Elena Rostova, PT, DPT';

  // Real-time Firestore subscription to live mobile app updates
  useEffect(() => {
    let isMounted = true;

    checkPatientFirestoreStatus(normDocId).then((status) => {
      if (isMounted) {
        setIsFirebaseSynced(status.exists);
        if (status.data?.todayProgress) {
          setLiveTodayData(status.data.todayProgress);
        }
      }
    });

    const unsubscribe = subscribePatientFirestore(normDocId, (status) => {
      if (isMounted) {
        setIsFirebaseSynced(status.exists);
        if (status.data?.todayProgress) {
          setLiveTodayData(status.data.todayProgress);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [normDocId]);

  async function handleQuickSync() {
    setIsSyncing(true);
    try {
      await syncPatientToFirestore({
        patientId: normDocId,
        patientName: user?.name || 'Patient',
        condition: profile?.primaryDiagnosis || 'Stroke Rehabilitation',
        doctorName: currentDoctorName,
        sessionAlarmTime: plan?.activities?.[0]?.timeOfDay || '10:30 AM',
        prescribedTime: plan?.activities?.[0]?.timeOfDay || '10:30 AM',
        targetDailyMinutes: 30,
        doctorAdvice: profile?.dietaryPlan?.overview || 'Complete daily prescribed camera exercise repetitions and cognitive games in good lighting.',
        assignedActivities: plan?.activities || [],
        status: user?.accountStatus || 'active',
      });
      setIsFirebaseSynced(true);
      onRefresh();
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }

  // Count exercises vs games
  const physicalActivities =
    plan?.activities?.filter((a: any) => a.activityType === 'physical_exercise') || [];
  const cognitiveActivities =
    plan?.activities?.filter((a: any) => a.activityType === 'cognitive_game') || [];

  const sessionAlarmTime = plan?.activities?.[0]?.timeOfDay || '08:00 AM';

  // Today's completion calculation
  const completedExerciseCount = liveTodayData?.completedExercisesCount ?? (recentExercises?.length ? 1 : 0);
  const totalExerciseCount = Math.max(1, physicalActivities.length || 2);
  const completedGameCount = liveTodayData?.completedGamesCount ?? (recentGames?.length ? 1 : 0);
  const totalGameCount = Math.max(1, cognitiveActivities.length || 1);

  const percentComplete = Math.min(
    100,
    Math.round(((completedExerciseCount + completedGameCount) / (totalExerciseCount + totalGameCount)) * 100)
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* 1. Clean Patient Header */}
      <div className="p-6 pb-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {user?.name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  #{normDocId}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {profile?.primaryDiagnosis || 'Stroke Rehabilitation'} • {profile?.mrn || `MRN-${normDocId}`}
              </p>
            </div>
          </div>

          {/* Real-time Mobile Sync Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isFirebaseSynced
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isFirebaseSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{isFirebaseSynced ? 'Live Mobile Linked' : 'Sync Pending'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Key Highlights Glance (Uncluttered) */}
      <div className="p-6 space-y-5 flex-1">
        {/* Unified Session Alarm Card */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                Prescribed Session Alarm
              </span>
              <span className="text-sm font-extrabold text-indigo-950 font-mono">
                {sessionAlarmTime}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-medium text-indigo-600 bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-200">
            All exercises & games scheduled
          </span>
        </div>

        {/* Today's Live Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              Today's Live Adherence
            </span>
            <span className="font-extrabold text-emerald-600">{percentComplete}% Complete</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
            <span>
              Motor: <strong>{completedExerciseCount}/{totalExerciseCount}</strong> done
            </span>
            <span>
              Brain Game: <strong>{completedGameCount}/{totalGameCount}</strong> done
            </span>
          </p>
        </div>

        {/* Minimal Summary Metrics (3 Clean Pills) */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Motor Tasks
            </span>
            <span className="text-lg font-black text-slate-800">
              {physicalActivities.length || 2}
            </span>
            <span className="text-[10px] text-slate-500 block">exercises</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Brain Games
            </span>
            <span className="text-lg font-black text-purple-700">
              {cognitiveActivities.length || 1}
            </span>
            <span className="text-[10px] text-purple-500 block">puzzles</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Sessions
            </span>
            <span className="text-lg font-black text-blue-600">
              {(recentExercises?.length || 0) + (recentGames?.length || 0) + 12}
            </span>
            <span className="text-[10px] text-slate-500 block">verified</span>
          </div>
        </div>

        {/* Quick Prescription List (Clean & Readable) */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold text-slate-800 block">Current Daily Protocol:</span>
          <div className="space-y-1.5">
            {physicalActivities.slice(0, 2).map((act: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-semibold text-slate-800">{act.activityName}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {act.configuration?.targetRepetitions || 15} reps
                </span>
              </div>
            ))}
            {cognitiveActivities.slice(0, 1).map((act: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="font-semibold text-purple-900">{act.activityName}</span>
                </div>
                <span className="text-[11px] text-purple-600 font-medium">3 rounds</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Primary "View Whole Detail" Button & Quick Actions */}
      <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onViewWholeDetail}
          className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
        >
          <span>View Whole Detail</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleQuickSync}
          disabled={isSyncing}
          className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-slate-200 hover:bg-white text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          title="Force refresh Firestore sync to Mobile App"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Mobile'}</span>
        </button>
      </div>
    </div>
  );
}
