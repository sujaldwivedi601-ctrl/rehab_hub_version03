import { Response } from 'express';
import { AuthenticatedRequest, authorizePatientAccess } from '../middleware/auth.js';
import {
  UserRepository,
  PatientProfileRepository,
  RehabilitationPlanRepository,
  ExerciseSessionRepository,
  CognitiveGameSessionRepository,
} from '../models/repositories.js';

export const PatientResourceController = {
  // GET /api/v1/patients
  async listPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const role = req.user!.role;
      const profiles = role === 'admin'
        ? await PatientProfileRepository.list()
        : await PatientProfileRepository.findByDoctorId(req.user!._id);

      const patientList = [];
      for (const prof of profiles) {
        const user = await UserRepository.findById(prof.patientId);
        if (!user) continue;
        const plan = await RehabilitationPlanRepository.findActiveByPatientId(user._id);
        const exercises = await ExerciseSessionRepository.list({ patientId: user._id, limit: 1 });
        const games = await CognitiveGameSessionRepository.list({ patientId: user._id, limit: 1 });

        patientList.push({
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            patientCode: user.patientCode,
            accountStatus: user.accountStatus,
            lastLoginAt: user.lastLoginAt,
          },
          profile: prof,
          activePlanId: plan?.planId,
          planVersion: plan?.version || 0,
          activeActivitiesCount: plan?.activities.filter((a) => a.status === 'active').length || 0,
          totalExerciseSessions: exercises.total,
          totalGameSessions: games.total,
          lastSessionDate: exercises.sessions[0]?.startedAt || games.sessions[0]?.startedAt || null,
        });
      }

      res.json({ patients: patientList, totalCount: patientList.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list patients' });
    }
  },

  // GET /api/v1/patients/:id
  async getPatientById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;
      const isAuthorized = await authorizePatientAccess(req.user!, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view this patient record' });
        return;
      }

      const user = await UserRepository.findById(patientId);
      if (!user || user.role !== 'patient') {
        res.status(404).json({ error: 'Not Found', message: 'Patient not found' });
        return;
      }

      const profile = await PatientProfileRepository.findByPatientId(patientId);
      const plans = await RehabilitationPlanRepository.list({ patientId });
      const exercises = await ExerciseSessionRepository.findByPatientId(patientId, { limit: 20 });
      const games = await CognitiveGameSessionRepository.findByPatientId(patientId, { limit: 20 });

      const careTeam: { id: string; name: string; email: string; specialty?: string }[] = [];
      for (const docId of profile?.assignedDoctorIds || []) {
        const doc = await UserRepository.findById(docId);
        if (doc) careTeam.push({ id: doc._id, name: doc.name, email: doc.email, specialty: doc.specialty });
      }

      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          patientCode: user.patientCode,
          accountStatus: user.accountStatus,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
        },
        profile,
        careTeam,
        plans,
        activePlan: plans.find((p) => p.status === 'active') || null,
        recentExercises: exercises.sessions,
        recentGames: games.sessions,
        totalExerciseSessions: exercises.total,
        totalGameSessions: games.total,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patient' });
    }
  },

  // GET /api/v1/patients/:id/profile
  async getPatientProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;
      const isAuthorized = await authorizePatientAccess(req.user!, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view this patient profile' });
        return;
      }
      const profile = await PatientProfileRepository.findByPatientId(patientId);
      if (!profile) {
        res.status(404).json({ error: 'Not Found', message: 'Patient profile not found' });
        return;
      }
      res.json({ profile });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patient profile' });
    }
  },

  // PUT /api/v1/patients/:id/profile
  async updatePatientProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;
      const isAuthorized = await authorizePatientAccess(req.user!, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to update this patient profile' });
        return;
      }

      const {
        primaryDiagnosis,
        clinicalNotes,
        dateOfBirth,
        gender,
        phoneNumber,
        emergencyContactName,
        emergencyContactPhone,
        dietaryPlan,
        profilePhotoUrl,
        preferredLanguage,
        assignedDoctorIds,
      } = req.body;

      const updateData: any = {};
      if (primaryDiagnosis !== undefined) updateData.primaryDiagnosis = primaryDiagnosis;
      if (clinicalNotes !== undefined) updateData.clinicalNotes = clinicalNotes;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
      if (gender !== undefined) updateData.gender = gender;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName;
      if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone;
      if (dietaryPlan !== undefined) updateData.dietaryPlan = dietaryPlan;
      if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;
      if (assignedDoctorIds !== undefined) updateData.assignedDoctorIds = assignedDoctorIds;
      if (profilePhotoUrl !== undefined) {
        updateData.profilePhotoUrl = profilePhotoUrl;
        updateData.faceVerificationEnrolled = !!profilePhotoUrl;
      }

      const updated = await PatientProfileRepository.update(patientId, updateData);
      if (!updated) {
        res.status(404).json({ error: 'Not Found', message: 'Patient profile not found' });
        return;
      }
      res.json({ message: 'Patient profile updated successfully', profile: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update patient profile' });
    }
  },

  // GET /api/v1/patients/:id/exercise-sessions
  async getPatientExerciseSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;
      const isAuthorized = await authorizePatientAccess(req.user!, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view these sessions' });
        return;
      }
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const skip = parseInt(req.query.skip as string) || 0;
      const exerciseId = req.query.exerciseId as string;
      const result = await ExerciseSessionRepository.list({ patientId, exerciseId, limit, skip });
      res.json({ exercises: result.sessions, totalCount: result.total });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch exercise sessions' });
    }
  },

  // GET /api/v1/patients/:id/game-sessions
  async getPatientGameSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;
      const isAuthorized = await authorizePatientAccess(req.user!, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view these sessions' });
        return;
      }
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const skip = parseInt(req.query.skip as string) || 0;
      const result = await CognitiveGameSessionRepository.list({ patientId, limit, skip });
      res.json({ games: result.sessions, totalCount: result.total });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch game sessions' });
    }
  },

  // DELETE /api/v1/patients/:id
  async deletePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;
      const isAuthorized = await authorizePatientAccess(req.user!, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to delete this patient' });
        return;
      }
      await PatientProfileRepository.delete(patientId);
      res.json({ message: 'Patient account and all related records deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete patient' });
    }
  },
};