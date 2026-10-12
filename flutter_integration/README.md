# NeuroRehab Connect - Flutter Mobile App Integration Guide

This directory provides the clean architecture client package to connect the existing Flutter mobile application with the shared Node.js/MongoDB backend.

---

## 1. Directory Structure

```
flutter_integration/
├── lib/
│   ├── api/
│   │   ├── api_client.dart         # HTTP client, token storage & auto-refresh interceptor
│   │   └── auth_service.dart       # Login, activation, onboarding & profile management
│   ├── models/
│   │   └── models.dart             # Typed contracts (User, Plan, Activity, Sessions)
│   ├── repositories/
│   │   ├── exercise_session_repository.dart    # Arm Raise camera exercise integration
│   │   └── cognitive_game_session_repository.dart # 13 cognitive games integration
│   └── sync/
│       └── rehab_sync_service.dart  # Offline-first queue, retry & batch sync engine
└── README.md
```

---

## 2. Environment & Network Configuration

In your Flutter app's `main.dart` or configuration module, set the backend API URL dynamically based on environment:

```dart
String getBackendBaseUrl() {
  if (kReleaseMode) {
    // Production Cloud Run HTTPS endpoint
    return 'https://ais-dev-ktlok7bvvh2l2v5hevisku-268839478722.asia-southeast1.run.app';
  } else if (Platform.isAndroid) {
    // Android Emulator host loopback alias (10.0.2.2 routes to host computer port 3000)
    return 'http://10.0.2.2:3000';
  } else if (Platform.isIOS) {
    // iOS Simulator routes to localhost:3000 directly
    return 'http://localhost:3000';
  } else {
    // Physical device over local Wi-Fi: use your workstation's LAN IP
    return 'http://192.168.1.50:3000';
  }
}
```

---

## 3. Connecting the Existing Login Screen

In your existing `login_screen.dart`:

```dart
final apiClient = NeuroRehabApiClient(baseUrl: getBackendBaseUrl());
final authService = AuthService(apiClient: apiClient);
final syncService = RehabSyncService(apiClient: apiClient);
final exerciseRepo = ExerciseSessionRepository(syncService: syncService);
final gameRepo = CognitiveGameSessionRepository(syncService: syncService);

// 1. Regular Login
try {
  final user = await authService.login(
    email: emailController.text.trim(),
    password: passwordController.text,
  );
  
  if (user.mustChangePassword) {
    // Navigate to Change Temporary Password screen
    Navigator.pushReplacementNamed(context, '/change-password');
  } else {
    // Navigate to existing Home Screen
    Navigator.pushReplacementNamed(context, '/home');
  }
} on ApiException catch (e) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(e.message)),
  );
}

// 2. Account Activation with Doctor-provided Code
try {
  final user = await authService.activateAccount(
    activationCode: activationCodeController.text.trim(),
    newPassword: newPasswordController.text,
  );
  Navigator.pushReplacementNamed(context, '/home');
} catch (e) {
  // Show activation error
}
```

---

## 4. Connecting the Existing Arm Raise Camera Exercise

When the patient finishes their Arm Raise set, your pose detection loop yields the tracked metrics. Send them to `ExerciseSessionRepository`:

```dart
await exerciseRepo.recordArmRaiseSession(
  assignedActivityId: currentActivityId,
  startedAt: exerciseStartTime,
  completedAt: DateTime.now(),
  activeDurationSeconds: totalActiveSeconds,
  elapsedDurationSeconds: totalElapsedSeconds,
  targetRepetitions: targetReps,
  completedRepetitions: detectedReps,
  validRepetitions: kinematicsValidReps,
  romMaxAngle: maxAngleDegrees, // e.g. 125.4
  romMinAngle: minAngleDegrees,
  formAccuracyPercentage: formAccuracyScore, // e.g. 91.0
  symmetryScore: symmetryScore, // e.g. 85.0
  patientFeedback: feedbackText,
);
```

The repository immediately stores the record locally (`SyncStatus.savedLocally`), and queues it for transmission. If the phone is offline, it will automatically sync once a connection is detected!

---

## 5. Connecting the 13 Cognitive Games

For any of the 13 neural games (e.g., Memory Match, Reaction Time, Stroop Test, Spatial Recall, Pattern Match, N-Back, Trail Making, Flanker Task, Go/No-Go, Digit Span, Visual Search, Card Sorting, Divided Attention):

```dart
await gameRepo.recordGameSession(
  assignedActivityId: currentActivityId,
  gameId: 'memory_match',
  gameName: 'Memory Match',
  cognitiveDomain: 'working_memory',
  startedAt: gameStartTime,
  completedAt: DateTime.now(),
  durationSeconds: 95,
  score: 820,
  accuracyPercentage: 92,
  reactionTimeMs: 380,
  difficulty: 'medium',
  levelReached: 4,
);
```

---

## 6. Offline Queuing & Synchronization Lifecycle

Each session passes through strict state transitions:
1. `savedLocally`: Stored in local phone SQLite / secure cache. Never lost even on crash or logout.
2. `waitingToSync`: Queued in `RehabSyncService`.
3. `syncing`: In-flight HTTP request with unique UUID `sessionId` ensuring **idempotent** delivery.
4. `synced`: Server acknowledged persistence.
5. `syncFailed`: Network dropped or timeout; retained in queue for exponential backoff retry.
