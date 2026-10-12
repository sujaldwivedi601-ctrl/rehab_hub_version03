import 'dart:convert';
import 'package:http/http.dart' as http;

/// Token storage contract (compatible with flutter_secure_storage)
abstract class SecureTokenStorage {
  Future<void> saveTokens({required String accessToken, required String refreshToken});
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<void> clearTokens();
}

/// In-memory & preference fallback storage
class InMemoryTokenStorage implements SecureTokenStorage {
  String? _accessToken;
  String? _refreshToken;

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  @override
  Future<String?> getAccessToken() async => _accessToken;

  @override
  Future<String?> getRefreshToken() async => _refreshToken;

  @override
  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? code;

  ApiException({required this.statusCode, required this.message, this.code});

  @override
  String toString() => 'ApiException [$statusCode]: $message';
}

/// NeuroRehab Connect Shared API Client
class NeuroRehabApiClient {
  final String baseUrl;
  final SecureTokenStorage tokenStorage;
  final http.Client _client = http.Client();
  bool _isRefreshing = false;

  NeuroRehabApiClient({
    required this.baseUrl,
    SecureTokenStorage? tokenStorage,
  }) : tokenStorage = tokenStorage ?? InMemoryTokenStorage();

  Future<Map<String, String>> _headers({bool requiresAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requiresAuth) {
      final token = await tokenStorage.getAccessToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Future<dynamic> get(String path, {bool requiresAuth = true}) async {
    return _sendRequest(() async {
      final headers = await _headers(requiresAuth: requiresAuth);
      return _client.get(Uri.parse('$baseUrl$path'), headers: headers);
    }, path: path, requiresAuth: requiresAuth);
  }

  Future<dynamic> post(String path, dynamic body, {bool requiresAuth = true}) async {
    return _sendRequest(() async {
      final headers = await _headers(requiresAuth: requiresAuth);
      return _client.post(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: jsonEncode(body),
      );
    }, path: path, requiresAuth: requiresAuth);
  }

  Future<dynamic> patch(String path, dynamic body, {bool requiresAuth = true}) async {
    return _sendRequest(() async {
      final headers = await _headers(requiresAuth: requiresAuth);
      return _client.patch(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: jsonEncode(body),
      );
    }, path: path, requiresAuth: requiresAuth);
  }

  Future<dynamic> put(String path, dynamic body, {bool requiresAuth = true}) async {
    return _sendRequest(() async {
      final headers = await _headers(requiresAuth: requiresAuth);
      return _client.put(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: jsonEncode(body),
      );
    }, path: path, requiresAuth: requiresAuth);
  }

  Future<dynamic> _sendRequest(
    Future<http.Response> Function() requestFn, {
    required String path,
    required bool requiresAuth,
  }) async {
    var response = await requestFn();

    // Auto-refresh token if expired
    if (response.statusCode == 401 && requiresAuth && !_isRefreshing) {
      final refreshed = await _attemptTokenRefresh();
      if (refreshed) {
        // Retry original request once with new token
        response = await requestFn();
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    }

    // Parse structured server error
    String message = 'Server request failed';
    String? code;
    try {
      final errJson = jsonDecode(response.body);
      message = errJson['message'] ?? errJson['error'] ?? message;
      code = errJson['code'];
    } catch (_) {
      message = response.body.isNotEmpty ? response.body : response.reasonPhrase ?? message;
    }

    throw ApiException(
      statusCode: response.statusCode,
      message: message,
      code: code,
    );
  }

  Future<bool> _attemptTokenRefresh() async {
    _isRefreshing = true;
    try {
      final refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken == null) return false;

      final res = await _client.post(
        Uri.parse('$baseUrl/api/v1/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final tokens = data['tokens'];
        await tokenStorage.saveTokens(
          accessToken: tokens['accessToken'],
          refreshToken: tokens['refreshToken'],
        );
        return true;
      } else {
        // Refresh token invalid or revoked
        await tokenStorage.clearTokens();
        return false;
      }
    } catch (_) {
      return false;
    } finally {
      _isRefreshing = false;
    }
  }

  // ─── 6-digit patient-code access (no auth required) ──────────────────────
  // The patient simply enters their 6-digit code to load their full record.

  /// Absolute link a patient opens / scans with just their 6-digit code.
  String patientAccessUrl(String patientCode) =>
      '$baseUrl/api/v1/access/patient/$patientCode';

  /// Resolves the patient's entire record: profile, plan, exercises,
  /// games, diet, care team and recent sessions.
  Future<dynamic> fetchPatientByCode(String patientCode) {
    return get('/api/v1/access/patient/$patientCode', requiresAuth: false);
  }

  Future<dynamic> fetchPatientSessionsByCode(String patientCode) {
    return get('/api/v1/access/patient/$patientCode/sessions', requiresAuth: false);
  }

  Future<dynamic> syncExerciseSessionByCode(
    String patientCode,
    Map<String, dynamic> session,
  ) {
    return post(
      '/api/v1/access/patient/$patientCode/exercise-sessions',
      session,
      requiresAuth: false,
    );
  }

  Future<dynamic> syncGameSessionByCode(
    String patientCode,
    Map<String, dynamic> session,
  ) {
    return post(
      '/api/v1/access/patient/$patientCode/game-sessions',
      session,
      requiresAuth: false,
    );
  }

  // ─── Full REST resource access (authenticated) ───────────────────────────
  // Every data set collected by the system can be read and updated through the
  // resource endpoints below. All require a bearer access token.

  // Users / accounts
  Future<dynamic> listUsers({String? role}) =>
      get('/api/v1/users${role != null ? '?role=$role' : ''}');
  Future<dynamic> getUser(String userId) => get('/api/v1/users/$userId');
  Future<dynamic> updateUser(String userId, Map<String, dynamic> updates) =>
      patch('/api/v1/users/$userId', updates);

  // Doctors
  Future<dynamic> listDoctors() => get('/api/v1/doctors');
  Future<dynamic> getDoctor(String doctorId) => get('/api/v1/doctors/$doctorId');

  // Patients
  Future<dynamic> listPatients() => get('/api/v1/patients');
  Future<dynamic> getPatient(String patientId) => get('/api/v1/patients/$patientId');
  Future<dynamic> updatePatientProfile(String patientId, Map<String, dynamic> updates) =>
      put('/api/v1/patients/$patientId/profile', updates);
  Future<dynamic> getPatientExerciseSessions(String patientId, {int limit = 50}) =>
      get('/api/v1/patients/$patientId/exercise-sessions?limit=$limit');
  Future<dynamic> getPatientGameSessions(String patientId, {int limit = 50}) =>
      get('/api/v1/patients/$patientId/game-sessions?limit=$limit');

  // Rehabilitation plans
  Future<dynamic> listPlans({String? patientId, String? status}) {
    final params = <String>[];
    if (patientId != null) params.add('patientId=$patientId');
    if (status != null) params.add('status=$status');
    return get('/api/v1/plans${params.isNotEmpty ? '?${params.join('&')}' : ''}');
  }

  Future<dynamic> getPlan(String planId) => get('/api/v1/plans/$planId');
  Future<dynamic> createPlan(Map<String, dynamic> plan) => post('/api/v1/plans', plan);
  Future<dynamic> updatePlan(String planId, Map<String, dynamic> updates) =>
      patch('/api/v1/plans/$planId', updates);
  Future<dynamic> deletePlan(String planId) => delete('/api/v1/plans/$planId');
  Future<dynamic> addActivity(String planId, Map<String, dynamic> activity) =>
      post('/api/v1/plans/$planId/activities', activity);

  // Exercise sessions
  Future<dynamic> createExerciseSession(Map<String, dynamic> session) =>
      post('/api/v1/exercise-sessions', session);
  Future<dynamic> getExerciseSession(String sessionId) => get('/api/v1/exercise-sessions/$sessionId');
  Future<dynamic> updateExerciseSession(String sessionId, Map<String, dynamic> updates) =>
      patch('/api/v1/exercise-sessions/$sessionId', updates);
  Future<dynamic> deleteExerciseSession(String sessionId) => delete('/api/v1/exercise-sessions/$sessionId');

  // Cognitive game sessions
  Future<dynamic> createGameSession(Map<String, dynamic> session) =>
      post('/api/v1/game-sessions', session);
  Future<dynamic> getGameSession(String sessionId) => get('/api/v1/game-sessions/$sessionId');
  Future<dynamic> updateGameSession(String sessionId, Map<String, dynamic> updates) =>
      patch('/api/v1/game-sessions/$sessionId', updates);
  Future<dynamic> deleteGameSession(String sessionId) => delete('/api/v1/game-sessions/$sessionId');

  // Analytics / progress
  Future<dynamic> getPatientProgress(String patientId) =>
      get('/api/v1/analytics/patients/$patientId');
  Future<dynamic> getMyProgress() => get('/api/v1/analytics/me');
  Future<dynamic> getOverviewAnalytics() => get('/api/v1/analytics/overview');

  // HTTP DELETE support
  Future<dynamic> delete(String path, {bool requiresAuth = true}) async {
    return _sendRequest(() async {
      final headers = await _headers(requiresAuth: requiresAuth);
      return _client.delete(Uri.parse('$baseUrl$path'), headers: headers);
    }, path: path, requiresAuth: requiresAuth);
  }
}
