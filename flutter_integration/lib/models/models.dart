/// NeuroRehab Connect - Flutter Data Models
/// Shared data contracts matching the Node.js/MongoDB backend schemas.

enum UserRole { doctor, patient, admin }
enum AccountStatus { active, pendingActivation, suspended }
enum ActivityType { physicalExercise, cognitiveGame }
enum SyncStatus { savedLocally, waitingToSync, syncing, synced, syncFailed }

class PatientUser {
  final String id;
  final String name;
  final String email;
  final UserRole role;
  final AccountStatus accountStatus;
  final bool mustChangePassword;

  PatientUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.accountStatus,
    this.mustChangePassword = false,
  });

  factory PatientUser.fromJson(Map<String, dynamic> json) {
    return PatientUser(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] == 'doctor'
          ? UserRole.doctor
          : json['role'] == 'admin'
              ? UserRole.admin
              : UserRole.patient,
      accountStatus: json['accountStatus'] == 'suspended'
          ? AccountStatus.suspended
          : json['accountStatus'] == 'pending_activation'
              ? AccountStatus.pendingActivation
              : AccountStatus.active,
      mustChangePassword: json['mustChangePassword'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'email': email,
        'role': role.toString().split('.').last,
        'accountStatus': accountStatus.toString().split('.').last,
        'mustChangePassword': mustChangePassword,
      };
}

class PatientProfile {
  final String patientId;
  final String mrn;
  final List<String> assignedDoctorIds;
  final String preferredLanguage;
  final String? dateOfBirth;
  final String? primaryDiagnosis;
  final String? clinicalNotes;

  PatientProfile({
    required this.patientId,
    required this.mrn,
    required this.assignedDoctorIds,
    this.preferredLanguage = 'en',
    this.dateOfBirth,
    this.primaryDiagnosis,
    this.clinicalNotes,
  });

