import 'dart:async';
import '../models/models.dart';
import '../api/api_client.dart';

class SyncQueueItem {
  final String id;
  final String type; // 'exercise' or 'cognitive'
  final Map<String, dynamic> payload;
  final DateTime queuedAt;
  int retryAttempts;
  SyncStatus status;
  String? lastError;

  SyncQueueItem({
    required this.id,
    required this.type,
    required this.payload,
    required this.queuedAt,
    this.retryAttempts = 0,
    this.status = SyncStatus.waitingToSync,
    this.lastError,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'payload': payload,
        'queuedAt': queuedAt.toIso8601String(),
        'retryAttempts': retryAttempts,
        'status': status.toString(),
        'lastError': lastError,
      };
}

/// Offline-first Synchronization Engine for NeuroRehab Connect
class RehabSyncService {
  final NeuroRehabApiClient apiClient;
  final List<SyncQueueItem> _queue = [];
  final StreamController<SyncStatus> _syncStatusController = StreamController<SyncStatus>.broadcast();

  bool _isSyncing = false;
  Timer? _periodicSyncTimer;

  RehabSyncService({required this.apiClient}) {
    // Start periodic background queue sync (every 60 seconds)
    _periodicSyncTimer = Timer.periodic(const Duration(seconds: 60), (_) => flushQueue());
  }

  Stream<SyncStatus> get syncStatusStream => _syncStatusController.stream;
  List<SyncQueueItem> get pendingQueue => List.unmodifiable(_queue.where((i) => i.status != SyncStatus.synced));

  /// Queue an exercise session for synchronization
  Future<SyncStatus> queueExerciseSession(ExerciseSession session) async {
    final item = SyncQueueItem(
      id: session.sessionId,
      type: 'exercise',
      payload: session.toJson(),
      queuedAt: DateTime.now(),
      status: SyncStatus.waitingToSync,
    );

    _queue.add(item);
    session.syncStatus = SyncStatus.waitingToSync;

    // Attempt immediate background sync
    return await _syncSingleItem(item);
  }

  /// Queue a cognitive game session for synchronization
  Future<SyncStatus> queueGameSession(CognitiveGameSession session) async {
    final item = SyncQueueItem(
      id: session.sessionId,
      type: 'cognitive',
      payload: session.toJson(),
      queuedAt: DateTime.now(),
      status: SyncStatus.waitingToSync,
    );

    _queue.add(item);
    session.syncStatus = SyncStatus.waitingToSync;

    return await _syncSingleItem(item);
  }

  /// Synchronize a single item immediately
  Future<SyncStatus> _syncSingleItem(SyncQueueItem item) async {
    item.status = SyncStatus.syncing;
    _syncStatusController.add(SyncStatus.syncing);

    try {
      if (item.type == 'exercise') {
        await apiClient.post('/api/v1/patient/me/exercise-sessions', item.payload);
      } else {
        await apiClient.post('/api/v1/patient/me/game-sessions', item.payload);
      }

      item.status = SyncStatus.synced;
      _syncStatusController.add(SyncStatus.synced);
      return SyncStatus.synced;
    } catch (e) {
      item.retryAttempts++;
      item.status = SyncStatus.syncFailed;
      item.lastError = e.toString();
      _syncStatusController.add(SyncStatus.syncFailed);
      return SyncStatus.syncFailed;
    }
  }

  /// Flush the entire offline queue in a single batch request
  Future<int> flushQueue() async {
    if (_isSyncing) return 0;
    final itemsToSync = _queue.where((i) => i.status == SyncStatus.waitingToSync || i.status == SyncStatus.syncFailed).toList();
    if (itemsToSync.isEmpty) return 0;

    _isSyncing = true;
    _syncStatusController.add(SyncStatus.syncing);

    int syncedCount = 0;

    try {
      final batchPayload = itemsToSync.map((item) => {
            'type': item.type,
            'payload': item.payload,
          }).toList();

      final res = await apiClient.post('/api/v1/patient/me/sync-batch', {'items': batchPayload});
      final results = (res['results'] as List<dynamic>?) ?? [];

      for (int i = 0; i < itemsToSync.length; i++) {
        final item = itemsToSync[i];
        if (i < results.length) {
          final resultStatus = results[i]['status'];
          if (resultStatus == 'synced' || resultStatus == 'duplicate') {
            item.status = SyncStatus.synced;
            syncedCount++;
          } else {
            item.status = SyncStatus.syncFailed;
            item.retryAttempts++;
          }
        }
      }

      _syncStatusController.add(SyncStatus.synced);
    } catch (e) {
      _syncStatusController.add(SyncStatus.syncFailed);
    } finally {
      _isSyncing = false;
    }

    return syncedCount;
  }

  void dispose() {
    _periodicSyncTimer?.cancel();
    _syncStatusController.close();
  }
}
