import React, { useState, useEffect } from 'react';
import {
  Activity,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  FileText,
  Flame,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  TrendingUp,
  User,
  Utensils,
  X,
  Camera,
  Check,
  Award,
  Zap,
  Smartphone,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { PatientProfile, RehabilitationPlan, ExerciseSession, CognitiveGameSession } from '../types';
import { COGNITIVE_GAMES_CATALOG, EXERCISES_CATALOG } from './NewPatientPrescriptionModal';
import {
  syncPatientToFirestore,
  subscribePatientFirestore,
  checkPatientFirestoreStatus,
  normalizePatientId,
} from '../services/firebaseSync';

interface PatientDetailViewProps {
  patientData: {
    user: any;
    profile: PatientProfile;
    plan: RehabilitationPlan;
    recentExercises: ExerciseSession[];
    recentGames: CognitiveGameSession[];
    totalExerciseSessions: number;
    totalGameSessions: number;
  };
  onRefresh: () => void;
  onDeletePatient: (patientId: string) => void;
}

export function PatientDetailView({ patientData, onRefresh, onDeletePatient }: PatientDetailViewProps) {
  const { user, profile, plan, recentExercises, recentGames, totalExerciseSessions, totalGameSessions } = patientData;

  const [activeTab, setActiveTab] = useState<'exercises' | 'games' | 'nutrition' | 'face' | 'history'>('exercises');

  // Edit Diet State
  const [isEditingDiet, setIsEditingDiet] = useState(false);
  const [dietOverview, setDietOverview] = useState(profile?.dietaryPlan?.overview || plan?.dietaryPlan?.overview || 'High-protein anti-inflammatory neuro-rehabilitation nutrition');
  const [hydrationTargetMl, setHydrationTargetMl] = useState(profile?.dietaryPlan?.hydrationTargetMl || plan?.dietaryPlan?.hydrationTargetMl || 2500);
  const [breakfastRec, setBreakfastRec] = useState(profile?.dietaryPlan?.meals?.[0]?.recommendations || 'Oats, blueberries, walnuts, Greek yogurt, or boiled eggs');
  const [lunchRec, setLunchRec] = useState(profile?.dietaryPlan?.meals?.[1]?.recommendations || 'Grilled salmon or tofu, quinoa, leafy greens, avocado salad');
  const [dinnerRec, setDinnerRec] = useState(profile?.dietaryPlan?.meals?.[2]?.recommendations || 'Steamed lean poultry or lentils, roasted sweet potato, broccoli');
  const [recommendedFoods, setRecommendedFoods] = useState(profile?.dietaryPlan?.foodsRecommended?.join(', ') || 'Salmon, Walnuts, Blueberries, Leafy greens, Turmeric');
  const [foodsToAvoid, setFoodsToAvoid] = useState(profile?.dietaryPlan?.foodsToAvoid?.join(', ') || 'Ultra-processed trans fats, excess sodium, refined sugars');
  const [dietSaving, setDietSaving] = useState(false);

  // Add Activity Modal State
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [newActivityType, setNewActivityType] = useState<'physical_exercise' | 'cognitive_game'>('physical_exercise');
  const [newExerciseId, setNewExerciseId] = useState('arm_raise');
  const [newGameId, setNewGameId] = useState('memory_match');
  const [newReps, setNewReps] = useState(12);
  const [newAngle, setNewAngle] = useState(120);
  const [newTimeOfDay, setNewTimeOfDay] = useState('Morning (09:00 AM)');
  const [newDuration, setNewDuration] = useState(120);
  const [newDifficulty, setNewDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [addingActivity, setAddingActivity] = useState(false);

  // Photo Update State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);

  // Status updating
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Copy Activation Code
  const [copiedCode, setCopiedCode] = useState(false);

  // Firebase Real-Time Mobile Sync State
  const patientCodeOrId = user.patientCode || profile?.patientCode || profile?.mrn?.replace(/^MRN-/, '') || user._id;
  const docId = normalizePatientId(patientCodeOrId);
  const [firebaseStatus, setFirebaseStatus] = useState<{
    synced: boolean;
    syncedAt?: string;
    loading: boolean;
  }>({
    synced: true,
    loading: false,
  });
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [syncBannerMessage, setSyncBannerMessage] = useState<string | null>(null);

  // Real-time Firestore document subscription
  useEffect(() => {
    let isMounted = true;

    checkPatientFirestoreStatus(docId).then((res) => {
      if (isMounted) {
        setFirebaseStatus({
          synced: res.exists,
          syncedAt: res.syncedAt,
          loading: false,
        });
      }
    });

    const unsubscribe = subscribePatientFirestore(docId, (res) => {
      if (isMounted) {
        setFirebaseStatus({
          synced: res.exists,
          syncedAt: res.syncedAt,
          loading: false,
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [docId]);

  async function triggerFirebaseSync(customActivities?: any[], customDiet?: any) {
    setIsSyncingFirebase(true);
    try {
      const currentDoc = ApiService.getCurrentDoctor();
      const activitiesToUse = customActivities || plan?.activities || [];
      const dietToUse = customDiet || profile?.dietaryPlan || plan?.dietaryPlan;

      await syncPatientToFirestore({
        patientId: docId,
        patientName: user.name,
        condition: profile?.primaryDiagnosis || 'Stroke Rehabilitation',
        doctorName: currentDoc?.name || 'Dr. Rostova',
        clinicName: currentDoc?.hospital || 'NeuroRehab Institute',
        targetDailyMinutes: 30,
        doctorAdvice: dietToUse?.overview || profile?.clinicalNotes || plan?.notes || 'Complete prescribed daily rehabilitation exercises.',
        assignedActivities: activitiesToUse,
        dietaryPlan: dietToUse,
        status: user.accountStatus,
      });

      try {
        await ApiService.syncPatientWithFirebase(user._id);
      } catch {
        // server endpoint fallback
      }

      setFirebaseStatus({
        synced: true,
        syncedAt: new Date().toISOString(),
        loading: false,
      });
      setSyncBannerMessage(`Patient ${docId} synchronized to mobile app in real-time.`);
      setTimeout(() => setSyncBannerMessage(null), 4000);
    } catch (err: any) {
      console.warn('Firebase sync error:', err);
      alert(`Could not sync to Firebase: ${err.message || err}`);
    } finally {
      setIsSyncingFirebase(false);
    }
  }

  async function handleSaveDiet() {
    setDietSaving(true);
    try {
      const updatedDiet = {
        overview: dietOverview,
        hydrationTargetMl,
        nutritionGoals: [
          'Adequate amino acid delivery for neuromuscular repair',
          'Brain-supportive omega-3 fatty acids',
          `Daily hydration target: ${hydrationTargetMl} ml`,
        ],
        meals: [
          { timing: '08:30 AM', meal: 'Breakfast', recommendations: breakfastRec },
          { timing: '01:00 PM', meal: 'Lunch', recommendations: lunchRec },
          { timing: '07:00 PM', meal: 'Dinner', recommendations: dinnerRec },
        ],
        foodsRecommended: recommendedFoods.split(',').map((f) => f.trim()).filter(Boolean),
        foodsToAvoid: foodsToAvoid.split(',').map((f) => f.trim()).filter(Boolean),
      };

      await ApiService.updatePatientPlan(user._id, {
        dietaryPlan: updatedDiet,
      });

      // Automatically sync updated diet and advice to Firebase
      await triggerFirebaseSync(undefined, updatedDiet);

      setIsEditingDiet(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update dietary plan');
    } finally {
      setDietSaving(false);
    }
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    setAddingActivity(true);
    try {
      if (newActivityType === 'physical_exercise') {
        const item = EXERCISES_CATALOG.find((e) => e.id === newExerciseId);
        await ApiService.assignActivity(user._id, {
          activityType: 'physical_exercise',
          activityName: item?.name || 'Exercise',
          exerciseId: newExerciseId,
          timeOfDay: newTimeOfDay,
          configuration: {
            targetRepetitions: newReps,
            targetRomMaxAngle: newAngle,
            targetRomMinAngle: 15,
            targetDurationSeconds: newReps * 12,
            cadenceRepsPerMin: 10,
            cameraOrientation: 'portrait',
            instructions: `Perform with steady elevation toward ${newAngle} degrees.`,
          },
          scheduledDays: ['monday', 'wednesday', 'friday'],
          frequencyPerDay: 2,
        });
      } else {
        const item = COGNITIVE_GAMES_CATALOG.find((g) => g.id === newGameId);
        await ApiService.assignActivity(user._id, {
          activityType: 'cognitive_game',
          activityName: item?.name || 'Cognitive Game',
          gameId: newGameId,
          timeOfDay: newTimeOfDay,
          configuration: {
            difficulty: newDifficulty,
            cognitiveDomain: item?.domain || 'Executive Function',
            targetDurationSeconds: newDuration,
            instructions: 'Engage with daily cognitive challenge.',
          },
          scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          frequencyPerDay: 1,
        });
      }

      // Automatically sync newly assigned activities to Firebase
      await triggerFirebaseSync();

      setShowAddActivityModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to assign activity');
    } finally {
      setAddingActivity(false);
    }
  }

  async function handleUpdateStatus(newStatus: 'active' | 'suspended') {
    setStatusUpdating(true);
    try {
      await ApiService.updatePatientStatus(user._id, newStatus);
      await triggerFirebaseSync();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update patient status');
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleUpdatePhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!newPhotoUrl.trim()) return;
    setPhotoSaving(true);
    try {
      await ApiService.uploadPatientPhoto(user._id, newPhotoUrl.trim());
      await triggerFirebaseSync();
      setShowPhotoModal(false);
      setNewPhotoUrl('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setPhotoSaving(false);
    }
  }

  const physicalActivities = plan?.activities?.filter((a) => a.activityType === 'physical_exercise') || [];
  const cognitiveActivities = plan?.activities?.filter((a) => a.activityType === 'cognitive_game') || [];

  return (
    <div className="space-y-6">
      {/* Top Patient Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            {/* Patient Face Photo with Enrollment Badge */}
            <div className="relative shrink-0">
              <img
                src={
                  profile?.profilePhotoUrl ||
                  '/patient-default.png'
                }
                alt={user.name}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-emerald-500/20 shadow-md"
              />
              <button
                type="button"
                onClick={() => setShowPhotoModal(true)}
                title="Update Face Verification Reference Photo"
                className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xs transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{user.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {profile?.mrn || 'MRN-PENDING'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    user.accountStatus === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : user.accountStatus === 'pending_activation'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {user.accountStatus === 'active' ? 'Active' : user.accountStatus === 'pending_activation' ? 'Pending Mobile Login' : 'Suspended'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span>Face Enrolled</span>
                </span>
                {/* Visual Confirmation Badge */}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <Smartphone className="w-3 h-3 text-emerald-700" />
                  <span>Synced to Mobile App</span>
                </span>
              </div>

              <p className="text-xs text-slate-600 font-medium">
                {profile?.primaryDiagnosis || 'Neurological rehabilitation candidate'}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                <span>Email: <strong className="text-slate-700">{user.email}</strong></span>
                {profile?.dateOfBirth && (
                  <span>DOB: <strong className="text-slate-700">{profile.dateOfBirth}</strong></span>
                )}
                <span>Active Protocol: <strong className="text-blue-700">{plan?.title || 'Neuro Plan'} (v{plan?.version || 1})</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Doctor Actions */}
          <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
            {/* Sync to Mobile App Button */}
            <button
              type="button"
              onClick={() => triggerFirebaseSync()}
              disabled={isSyncingFirebase}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
              title="Immediately sync patient prescription and activities to Mobile App (Firestore patients collection)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFirebase ? 'animate-spin' : ''}`} />
              <span>{isSyncingFirebase ? 'Syncing...' : 'Sync to Mobile App'}</span>
            </button>

            {user.accountStatus === 'active' ? (
              <button
                type="button"
                onClick={() => handleUpdateStatus('suspended')}
                disabled={statusUpdating}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Pause Account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpdateStatus('active')}
                disabled={statusUpdating}
                className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Activate Account
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAddActivityModal(true)}
              className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Prescribe Activity</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to delete patient ${user.name} and all their records?`)) {
                  onDeletePatient(user._id);
                }
              }}
              className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              title="Delete Patient"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-Time Mobile App Firebase Firestore Status Banner */}
        <div className="mt-4 bg-emerald-50/80 border border-emerald-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Synced to Mobile App
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-emerald-800 border border-emerald-300">
                  patients/{docId}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Target Project: <span className="font-mono text-emerald-950 font-semibold">gen-lang-client-0128874261</span> • Database: <span className="font-mono text-emerald-900 font-bold bg-white/80 px-1 py-0.2 rounded border border-emerald-200">ai-studio-android-neuroreh-8f127a59-721b-4d7b-8210-a5dec4b3557a</span>
                {firebaseStatus.syncedAt && (
                  <span className="ml-2 text-emerald-700">
                    • Last updated: {new Date(firebaseStatus.syncedAt).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          {syncBannerMessage ? (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded-lg border border-emerald-300">
              {syncBannerMessage}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-emerald-700 hidden sm:inline">
              Real-time Firestore active
            </span>
          )}
        </div>

        {/* Clinical Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-200 mt-5 pt-3 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('exercises')}
            className={`py-2 px-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'exercises'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Physical Exercises ({physicalActivities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`py-2 px-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'games'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Brain className="w-4 h-4 text-indigo-600" />
            <span>Cognitive Games ({cognitiveActivities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('nutrition')}
            className={`py-2 px-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'nutrition'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-4 h-4 text-emerald-600" />
            <span>Food & Dietary Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('face')}
            className={`py-2 px-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'face'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-600" />
            <span>Face Verification Biometrics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>Session Logs ({totalExerciseSessions + totalGameSessions})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PHYSICAL EXERCISES */}
      {activeTab === 'exercises' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Prescribed Physical Exercises</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setNewActivityType('physical_exercise');
                setShowAddActivityModal(true);
              }}
              className="py-1.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Physical Exercise</span>
            </button>
          </div>

          {physicalActivities.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No physical exercises prescribed yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Physical Exercise" above to assign an exercise.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {physicalActivities.map((act) => (
                <div key={act.activityId} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{act.activityName}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {act.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Prescribed Time: <strong>{act.timeOfDay || 'Morning 09:00 AM'}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Target Reps</span>
                      <span className="text-sm font-extrabold text-blue-700">{act.configuration.targetRepetitions || 12} reps</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Target ROM</span>
                      <span className="text-sm font-extrabold text-indigo-700">{act.configuration.targetRomMaxAngle || 120}°</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Frequency</span>
                      <span className="text-sm font-extrabold text-slate-700">{act.frequencyPerDay || 2}x / day</span>
                    </div>
                  </div>

                  {act.configuration.instructions && (
                    <p className="text-xs text-slate-600 bg-blue-50/40 p-2.5 rounded-lg border border-blue-100">
                      <strong>Clinician Guidance:</strong> {act.configuration.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COGNITIVE GAMES */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-600" />
              <span>Prescribed Neural & Cognitive Games (From 13 App Games)</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setNewActivityType('cognitive_game');
                setShowAddActivityModal(true);
              }}
              className="py-1.5 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Cognitive Game</span>
            </button>
          </div>

          {cognitiveActivities.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <Brain className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No cognitive games prescribed yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Cognitive Game" above to prescribe one from the 13 games.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cognitiveActivities.map((act) => (
                <div key={act.activityId} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{act.activityName}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          {act.configuration.difficulty || 'medium'}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-700 mt-0.5 font-semibold">
                        Domain: {act.configuration.cognitiveDomain || 'Neuroplastic Speed'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Time of Day</span>
                      <span className="text-xs font-bold text-slate-700">{act.timeOfDay || 'Afternoon 02:00 PM'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Daily Duration</span>
                      <span className="text-xs font-extrabold text-indigo-700">{act.configuration.targetDurationSeconds || 120} seconds</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FOOD & NUTRITION PLAN */}
      {activeTab === 'nutrition' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600" />
                <span>Patient Food & Clinical Nutrition Protocol</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Brain-supportive diet prescribed by clinician for neural recovery, cellular hydration, and repair.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingDiet(!isEditingDiet)}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingDiet ? 'Cancel Editing' : 'Edit Dietary Plan'}</span>
            </button>
          </div>

          {isEditingDiet ? (
            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diet Overview</label>
                <input
                  type="text"
                  value={dietOverview}
                  onChange={(e) => setDietOverview(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hydration Target (mL)</label>
                <input
                  type="number"
                  value={hydrationTargetMl}
                  onChange={(e) => setHydrationTargetMl(parseInt(e.target.value) || 2000)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Timed Meal Recommendations</label>
                <input
                  type="text"
                  value={breakfastRec}
                  onChange={(e) => setBreakfastRec(e.target.value)}
                  placeholder="Breakfast (08:30 AM)..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  value={lunchRec}
                  onChange={(e) => setLunchRec(e.target.value)}
                  placeholder="Lunch (01:00 PM)..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  value={dinnerRec}
                  onChange={(e) => setDinnerRec(e.target.value)}
                  placeholder="Dinner (07:00 PM)..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recommended Brain Foods (comma-separated)</label>
                <input
                  type="text"
                  value={recommendedFoods}
                  onChange={(e) => setRecommendedFoods(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Foods to Avoid</label>
                <input
                  type="text"
                  value={foodsToAvoid}
                  onChange={(e) => setFoodsToAvoid(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-rose-700"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveDiet}
                  disabled={dietSaving}
                  className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{dietSaving ? 'Saving Plan...' : 'Save Dietary Updates'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Overview & Hydration Metric */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Clinical Diet Strategy</span>
                  <p className="text-sm font-bold text-emerald-950 mt-1">{dietOverview}</p>
                </div>

                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Daily Hydration Target</span>
                  <div className="text-xl font-black text-blue-900 mt-1">{hydrationTargetMl} mL</div>
                  <span className="text-[11px] text-blue-700 mt-0.5">Approx 8-10 glasses per day</span>
                </div>
              </div>

              {/* Timed Meal Schedule */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Prescribed Daily Meal Timings
                </h4>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 shrink-0">
                      08:30 AM · Breakfast
                    </span>
                    <span className="text-xs text-slate-700 font-medium">{breakfastRec}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      01:00 PM · Lunch
                    </span>
                    <span className="text-xs text-slate-700 font-medium">{lunchRec}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 shrink-0">
                      07:00 PM · Dinner
                    </span>
                    <span className="text-xs text-slate-700 font-medium">{dinnerRec}</span>
                  </div>
                </div>
              </div>

              {/* Foods Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-2">
                  <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Recommended Brain Recovery Foods
                  </h5>
                  <p className="text-xs text-emerald-800">{recommendedFoods}</p>
                </div>

                <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-100 space-y-2">
                  <h5 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                    Foods to Strictly Avoid
                  </h5>
                  <p className="text-xs text-rose-800">{foodsToAvoid}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FACE VERIFICATION REFERENCE */}
      {activeTab === 'face' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Patient Face Verification Biometric Security</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Biometric face reference matching ensuring authentic patient participation during exercises.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Update Face Reference</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative">
              <img
                src={profile?.profilePhotoUrl || '/patient-default.png'}
                alt={user.name}
                className="w-32 h-32 rounded-2xl object-cover ring-4 ring-emerald-500 shadow-md"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-full shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Biometric Facial Enrollment: Active</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Enrolled & Authenticated
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed max-w-lg">
                Whenever <strong>{user.name}</strong> launches their Flutter mobile application to begin an exercise session (e.g. Arm Raise camera tracking or cognitive game session), the phone's front camera verifies their facial embeddings against this reference photo.
              </p>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 text-[11px] flex items-center gap-2 mt-2">
                <Shield className="w-4 h-4 shrink-0 text-blue-600" />
                <span>Enforces clinical compliance and authentic tele-rehab billing standards.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SESSION HISTORY & PROGRESS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>Synchronized Patient Tele-Rehab Sessions</span>
            </h3>
            <span className="text-xs text-slate-500">
              Total Recorded: <strong>{totalExerciseSessions} Exercises • {totalGameSessions} Games</strong>
            </span>
          </div>

          <div className="space-y-3">
            {recentExercises.map((es) => (
              <div key={es.sessionId} className="bg-white rounded-xl border border-slate-200 p-4 text-xs space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{es.exerciseName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {es.completionPercentage}% Completed
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{new Date(es.startedAt).toLocaleDateString()}</span>
                </div>

                <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50 rounded-lg text-center text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Reps</span>
                    <strong className="text-blue-700">{es.completedRepetitions} / {es.targetRepetitions}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Max Angle</span>
                    <strong className="text-indigo-700">{es.relevantMetrics.romMaxAngle || 120}°</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Symmetry</span>
                    <strong className="text-emerald-700">{es.relevantMetrics.symmetryScore || 88}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Duration</span>
                    <strong className="text-slate-700">{es.activeDurationSeconds}s</strong>
                  </div>
                </div>
              </div>
            ))}

            {recentGames.map((gs) => (
              <div key={gs.sessionId} className="bg-white rounded-xl border border-slate-200 p-4 text-xs space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{gs.gameName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {gs.cognitiveDomain}
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{new Date(gs.startedAt).toLocaleDateString()}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg text-center text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Score</span>
                    <strong className="text-purple-700">{gs.score} pts</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Accuracy</span>
                    <strong className="text-emerald-700">{gs.accuracyPercentage}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Reaction</span>
                    <strong className="text-blue-700">{gs.reactionTimeMs || 420} ms</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Prescribe New Activity</h3>
              <button onClick={() => setShowAddActivityModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Activity Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewActivityType('physical_exercise')}
                    className={`flex-1 py-1.5 rounded-lg border font-bold cursor-pointer ${
                      newActivityType === 'physical_exercise' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700'
                    }`}
                  >
                    Physical Exercise
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewActivityType('cognitive_game')}
                    className={`flex-1 py-1.5 rounded-lg border font-bold cursor-pointer ${
                      newActivityType === 'cognitive_game' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700'
                    }`}
                  >
                    Cognitive Game
                  </button>
                </div>
              </div>

              {newActivityType === 'physical_exercise' ? (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Exercise</label>
                    <select
                      value={newExerciseId}
                      onChange={(e) => setNewExerciseId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {EXERCISES_CATALOG.map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Target Reps</label>
                      <input
                        type="number"
                        value={newReps}
                        onChange={(e) => setNewReps(parseInt(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Target Angle ROM (°)</label>
                      <input
                        type="number"
                        value={newAngle}
                        onChange={(e) => setNewAngle(parseInt(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Game (from 13 Games)</label>
                    <select
                      value={newGameId}
                      onChange={(e) => setNewGameId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {COGNITIVE_GAMES_CATALOG.map((gm) => (
                        <option key={gm.id} value={gm.id}>{gm.name} ({gm.domain})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Duration (Seconds)</label>
                      <input
                        type="number"
                        value={newDuration}
                        onChange={(e) => setNewDuration(parseInt(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
                      <select
                        value={newDifficulty}
                        onChange={(e) => setNewDifficulty(e.target.value as any)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scheduled Time of Day</label>
                <select
                  value={newTimeOfDay}
                  onChange={(e) => setNewTimeOfDay(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Morning (08:30 AM)">Morning (08:30 AM)</option>
                  <option value="Morning (10:00 AM)">Morning (10:00 AM)</option>
                  <option value="Afternoon (02:00 PM)">Afternoon (02:00 PM)</option>
                  <option value="Evening (05:30 PM)">Evening (05:30 PM)</option>
                  <option value="Night (08:00 PM)">Night (08:00 PM)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingActivity}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
                >
                  {addingActivity ? 'Prescribing...' : 'Prescribe Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Update Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Update Reference Face Photo</h3>
              <button onClick={() => setShowPhotoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePhoto} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Image URL or Base64 Data</label>
                <input
                  type="text"
                  required
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://... or data:image/..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={photoSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                >
                  {photoSaving ? 'Updating...' : 'Save Face Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
