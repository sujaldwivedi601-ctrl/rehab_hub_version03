import '../models/models.dart';
import 'api_client.dart';

class AuthService {
  final NeuroRehabApiClient apiClient;
  PatientUser? _currentUser;
  PatientProfile? _currentProfile;

  AuthService({required this.apiClient});

  PatientUser? get currentUser => _currentUser;
  PatientProfile? get currentProfile => _currentProfile;
  bool get isAuthenticated => _currentUser != null;

  /// Authenticate with email & password
  Future<PatientUser> login({
    required String email,
    required String password,
  }) async {
    final response = await apiClient.post(
      '/api/v1/auth/login',
      {'email': email, 'password': password},
      requiresAuth: false,
    );

    final tokens = response['tokens'];
    await apiClient.tokenStorage.saveTokens(
      accessToken: tokens['accessToken'],
      refreshToken: tokens['refreshToken'],
    );

    _currentUser = PatientUser.fromJson(response['user']);
    await fetchProfileAndPlan();
    return _currentUser!;
  }

  /// Activate account using onboarding credentials
  Future<PatientUser> activateAccount({
    required String activationCode,
    required String newPassword,
    String? email,
  }) async {
    final response = await apiClient.post(
      '/api/v1/auth/activate',
      {
        'activationCode': activationCode,
        'newPassword': newPassword,
        if (email != null) 'email': email,
      },
      requiresAuth: false,
    );

    final tokens = response['tokens'];
    await apiClient.tokenStorage.saveTokens(
      accessToken: tokens['accessToken'],
      refreshToken: tokens['refreshToken'],
    );

    _currentUser = PatientUser.fromJson(response['user']);
    await fetchProfileAndPlan();
    return _currentUser!;
  }

  /// Retrieve patient profile and care team
  Future<void> fetchProfileAndPlan() async {
    try {
      final res = await apiClient.get('/api/v1/patient/me');
      _currentUser = PatientUser.fromJson(res['user']);
      _currentProfile = PatientProfile.fromJson(res['profile']);
    } catch (e) {
      // Offline fallback: currentUser retained from storage
    }
  }

  /// Fetch active rehabilitation plan
  Future<RehabilitationPlan?> getActivePlan() async {
    try {
      final res = await apiClient.get('/api/v1/patient/me/plan');
      if (res['hasActivePlan'] == true && res['plan'] != null) {
        return RehabilitationPlan.fromJson(res['plan']);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Fetch active assigned activities (Arm Raise, cognitive games)
  Future<List<AssignedActivity>> getAssignedActivities() async {
    try {
      final res = await apiClient.get('/api/v1/patient/me/activities');
      final list = (res['activities'] as List<dynamic>?) ?? [];
      return list.map((a) => AssignedActivity.fromJson(a as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  /// Safe Logout: Revokes backend session and clears secure tokens
  /// IMPORTANT: Does NOT delete local exercise or game history.
  Future<void> logout() async {
    try {
      final refreshToken = await apiClient.tokenStorage.getRefreshToken();
      if (refreshToken != null) {
        await apiClient.post(
          '/api/v1/auth/logout',
          {'refreshToken': refreshToken},
          requiresAuth: false,
        );
      }
    } catch (_) {
      // Proceed even if server is unreachable
    } finally {
      await apiClient.tokenStorage.clearTokens();
      _currentUser = null;
      _currentProfile = null;
    }
  }
}
