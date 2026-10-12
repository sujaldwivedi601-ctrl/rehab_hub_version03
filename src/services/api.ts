export const API_BASE = '/api/v1';

export interface DoctorUser {
  _id: string;
  name: string;
  email: string;
  role: 'doctor' | 'admin';
  accountStatus: string;
  specialty?: string;
  hospital?: string;
  licenseNumber?: string;
  phone?: string;
  lastLoginAt?: string;
  gender?: string;
  profilePic?: string;
}

export class ApiService {
  private static doctorToken: string | null = localStorage.getItem('nr_doc_token');
  private static doctorRefreshToken: string | null = localStorage.getItem('nr_doc_refresh_token');
  private static currentDoctor: DoctorUser | null = (() => {
    try {
      const stored = localStorage.getItem('nr_doc_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  static setDoctorTokens(accessToken: string | null, refreshToken?: string | null) {
    this.doctorToken = accessToken;
    if (accessToken) localStorage.setItem('nr_doc_token', accessToken);
    else localStorage.removeItem('nr_doc_token');

    if (refreshToken !== undefined) {
      this.doctorRefreshToken = refreshToken;
      if (refreshToken) localStorage.setItem('nr_doc_refresh_token', refreshToken);
      else localStorage.removeItem('nr_doc_refresh_token');
    }
  }

  static getDoctorToken(): string | null {
    return this.doctorToken;
  }

  static setCurrentDoctor(doctor: DoctorUser | null) {
    this.currentDoctor = doctor;
    if (doctor) {
      localStorage.setItem('nr_doc_user', JSON.stringify(doctor));
    } else {
      localStorage.removeItem('nr_doc_user');
    }
  }

  static getCurrentDoctor(): DoctorUser | null {
    if (!this.currentDoctor) {
      try {
        const stored = localStorage.getItem('nr_doc_user');
        if (stored) this.currentDoctor = JSON.parse(stored);
      } catch {
        this.currentDoctor = null;
      }
    }
    return this.currentDoctor;
  }

  static isDoctorAuthenticated(): boolean {
    return !!this.doctorToken;
  }

  // Doctor Authenticated Fetch with auto-refresh interceptor
  static async doctorFetch(url: string, init: RequestInit = {}): Promise<Response> {
    if (!this.doctorToken) {
      throw new Error('Doctor session not authenticated. Please log in.');
    }

    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${this.doctorToken}`);

    let response = await fetch(url, { ...init, headers });

    // Interceptor: if 401 Unauthorized, try refresh token once
    if (response.status === 401 && this.doctorRefreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.doctorRefreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          this.setDoctorTokens(data.tokens.accessToken, data.tokens.refreshToken);
          headers.set('Authorization', `Bearer ${this.doctorToken}`);
          response = await fetch(url, { ...init, headers });
        } else {
          this.doctorLogout();
        }
      } catch {
        this.doctorLogout();
      }
    }

    return response;
  }

  // Doctor Login
  static async doctorLogin(email: string, pass: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    this.setDoctorTokens(data.tokens?.accessToken || null, data.tokens?.refreshToken || null);
    if (data.user) {
      this.setCurrentDoctor(data.user);
    }
    return data;
  }

  // Doctor Registration
  static async doctorRegister(payload: {
    name: string;
    email: string;
    password: string;
    specialty?: string;
    hospital?: string;
    licenseNumber?: string;
    phone?: string;
    gender?: string;
  }) {
    const res = await fetch(`${API_BASE}/auth/register-doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Doctor registration failed');

    this.setDoctorTokens(data.tokens?.accessToken || null, data.tokens?.refreshToken || null);
    if (data.user) {
      this.setCurrentDoctor(data.user);
    }
    return data;
  }

  // Doctor Logout
  static async doctorLogout() {
    try {
      if (this.doctorRefreshToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.doctorRefreshToken }),
        });
      }
    } catch {
      // Ignore network error on logout
    } finally {
      this.setDoctorTokens(null, null);
      this.setCurrentDoctor(null);
    }
  }

  // Doctor Get Me
  static async doctorGetMe() {
    const res = await this.doctorFetch(`${API_BASE}/auth/me`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch doctor profile');
    if (data.user) {
      const existing = this.getCurrentDoctor() || {};
      this.setCurrentDoctor({ ...existing, ...data.user });
    }
    return data.user;
  }

  // Doctor Update Profile
  static async doctorUpdateProfile(payload: { name?: string; specialty?: string; hospital?: string; phone?: string }) {
    const res = await this.doctorFetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const existing = this.getCurrentDoctor();
    if (existing) {
      this.setCurrentDoctor({ ...existing, ...payload });
    }
    return data;
  }

  // Doctor Patient Management
  static async getDoctorPatients() {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch patients');
    return data.patients || [];
  }

  static async createPatient(payload: any) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create patient');
    return data;
  }

  static async getPatientDetails(id: string) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch patient details');
    return data;
  }

  static async updatePatientPlan(id: string, payload: any) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients/${id}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update plan');
    return data;
  }

  static async updatePatientProfile(id: string, payload: any) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients/${id}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update patient profile');
    return data;
  }

  static async assignActivity(patientId: string, activity: any) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients/${patientId}/assign-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to assign activity');
    return data;
  }

  static async updatePatientStatus(patientId: string, status: string) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients/${patientId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update status');
    return data;
  }

  static async deletePatient(patientId: string) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients/${patientId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete patient');
    return data;
  }

  static async uploadPatientPhoto(patientId: string, photoUrl: string) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients/${patientId}/photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to upload photo');
    return data;
  }

  static async syncPatientWithFirebase(patientId: string) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients/${patientId}/sync-firebase`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to sync with Firebase');
    return data;
  }

  static async syncAllPatientsWithFirebase() {
    const res = await this.doctorFetch(`${API_BASE}/doctor/sync-all-firebase`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to sync all patients with Firebase');
    return data;
  }

  static async getPatientSessions(patientId: string) {
    const res = await this.doctorFetch(`${API_BASE}/doctor/patients/${patientId}/sessions`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch patient sessions');
    return data;
  }

  // ─── 6-digit patient code access (mobile app integration) ───────────────
  // Absolute URL a mobile app can open with just the patient's 6-digit code.
  static getPatientAccessUrl(patientCode: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${API_BASE}/access/patient/${patientCode}`;
  }

  // Resolve a patient's entire record (profile, plan, exercises, games, diet).
  static async getPatientByCode(patientCode: string) {
    const res = await fetch(`${API_BASE}/access/patient/${encodeURIComponent(patientCode)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'No patient found for this code');
    return data;
  }

  static async getPatientSessionsByCode(patientCode: string) {
    const res = await fetch(`${API_BASE}/access/patient/${encodeURIComponent(patientCode)}/sessions`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch patient sessions');
    return data;
  }

  static async syncExerciseSessionByCode(patientCode: string, session: any) {
    const res = await fetch(`${API_BASE}/access/patient/${encodeURIComponent(patientCode)}/exercise-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to sync exercise session');
    return data;
  }

  static async syncGameSessionByCode(patientCode: string, session: any) {
    const res = await fetch(`${API_BASE}/access/patient/${encodeURIComponent(patientCode)}/game-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to sync game session');
    return data;
  }

  // Science / Clinical Evidence query
  static async getScienceEvidence(topic?: string) {
    const query = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    const res = await fetch(`${API_BASE}/science/protocols${query}`);
    return await res.json();
  }

  // Patient Mobile API Helpers (for test suite and mobile simulator)
  static async patientLogin(email: string, pass: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  }

  static async activatePatient(activationCode: string, newPassword: string, email?: string) {
    const res = await fetch(`${API_BASE}/auth/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activationCode, newPassword, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Activation failed');
    return data;
  }

  static async getPatientPlan(patientToken?: string) {
    const headers: Record<string, string> = {};
    if (patientToken) headers['Authorization'] = `Bearer ${patientToken}`;
    const res = await fetch(`${API_BASE}/patient/me/plan`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch plan');
    return data;
  }

  static async syncExerciseSession(session: any, patientToken?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (patientToken) headers['Authorization'] = `Bearer ${patientToken}`;
    const res = await fetch(`${API_BASE}/patient/me/exercise-sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(session),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to sync exercise session');
    return data;
  }

  static async syncGameSession(session: any, patientToken?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (patientToken) headers['Authorization'] = `Bearer ${patientToken}`;
    const res = await fetch(`${API_BASE}/patient/me/game-sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(session),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to sync game session');
    return data;
  }

  // Acceptance Tests Runner
  static async runAutomatedTests() {
    const res = await fetch(`${API_BASE}/tests/run`);
    return await res.json();
  }
}

