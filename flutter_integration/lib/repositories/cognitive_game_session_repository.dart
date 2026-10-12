import 'dart:math';
import '../models/models.dart';
import '../sync/rehab_sync_service.dart';

/// Integrates with the existing 13 cognitive and neural games:
/// 1. Memory Match
/// 2. Reaction Time
/// 3. Stroop Test
/// 4. Spatial Recall
/// 5. Pattern Match
/// 6. N-Back
/// 7. Trail Making
/// 8. Flanker Task
/// 9. Go/No-Go
/// 10. Digit Span
/// 11. Visual Search
/// 12. Card Sorting
/// 13. Divided Attention
class CognitiveGameSessionRepository {
  final RehabSyncService syncService;
  final List<CognitiveGameSession> _localHistory = [];

  CognitiveGameSessionRepository({required this.syncService});

  List<CognitiveGameSession> get localHistory => List.unmodifiable(_localHistory);

  /// Records a cognitive game result from any of the 13 games
  Future<CognitiveGameSession> recordGameSession({
    String? assignedActivityId,
    required String gameId,
    required String gameName,
    required String cognitiveDomain,
    required DateTime startedAt,
    required DateTime completedAt,
    required int durationSeconds,
    required int score,
    required int accuracyPercentage,
    int? reactionTimeMs,
    String difficulty = 'medium',
    int levelReached = 1,
  }) async {
    final sessionId = 'cgs_${DateTime.now().millisecondsSinceEpoch}_${Random().nextInt(9999)}';

    final session = CognitiveGameSession(
      sessionId: sessionId,
      assignedActivityId: assignedActivityId,
      gameId: gameId,
      gameName: gameName,
      cognitiveDomain: cognitiveDomain,
      startedAt: startedAt,
      completedAt: completedAt,
      durationSeconds: durationSeconds,
      score: score,
      accuracyPercentage: accuracyPercentage,
      reactionTimeMs: reactionTimeMs,
      difficulty: difficulty,
      levelReached: levelReached,
      sessionStatus: 'completed',
      syncStatus: SyncStatus.savedLocally,
    );

    // 1. Save locally to device storage immediately
    _localHistory.insert(0, session);

    // 2. Queue for background server sync
    await syncService.queueGameSession(session);

    return session;
  }

  /// Retrieve sessions for local dashboard display
  List<CognitiveGameSession> getSessions({String? gameId}) {
    if (gameId == null) return _localHistory;
    return _localHistory.where((s) => s.gameId == gameId).toList();
  }
}
