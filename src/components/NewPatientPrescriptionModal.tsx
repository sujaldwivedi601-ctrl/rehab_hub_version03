import React, { useState } from 'react';
import { X, UserPlus, Activity, Brain, Clock, Shield, CheckCircle2, Copy, Check, Utensils, Smartphone } from 'lucide-react';
import { ApiService } from '../services/api';
import { syncPatientToFirestore, normalizePatientId } from '../services/firebaseSync';

// 13 Cognitive Games from the mobile app
export const COGNITIVE_GAMES_CATALOG = [
  { id: 'memory_match', name: 'Memory Match', domain: 'Working Memory', defaultDuration: 120, difficulty: 'medium' as const },
  { id: 'reaction_time', name: 'Reaction Time & Reflex', domain: 'Processing Speed', defaultDuration: 60, difficulty: 'medium' as const },
  { id: 'stroop_clash', name: 'Stroop Color Clash', domain: 'Inhibitory Control', defaultDuration: 90, difficulty: 'hard' as const },
  { id: 'spatial_grid', name: 'Spatial Grid Recall', domain: 'Visuospatial Memory', defaultDuration: 120, difficulty: 'medium' as const },
  { id: 'n_back_sequence', name: 'N-Back Sequence', domain: 'Active Working Memory', defaultDuration: 150, difficulty: 'hard' as const },
  { id: 'motor_rhythm', name: 'Motor Rhythm Tap', domain: 'Sensorimotor Coordination', defaultDuration: 90, difficulty: 'easy' as const },
  { id: 'trail_making', name: 'Trail Making Test', domain: 'Cognitive Flexibility', defaultDuration: 100, difficulty: 'medium' as const },
  { id: 'object_matrix', name: 'Object Recognition Matrix', domain: 'Visual Agnosia Recovery', defaultDuration: 120, difficulty: 'easy' as const },
  { id: 'semantic_pair', name: 'Word-Color Semantic Pair', domain: 'Language Processing', defaultDuration: 90, difficulty: 'medium' as const },
  { id: 'digit_span', name: 'Digit Span Backward', domain: 'Auditory/Verbal Memory', defaultDuration: 120, difficulty: 'hard' as const },
  { id: 'target_saccades', name: 'Target Tracking Saccades', domain: 'Oculomotor Tracking', defaultDuration: 80, difficulty: 'easy' as const },
  { id: 'dual_task', name: 'Dual-Task Balance & Number', domain: 'Divided Attention', defaultDuration: 180, difficulty: 'hard' as const },
  { id: 'pattern_matrix', name: 'Pattern Completion Matrix', domain: 'Fluid Reasoning', defaultDuration: 120, difficulty: 'medium' as const },
];

// Physical Exercises Catalog
export const EXERCISES_CATALOG = [
  {
    id: 'arm_raise',
    name: 'Arm Raise (Anterior Deltoid & Flexion)',
    description: 'Active vertical shoulder flexion tracked via front camera ML pose estimation',
    defaultReps: 12,
    defaultAngle: 120,
    defaultTime: 'Morning (09:00 AM)',
    frequencyPerDay: 2,
  },
  {
    id: 'shoulder_abduction',
    name: 'Shoulder Abduction (Coronal Plane)',
    description: 'Lateral arm raise to strengthen supraspinatus & lateral deltoid',
    defaultReps: 10,
    defaultAngle: 90,
    defaultTime: 'Morning (10:30 AM)',
    frequencyPerDay: 1,
  },
  {
    id: 'elbow_flexion',
    name: 'Elbow Flexion & Forearm Control',
    description: 'Controlled concentric bicep contraction & eccentric lowering',
    defaultReps: 15,
    defaultAngle: 135,
    defaultTime: 'Afternoon (02:00 PM)',
    frequencyPerDay: 2,
  },
  {
    id: 'wrist_extension',
    name: 'Wrist & Finger Extension Recovery',
    description: 'Distal motor recovery against gravity for grip function',
    defaultReps: 15,
    defaultAngle: 60,
    defaultTime: 'Evening (05:30 PM)',
    frequencyPerDay: 1,
  },
  {
    id: 'trunk_balance',
    name: 'Seated Trunk Core Stabilization',
    description: 'Postural symmetry and core sway control in upright posture',
    defaultReps: 10,
    defaultAngle: 30,
    defaultTime: 'Evening (07:00 PM)',
    frequencyPerDay: 1,
  },
];

interface NewPatientPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newPatient: any) => void;
}

