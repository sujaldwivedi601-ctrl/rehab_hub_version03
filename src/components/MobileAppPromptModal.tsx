import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Code, Sparkles, CheckCircle2, Shield, Bell } from 'lucide-react';

interface MobileAppPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileAppPromptModal({ isOpen, onClose }: MobileAppPromptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const mobileAppPrompt = `You are building the NeuroRehab Mobile App (Flutter / Android / iOS).
Your task is to integrate live bi-directional synchronization with our NeuroRehab Connect clinical backend and Firebase Firestore database.

### 1. Firebase Firestore Configuration
- Project ID: gen-lang-client-0128874261
- Database ID: ai-studio-android-neuroreh-8f127a59-721b-4d7b-8210-a5dec4b3557a
- Target Collection: "patients"
- Document ID: {patientId} (e.g. "482019" or patient 6-digit code)

### 2. Single Unified Session Alarm Timing
The doctor prescribes ONE single session alarm time (e.g. 08:00 AM) stored in:
- sessionAlarmTime: "08:00 AM"
- alarmHour: 8
- alarmMinute: 0
When the clock reaches this time on the phone, trigger a single notification / alarm: "Time for your daily NeuroRehab session!".
All exercises (physical motor exercises in assignedExercises) and brain games (in assignedGames) are performed consecutively during this single session block.

### 3. Patient Document Data Contract in Firestore:
{
  "patientId": "482019",
  "patientName": "Alex Rivera",
  "condition": "Post-MCA Stroke Hemiparesis",
  "doctorName": "Dr. Riya Kewt, MD",
  "clinicName": "Metro Neurosciences Center",
  "sessionAlarmTime": "08:00 AM",
  "alarmHour": 8,
  "alarmMinute": 0,
  "targetDailyMinutes": 30,
  "doctorAdvice": "High protein, omega-3, 2.5L water daily",
  "assignedExercises": [
    {
      "exerciseId": "arm_raise",
      "exerciseName": "Arm Raise (Anterior Deltoid & Flexion)",
      "targetReps": 15,
      "targetFrequencyPerDay": 1,
      "doctorNotes": "Smooth vertical elevation with front camera verification.",
      "category": "CAMERA_VERIFIED",
      "sessionTime": "08:00 AM"
    },
    {
      "exerciseId": "knee_raise",
      "exerciseName": "Knee Raise",
      "targetReps": 12,
      "targetFrequencyPerDay": 1,
      "category": "CAMERA_VERIFIED",
      "sessionTime": "08:00 AM"
    }
  ],
  "assignedGames": [
    {
      "gameId": "memory_match",
      "gameName": "Memory Match",
      "domain": "Working Memory",
      "targetRounds": 3,
      "sessionTime": "08:00 AM"
    }
  ],
  "todayProgress": {
    "completedExercisesCount": 1,
    "totalPrescribedExercises": 2,
    "completedGamesCount": 1,
    "totalPrescribedGames": 1,
    "lastCompletedName": "Arm Raise",
    "lastCompletedAt": "2026-10-12T08:14:00.000Z",
    "liveStatus": "in_progress"
  }
}

### 4. How to Send Live Exercise & Game Completion Events
Whenever the patient completes an exercise with front camera pose estimation, immediately send the session data so the clinician website tracks it LIVE:

METHOD A (Direct REST API Call):
POST https://[YOUR_SERVER_URL]/api/v1/access/patient/{patientCode}/exercise-sessions
Headers: { "Content-Type": "application/json" }
Body:
{
  "sessionId": "sess_1728723940123",
  "exerciseId": "arm_raise",
  "exerciseName": "Arm Raise",
  "targetRepetitions": 15,
  "completedRepetitions": 15,
  "validRepetitions": 15,
  "activeDurationSeconds": 120,
  "relevantMetrics": {
    "romMaxAngle": 118,
    "formAccuracyPercentage": 96
  }
}

METHOD B (Direct Firestore Update on patients/{patientId}):
Update doc("patients", patientCode):
{
  "todayProgress.completedExercisesCount": FieldValue.increment(1),
  "todayProgress.lastCompletedName": "Arm Raise",
  "todayProgress.lastCompletedAt": FieldValue.serverTimestamp(),
  "todayProgress.liveStatus": "in_progress"
}

For Brain Cognitive Games:
POST https://[YOUR_SERVER_URL]/api/v1/access/patient/{patientCode}/game-sessions
Body:
{
  "sessionId": "game_1728723940456",
  "gameId": "memory_match",
  "gameName": "Memory Match",
  "targetRounds": 3,
  "completedRounds": 3,
  "accuracyPercentage": 94,
  "averageResponseTimeMs": 420
}`;

  function handleCopy() {
    navigator.clipboard.writeText(mobileAppPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Mobile App Integration Prompt & Schema</h2>
              <p className="text-xs text-slate-400">
                Copy this prompt and give it to your mobile app developer or AI assistant
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Ready to copy: contains Firestore database details, single 8:00 AM alarm rule, schemas, and live endpoints.
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Prompt'}</span>
            </button>
          </div>

          {/* Pre-formatted prompt container */}
          <div className="relative bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-[50vh]">
            <pre className="whitespace-pre-wrap">{mobileAppPrompt}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Saved permanently to <code className="font-mono text-slate-700">MOBILE_APP_INTEGRATION_PROMPT.md</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