  factory PatientProfile.fromJson(Map<String, dynamic> json) {
    return PatientProfile(
      patientId: json['patientId'] ?? '',
      mrn: json['mrn'] ?? '',
      assignedDoctorIds: (json['assignedDoctorIds'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      preferredLanguage: json['preferredLanguage'] ?? 'en',
      dateOfBirth: json['dateOfBirth'],
      primaryDiagnosis: json['primaryDiagnosis'],
      clinicalNotes: json['clinicalNotes'],
    );
  }
}

class AssignedActivity {
  final String activityId;
  final ActivityType activityType;
  final String activityName;
  final String? exerciseId;
  final String? gameId;
  final Map<String, dynamic> configuration;
  final List<String> scheduledDays;
  final int frequencyPerDay;
  final String status;

  AssignedActivity({
    required this.activityId,
    required this.activityType,
    required this.activityName,
    this.exerciseId,
    this.gameId,
    required this.configuration,
    this.scheduledDays = const [],
    this.frequencyPerDay = 1,
    this.status = 'active',
  });

  factory AssignedActivity.fromJson(Map<String, dynamic> json) {
    return AssignedActivity(
      activityId: json['activityId'] ?? '',
      activityType: json['activityType'] == 'cognitive_game'
          ? ActivityType.cognitiveGame
          : ActivityType.physicalExercise,
      activityName: json['activityName'] ?? '',
      exerciseId: json['exerciseId'],
      gameId: json['gameId'],
      configuration: (json['configuration'] as Map<String, dynamic>?) ?? {},
      scheduledDays: (json['scheduledDays'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      frequencyPerDay: json['frequencyPerDay'] ?? 1,
      status: json['status'] ?? 'active',
    );
  }
}

class RehabilitationPlan {
  final String planId;
  final String patientId;
  final String assignedByDoctorId;
  final String title;
  final int version;
  final List<String> clinicalGoals;
  final List<AssignedActivity> activities;

  RehabilitationPlan({
    required this.planId,
    required this.patientId,
    required this.assignedByDoctorId,
    required this.title,
    required this.version,
    this.clinicalGoals = const [],
    this.activities = const [],
  });

  factory RehabilitationPlan.fromJson(Map<String, dynamic> json) {
    return RehabilitationPlan(
      planId: json['planId'] ?? '',
      patientId: json['patientId'] ?? '',
      assignedByDoctorId: json['assignedByDoctorId'] ?? '',
      title: json['title'] ?? 'Rehabilitation Plan',
      version: json['version'] ?? 1,
      clinicalGoals: (json['clinicalGoals'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      activities: (json['activities'] as List<dynamic>?)
              ?.map((a) => AssignedActivity.fromJson(a as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class ExerciseSession {
  final String sessionId;
  final String? assignedActivityId;
  final String exerciseId;
  final String exerciseName;
  final DateTime startedAt;
  final DateTime completedAt;
  final int activeDurationSeconds;
  final int elapsedDurationSeconds;
  final int targetRepetitions;
  final int completedRepetitions;
  final int validRepetitions;
  final int completionPercentage;
  final String sessionStatus;
  final Map<String, dynamic> relevantMetrics;
  final String measurementQuality;
  final String exerciseAlgorithmVersion;
  SyncStatus syncStatus;

  ExerciseSession({
    required this.sessionId,
    this.assignedActivityId,
    required this.exerciseId,
    required this.exerciseName,
    required this.startedAt,
    required this.completedAt,
    required this.activeDurationSeconds,
    required this.elapsedDurationSeconds,
    required this.targetRepetitions,
    required this.completedRepetitions,
    required this.validRepetitions,
    required this.completionPercentage,
    required this.sessionStatus,
    this.relevantMetrics = const {},
    this.measurementQuality = 'high',
    this.exerciseAlgorithmVersion = '1.2.0',
    this.syncStatus = SyncStatus.savedLocally,
  });

  Map<String, dynamic> toJson() => {
        'sessionId': sessionId,
        'assignedActivityId': assignedActivityId,
        'exerciseId': exerciseId,
        'exerciseName': exerciseName,
        'startedAt': startedAt.toIso8601String(),
        'completedAt': completedAt.toIso8601String(),
        'activeDurationSeconds': activeDurationSeconds,
        'elapsedDurationSeconds': elapsedDurationSeconds,
        'targetRepetitions': targetRepetitions,
        'completedRepetitions': completedRepetitions,
        'validRepetitions': validRepetitions,
        'completionPercentage': completionPercentage,
        'sessionStatus': sessionStatus,
        'relevantMetrics': relevantMetrics,
        'measurementQuality': measurementQuality,
        'exerciseAlgorithmVersion': exerciseAlgorithmVersion,
        'clientTimestamp': DateTime.now().toIso8601String(),
      };
}

class CognitiveGameSession {
  final String sessionId;
  final String? assignedActivityId;
  final String gameId;
  final String gameName;
  final String cognitiveDomain;
  final DateTime startedAt;
  final DateTime completedAt;
  final int durationSeconds;
  final int score;
  final int accuracyPercentage;
  final int? reactionTimeMs;
  final String difficulty;
  final int levelReached;
  final String sessionStatus;
  SyncStatus syncStatus;

  CognitiveGameSession({
    required this.sessionId,
    this.assignedActivityId,
    required this.gameId,
    required this.gameName,
    required this.cognitiveDomain,
    required this.startedAt,
    required this.completedAt,
    required this.durationSeconds,
    required this.score,
    required this.accuracyPercentage,
    this.reactionTimeMs,
    this.difficulty = 'medium',
    this.levelReached = 1,
    required this.sessionStatus,
    this.syncStatus = SyncStatus.savedLocally,
  });

  Map<String, dynamic> toJson() => {
        'sessionId': sessionId,
        'assignedActivityId': assignedActivityId,
        'gameId': gameId,
        'gameName': gameName,
        'cognitiveDomain': cognitiveDomain,
        'startedAt': startedAt.toIso8601String(),
        'completedAt': completedAt.toIso8601String(),
        'durationSeconds': durationSeconds,
        'score': score,
        'accuracyPercentage': accuracyPercentage,
        'reactionTimeMs': reactionTimeMs,
        'difficulty': difficulty,
        'levelReached': levelReached,
        'sessionStatus': sessionStatus,
        'clientTimestamp': DateTime.now().toIso8601String(),
      };
}