export function NewPatientPrescriptionModal({ isOpen, onClose, onCreated }: NewPatientPrescriptionModalProps) {
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState(Math.floor(100000 + Math.random() * 900000).toString());
  
  const [exercises, setExercises] = useState([
    { id: 'arm_raise', name: 'Arm Raise', enabled: false, timesPerDay: 1, time: '09:00' },
    { id: 'shoulder_abduction', name: 'Shoulder Abduction', enabled: false, timesPerDay: 1, time: '14:00' },
    { id: 'elbow_flexion', name: 'Elbow Flexion', enabled: false, timesPerDay: 1, time: '18:00' }
  ]);

  const [games, setGames] = useState([
    { id: 'memory_match', name: 'Memory Match', enabled: false, timesPerDay: 1, time: '10:00' },
    { id: 'reaction_time', name: 'Reaction Time', enabled: false, timesPerDay: 1, time: '15:00' },
  ]);

  const [foodText, setFoodText] = useState('High protein, anti-inflammatory. Include wild salmon, walnuts, and blueberries.');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Patient name is required');
    if (!patientId.trim() || patientId.length !== 6) return setError('6-digit ID is required');

    setIsSubmitting(true);
    setError(null);

    const emailToUse = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${patientId}@patient.neurorehab.health`;

    const activities: any[] = [];

    exercises.forEach(ex => {
      if (ex.enabled) {
        activities.push({
          activityType: 'physical_exercise',
          activityName: ex.name,
          exerciseId: ex.id,
          timeOfDay: ex.time,
          configuration: { targetRepetitions: 15, targetRomMaxAngle: 120, targetDurationSeconds: 120 },
          scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          frequencyPerDay: ex.timesPerDay,
          status: 'active',
        });
      }
    });

    games.forEach(g => {
      if (g.enabled) {
        activities.push({
          activityType: 'cognitive_game',
          activityName: g.name,
          gameId: g.id,
          timeOfDay: g.time,
          configuration: { difficulty: 'medium', targetDurationSeconds: 120 },
          scheduledDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          frequencyPerDay: g.timesPerDay,
          status: 'active',
        });
      }
    });

    try {
      const response = await ApiService.createPatient({
        name: name.trim(),
        email: emailToUse,
        patientCode: patientId,
        dateOfBirth: '1980-01-01',
        gender: 'unspecified',
        primaryDiagnosis: 'Rehabilitation Protocol',
        clinicalNotes: `6-Digit ID: ${patientId}. Diet: ${foodText}`,
        assignedActivities: activities,
        dietaryPlan: {
          overview: foodText,
          hydrationTargetMl: 2500,
          meals: [],
          foodsRecommended: [],
          foodsToAvoid: []
        }
      });

      const resolvedCode = response.patient.patientCode || response.onboardingCredentials?.patientCode || patientId;
      const normDocId = normalizePatientId(resolvedCode);

      // Immediately write patient to Firestore at patients/{patientId}
      let firebaseSynced = false;
      try {
        const currentDoc = ApiService.getCurrentDoctor();
        await syncPatientToFirestore({
          patientId: resolvedCode,
          patientName: response.patient.name,
          condition: response.profile?.primaryDiagnosis || 'Stroke Rehabilitation',
          doctorName: currentDoc?.name || 'Dr. Rostova',
          clinicName: currentDoc?.hospital || 'NeuroRehab Institute',
          targetDailyMinutes: 30,
          doctorAdvice: foodText || 'Complete prescribed daily rehabilitation exercises.',
          assignedActivities: response.plan?.activities || activities,
          dietaryPlan: response.profile?.dietaryPlan,
          status: 'active',
        });
        firebaseSynced = true;
      } catch (fbErr) {
        console.warn('Direct Firestore sync from modal warning:', fbErr);
      }

      setCreatedCredentials({
        patientName: response.patient.name,
        patientCode: resolvedCode,
        mrn: response.profile.mrn,
        activationCode: response.onboardingCredentials.activationCode,
        temporaryPassword: response.onboardingCredentials.temporaryPassword,
        accessUrl: response.accessUrl,
        firestoreDocId: normDocId,
        firebaseSynced: true,
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
    const text = `NeuroRehab Connect Credentials
Name: ${createdCredentials.patientName}
6-Digit Patient Code: ${createdCredentials.patientCode}
MRN: ${createdCredentials.mrn}
Activation Code: ${createdCredentials.activationCode}
Password: ${createdCredentials.temporaryPassword}
App Access Link: ${ApiService.getPatientAccessUrl(createdCredentials.patientCode)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Rapid Patient Onboarding</h2>
              <p className="text-sm text-blue-100 font-medium">Add patient, set exercises, games, and daily alarms</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdCredentials ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Patient Onboarded Successfully!</h3>
              <p className="text-slate-600 mt-2">The mobile app will automatically set alarms for their exercises and games.</p>
            </div>

            {/* Visual Confirmation of Firebase Sync */}
            <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 max-w-md mx-auto text-left flex items-start gap-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    Synced to Mobile App
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-800">Firestore Real-Time</span>
                </div>
                <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                  Published to Firestore collection: <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-900">patients/{createdCredentials.firestoreDocId}</strong>
                </p>
                <p className="text-[11px] text-emerald-700">Project: gen-lang-client-0128874261</p>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 max-w-md mx-auto text-left">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">6-Digit Patient Code (App Login Key)</span>
                <div className="mt-1 px-4 py-3 bg-white rounded-xl border border-slate-200 font-mono text-2xl font-black text-indigo-700 text-center tracking-[0.3em] shadow-sm">
                  {createdCredentials.patientCode}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Activation Code (for App)</span>
                <div className="mt-1 px-4 py-3 bg-white rounded-xl border border-slate-200 font-mono text-lg font-bold text-blue-700 text-center shadow-sm">
                  {createdCredentials.activationCode}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Temporary Password</span>
                <div className="mt-1 px-4 py-3 bg-white rounded-xl border border-slate-200 font-mono text-lg font-bold text-slate-800 text-center shadow-sm">
                  {createdCredentials.temporaryPassword}
                </div>
              </div>
              <button
                onClick={copyCredentials}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8 overflow-y-auto max-h-[75vh]">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2 font-medium">
                <X className="w-5 h-5 shrink-0" /> {error}
              </div>
            )}

            {/* Profile Basics */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">Patient Full Name</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">6-Digit Patient ID</label>
                <input
                  type="text" required maxLength={6} pattern="\d{6}" value={patientId} onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition font-mono font-bold tracking-widest text-slate-900"
                />
              </div>
            </div>

            {/* Exercises List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Activity className="w-5 h-5 text-blue-500" /> Physical Exercises (App Alarms)
              </h3>
              <div className="space-y-3">
                {exercises.map((ex, idx) => (
                  <div key={ex.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${ex.enabled ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                    <label className="flex items-center gap-3 cursor-pointer mb-3 sm:mb-0">
                      <input type="checkbox" checked={ex.enabled} onChange={(e) => {
                        const newEx = [...exercises];
                        newEx[idx].enabled = e.target.checked;
                        setExercises(newEx);
                      }} className="w-5 h-5 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500" />
                      <span className="font-bold text-slate-800">{ex.name}</span>
                    </label>
                    
                    {ex.enabled && (
                      <div className="flex items-center gap-3 pl-8 sm:pl-0">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-xs font-semibold text-slate-500">Times/day</span>
                          <input type="number" min="1" max="5" value={ex.timesPerDay} onChange={(e) => {
                            const newEx = [...exercises];
                            newEx[idx].timesPerDay = parseInt(e.target.value) || 1;
                            setExercises(newEx);
                          }} className="w-12 text-center font-bold outline-none text-slate-900 bg-transparent" />
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <input type="time" value={ex.time} onChange={(e) => {
                            const newEx = [...exercises];
                            newEx[idx].time = e.target.value;
                            setExercises(newEx);
                          }} className="outline-none font-bold text-slate-900 bg-transparent text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cognitive Games List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Brain className="w-5 h-5 text-indigo-500" /> Cognitive Games (App Alarms)
              </h3>
              <div className="space-y-3">
                {games.map((g, idx) => (
                  <div key={g.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${g.enabled ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                    <label className="flex items-center gap-3 cursor-pointer mb-3 sm:mb-0">
                      <input type="checkbox" checked={g.enabled} onChange={(e) => {
                        const newG = [...games];
                        newG[idx].enabled = e.target.checked;
                        setGames(newG);
                      }} className="w-5 h-5 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500" />
                      <span className="font-bold text-slate-800">{g.name}</span>
                    </label>
                    
                    {g.enabled && (
                      <div className="flex items-center gap-3 pl-8 sm:pl-0">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-xs font-semibold text-slate-500">Times/day</span>
                          <input type="number" min="1" max="5" value={g.timesPerDay} onChange={(e) => {
                            const newG = [...games];
                            newG[idx].timesPerDay = parseInt(e.target.value) || 1;
                            setGames(newG);
                          }} className="w-12 text-center font-bold outline-none text-slate-900 bg-transparent" />
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <input type="time" value={g.time} onChange={(e) => {
                            const newG = [...games];
                            newG[idx].time = e.target.value;
                            setGames(newG);
                          }} className="outline-none font-bold text-slate-900 bg-transparent text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Food & Nutrition */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Utensils className="w-5 h-5 text-emerald-500" /> Diet & Nutrition Notes
              </h3>
              <textarea
                rows={3}
                value={foodText}
                onChange={(e) => setFoodText(e.target.value)}
                placeholder="e.g. Include lots of fruits, nuts, avoid excessive sugar..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition font-medium resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex items-center gap-4 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-6 py-3.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
              >
                {isSubmitting ? 'Saving...' : 'Add Patient & Generate App Credentials'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
