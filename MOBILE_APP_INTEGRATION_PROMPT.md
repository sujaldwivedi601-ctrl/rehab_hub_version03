# Mobile App Integration Prompt & Clinical Contract

> **Target Audience:** Mobile App Developer, Mobile AI Coding Agent (Flutter / Kotlin / Swift / React Native).  
> **Purpose:** Implement real-time synchronization between the NeuroRehab Mobile App and the NeuroRehab Connect Physician Portal.

---

## 1. Firebase Firestore Configuration

The mobile app must initialize and connect to the following dedicated Cloud Firestore database:

```json
{
  "projectId": "gen-lang-client-0128874261",
  "projectNumber": "786614798934",
  "apiKey": "AIzaSyCGmbXP49a16SPMEZn_djnKhLLDLpT6s_8",
  "authDomain": "gen-lang-client-0128874261.firebaseapp.com",
  "storageBucket": "gen-lang-client-0128874261.firebasestorage.app",
  "databaseId": "ai-studio-android-neuroreh-8f127a59-721b-4d7b-8210-a5dec4b3557a"
}
```

* **Firestore Collection:** `patients`
* **Document ID:** `{patientId}` (e.g. `"482019"` or the patient's 6-digit code)

---

## 2. Unified Session Alarm Timing Architecture

The doctor sets **ONE unified session alarm time** for the entire daily rehabilitation session (default **08:00 AM**):

```json
{
  "sessionAlarmTime": "08:00 AM",
  "alarmHour": 8,
  "alarmMinute": 0
}
```

### Mobile App Schedule Behavior:
1. Schedule a single daily local notification / alarm at the time defined in `sessionAlarmTime` (e.g., `8:00 AM`).
2. When the patient taps the notification or opens the app at 8:00 AM, the app presents the day's session:
   - First: Prescribed physical motor exercises in `assignedExercises` (with camera ML pose verification).
   - Second: Prescribed brain cognitive exercises in `assignedGames` (e.g., Memory Match).
3. Do **NOT** create separate alarms for each individual exercise.

---

## 3. Firestore Document Schema (`patients/{patientId}`)

```json
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
      "exerciseName": "Knee Raise (Hip Flexor & Quad Control)",
      "targetReps": 12,
      "targetFrequencyPerDay": 1,
      "doctorNotes": "Alternating high-knee lift with upright trunk.",
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
  },
  "updatedAt": "SERVER_TIMESTAMP",
  "status": "active"
}
```

---

## 4. Live Progress Synchronization (Real-Time Live Updates)

Whenever the patient completes an exercise on their phone, the mobile app must immediately trigger either Method A (REST) or Method B (Firestore) so the clinician's website updates live:

### Method A: REST API Endpoint (Recommended for Offline-First Sync Queue)
```http
POST /api/v1/access/patient/{patientCode}/exercise-sessions
Content-Type: application/json

{
  "sessionId": "sess_1728723940123",
  "exerciseId": "arm_raise",
  "exerciseName": "Arm Raise",
  "targetRepetitions": 15,
  "completedRepetitions": 15,
  "validRepetitions": 15,
  "activeDurationSeconds": 120,
  "startedAt": "2026-10-12T08:12:00.000Z",
  "completedAt": "2026-10-12T08:14:00.000Z",
  "relevantMetrics": {
    "romMaxAngle": 118,
    "romMinAngle": 15,
    "formAccuracyPercentage": 96
  }
}
```

For cognitive brain games:
```http
POST /api/v1/access/patient/{patientCode}/game-sessions
Content-Type: application/json

{
  "sessionId": "game_1728723940456",
  "gameId": "memory_match",
  "gameName": "Memory Match",
  "targetRounds": 3,
  "completedRounds": 3,
  "accuracyPercentage": 94,
  "averageResponseTimeMs": 420,
  "startedAt": "2026-10-12T08:20:00.000Z",
  "completedAt": "2026-10-12T08:24:00.000Z"
}
```

### Method B: Direct Firestore Document Update
```dart
final docRef = FirebaseFirestore.instanceFor(
  app: firebaseApp,
  databaseId: 'ai-studio-android-neuroreh-8f127a59-721b-4d7b-8210-a5dec4b3557a',
).collection('patients').doc(patientCode);

await docRef.update({
  'todayProgress.completedExercisesCount': FieldValue.increment(1),
  'todayProgress.lastCompletedName': 'Arm Raise',
  'todayProgress.lastCompletedAt': FieldValue.serverTimestamp(),
  'todayProgress.liveStatus': 'in_progress',
  'updatedAt': FieldValue.serverTimestamp(),
});
```

---

## 5. Summary Checklist for Mobile Team:
- [x] Connect to database `ai-studio-android-neuroreh-8f127a59-721b-4d7b-8210-a5dec4b3557a`.
- [x] Trigger only **ONE alarm** at `sessionAlarmTime` (08:00 AM).
- [x] Separate physical exercises into camera-tracked motor flow and cognitive games into brain session flow.
- [x] Post completed sessions to `/api/v1/access/patient/:code/exercise-sessions` and `/game-sessions`.
