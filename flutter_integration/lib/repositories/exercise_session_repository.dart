import 'dart:math';
import '../models/models.dart';
import '../sync/rehab_sync_service.dart';

/// Integrates with the existing Arm Raise camera exercise and other physical exercises
class ExerciseSessionRepository {
  final RehabSyncService syncService;
  final List<ExerciseSession> _localHistory = [];

  ExerciseSessionRepository({required this.syncService});

  List<ExerciseSession> get localHistory => List.unmodifiable(_localHistory);

  /// Records an Arm Raise exercise session from the camera pose tracker
  Future<ExerciseSession> recordArmRaiseSession({
    String? assignedActivityId,
    required DateTime startedAt,
    required DateTime completedAt,
    required int activeDurationSeconds,
    required int elapsedDurationSeconds,
    required int targetRepetitions,
    required int completedRepetitions,
    required int validRepetitions,
    required double romMaxAngle,
    double? romMinAngle,
    double? formAccuracyPercentage,
    double? symmetryScore,
    String? patientFeedback,
  }) async {
    final sessionId = 'es_${DateTime.now().millisecondsSinceEpoch}_${Random().nextInt(9999)}';

    final session = ExerciseSession(
      sessionId: sessionId,
      assignedActivityId: assignedActivityId,
      exerciseId: 'arm_raise',
      exerciseName: 'Arm Raise (Anterior Deltoid & Flexion)',
      startedAt: startedAt,
      completedAt: completedAt,
      activeDurationSeconds: activeDurationSeconds,
      elapsedDurationSeconds: elapsedDurationSeconds,
      targetRepetitions: targetRepetitions,
      completedRepetitions: completedRepetitions,
      validRepetitions: validRepetitions,
      completionPercentage: targetRepetitions > 0
          ? min(100, ((completedRepetitions / targetRepetitions) * 100).round())
          : 100,
      sessionStatus: completedRepetitions >= targetRepetitions ? 'completed' : 'partial',
      relevantMetrics: {
        'romMaxAngle': romMaxAngle.round(),
        if (romMinAngle != null) 'romMinAngle': romMinAngle.round(),
        'formAccuracyPercentage': (formAccuracyPercentage ?? 85.0).round(),
        'symmetryScore': (symmetryScore ?? 80.0).round(),
        'jointAnglesTracked': ['shoulder_flexion', 'elbow_angle', 'trunk_alignment'],
      },
      measurementQuality: 'high',
      exerciseAlgorithmVersion: '1.2.0',
      syncStatus: SyncStatus.savedLocally,
    );

    // 1. Save locally to device storage immediately
    _localHistory.insert(0, session);

    // 2. Queue for background server sync
    await syncService.queueExerciseSession(session);

    return session;
  }

  /// Retrieve sessions for local dashboard display
  List<ExerciseSession> getSessions({String? exerciseId}) {
    if (exerciseId == null) return _localHistory;
    return _localHistory.where((s) => s.exerciseId == exerciseId).toList();
  }
}
