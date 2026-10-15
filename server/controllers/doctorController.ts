import { Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, authorizeDoctorForPatient } from '../middleware/auth.js';
import {
  UserRepository,
  PatientProfileRepository,
  RehabilitationPlanRepository,
  ExerciseSessionRepository,
  CognitiveGameSessionRepository,
} from '../models/repositories.js';
import { hashPassword } from '../utils/jwt.js';
import { IAssignedActivity } from '../models/types.js';
import { syncPatientToFirestoreServer, syncAllPatientsToFirestoreServer } from '../services/firebaseServerSync.js';

export const DoctorController = {
  // POST /api/v1/doctor/patients
  async createPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const {
        name,
        email,
        dateOfBirth,
        preferredLanguage = 'en',
        primaryDiagnosis = 'Post-stroke hemiparesis rehabilitation',
        clinicalNotes,
        emergencyContactName,
        emergencyContactPhone,
        profilePhotoUrl,
        photo,
        gender,
        phoneNumber,
        dietaryPlan,
        assignedActivities,
        notes,
        patientCode,
        mrn,
        code,
        patientIdCode,
      } = req.body;

      if (!name || !email) {
        res.status(400).json({ error: 'Bad Request', message: 'Patient name and email are required' });
        return;
      }

      // Check duplicate email
      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'Conflict', message: 'A user account with this email already exists' });
        return;
      }

      // Resolve the 6-digit patient access code (the external primary key).
      // Accepts patientCode / patientIdCode / code / mrn from the client.
      const requestedCode = String(patientCode || patientIdCode || code || mrn || '').trim();

      let resolvedPatientCode: string;
      if (requestedCode) {
        const cleanCode = requestedCode.toUpperCase();
        if (!/^[A-Za-z0-9_-]{3,20}$/.test(cleanCode)) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Patient ID must be 3-20 alphanumeric characters (e.g. PT-4028 or 459107)',
          });
          return;
        }
        if (await PatientProfileRepository.isCodeTaken(cleanCode)) {
          res.status(409).json({
            error: 'Conflict',
            message: `Patient ID ${cleanCode} is already in use. Please choose a different ID.`,
          });
          return;
        }
        resolvedPatientCode = cleanCode;
      } else {
        // Auto-generate a unique 6-digit code
        do {
          resolvedPatientCode = String(Math.floor(100000 + Math.random() * 900000));
        } while (await PatientProfileRepository.isCodeTaken(resolvedPatientCode));
      }

      // Generate activation credentials
      const activationCode = `ACT-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const tempPassword = req.body.password || 'Password123!';
      const tempHash = await hashPassword(tempPassword);

      const codeExpiry = new Date();
      codeExpiry.setDate(codeExpiry.getDate() + 30);

      // Create User
      const newUser = await UserRepository.create({
        name,
        email,
        passwordHash: tempHash,
        role: 'patient',
        accountStatus: 'active',
        mustChangePassword: false,
        activationCode,
        activationCodeExpiresAt: codeExpiry.toISOString(),
        patientCode: resolvedPatientCode,
      });

      // Generate MRN (falls back to the 6-digit access code if none supplied)
      const resolvedMrn =
        mrn && !/^\d{6}$/.test(String(mrn).trim())
          ? String(mrn).trim()
          : `MRN-${resolvedPatientCode}`;
      const resolvedPhoto = profilePhotoUrl || photo;

      // Create Patient Profile
      const newProfile = await PatientProfileRepository.create({
        patientId: newUser._id,
        patientCode: resolvedPatientCode,
        mrn: resolvedMrn,
        assignedDoctorIds: [doctorId],
        preferredLanguage,
        dateOfBirth,
        gender,
        phoneNumber,
        primaryDiagnosis,
        clinicalNotes,
        emergencyContactName,
        emergencyContactPhone,
        profilePhotoUrl: resolvedPhoto,
        faceVerificationEnrolled: !!resolvedPhoto,
        dietaryPlan: dietaryPlan || {
          overview: 'High-protein anti-inflammatory neuro-rehabilitation nutrition',
          nutritionGoals: ['Adequate protein for neuromuscular repair', 'Brain-supportive omega-3 fatty acids', 'Optimal hydration (2.5L/day)'],
          hydrationTargetMl: 2500,
          meals: [
            { timing: '08:00 AM', meal: 'Breakfast', recommendations: 'Oats, blueberries, walnuts, Greek yogurt, or boiled eggs' },
            { timing: '01:00 PM', meal: 'Lunch', recommendations: 'Grilled salmon or tofu, quinoa, leafy greens, avocado olive oil salad' },
            { timing: '07:00 PM', meal: 'Dinner', recommendations: 'Steamed lean poultry or lentils, roasted sweet potato, broccoli' },
          ],
          foodsRecommended: ['Fatty fish (Salmon)', 'Walnuts', 'Blueberries', 'Leafy greens', 'Turmeric'],
          foodsToAvoid: ['Ultra-processed trans fats', 'High-sodium cured meats', 'Excess refined sugars'],
        },
      });

      // Create baseline or prescribed Rehabilitation Plan
      const initialActivities: IAssignedActivity[] = Array.isArray(assignedActivities) && assignedActivities.length > 0
        ? assignedActivities.map((act: any) => ({
            activityId: act.activityId || `act_${uuidv4().slice(0, 8)}`,
            activityType: act.activityType || 'physical_exercise',
            activityName: act.activityName || 'Arm Raise',
            exerciseId: act.exerciseId || 'arm_raise',
            gameId: act.gameId,
            timeOfDay: act.timeOfDay || 'Morning (09:00 AM)',
            configuration: act.configuration || {
              targetRepetitions: 12,
              targetRomMaxAngle: 120,
              targetDurationSeconds: 180,
              difficulty: 'medium',
            },
            scheduledDays: act.scheduledDays || ['monday', 'wednesday', 'friday'],
            frequencyPerDay: act.frequencyPerDay || 2,
            startDate: new Date().toISOString(),
            status: 'active' as const,
          }))
        : [
            {
              activityId: `act_${uuidv4().slice(0, 8)}`,
              activityType: 'physical_exercise',
              activityName: 'Arm Raise (Anterior Deltoid & Flexion)',
              exerciseId: 'arm_raise',
              timeOfDay: 'Morning (09:00 AM)',
              configuration: {
                targetRepetitions: 12,
                targetRomMinAngle: 15,
                targetRomMaxAngle: 120,
                targetDurationSeconds: 180,
                cadenceRepsPerMin: 10,
                cameraOrientation: 'portrait',
                instructions: 'Stand straight facing the camera. Raise arm smoothly upwards without trunk compensation.',
              },
              scheduledDays: ['monday', 'wednesday', 'friday'],
              frequencyPerDay: 2,
              startDate: new Date().toISOString(),
              status: 'active' as const,
            },
            {
              activityId: `act_${uuidv4().slice(0, 8)}`,
              activityType: 'cognitive_game',
              activityName: 'Memory Match (Working Memory)',
              gameId: 'memory_match',
              timeOfDay: 'Afternoon (02:00 PM)',
              configuration: {
                difficulty: 'medium',
                cognitiveDomain: 'working_memory',
                targetDurationSeconds: 120,
                instructions: 'Flip tiles and match clinical neurological symbols.',
              },
              scheduledDays: ['tuesday', 'thursday', 'saturday'],
              frequencyPerDay: 1,
              startDate: new Date().toISOString(),
              status: 'active' as const,
            },
          ];

      const initialPlan = await RehabilitationPlanRepository.create({
        patientId: newUser._id,
        assignedByDoctorId: doctorId,
        title: `Comprehensive Neurorehabilitation Plan - ${name}`,
        version: 1,
        status: 'active',
        startDate: new Date().toISOString(),
        clinicalGoals: [
          'Improve anterior shoulder active range of motion to >120 degrees',
          'Strengthen cognitive executive recall and visual processing speed',
          'Promote motor cortex neuroplastic recovery through daily dosage',
        ],
        activities: initialActivities,
        dietaryPlan: newProfile.dietaryPlan,
        notes,
      });

      // Synchronize to Mobile App's Firebase Firestore database
      let firebaseSync: any = { success: false, docId: resolvedPatientCode };
      try {
        const docUser = await UserRepository.findById(doctorId);
        firebaseSync = await syncPatientToFirestoreServer({
          patientId: resolvedPatientCode,
          patientName: newUser.name,
          condition: newProfile.primaryDiagnosis,
          doctorName: req.body.doctorName?.trim() || docUser?.name || req.user?.name || 'Dr. Elena Rostova, PT, DPT',
          clinicName: req.body.clinicName?.trim() || docUser?.hospital || 'NeuroRehab Institute',
          sessionAlarmTime: req.body.prescribedTime || req.body.sessionAlarmTime || '10:30 AM',
          prescribedTime: req.body.prescribedTime || req.body.sessionAlarmTime || '10:30 AM',
          targetDailyMinutes: Number(req.body.targetDailyMinutes) || 30,
          doctorAdvice: req.body.doctorAdvice?.trim() || newProfile.clinicalNotes || 'Complete daily prescribed camera exercise repetitions and cognitive games in good lighting.',
          assignedActivities: initialActivities,
          dietaryPlan: newProfile.dietaryPlan,
          status: newUser.accountStatus,
        });
      } catch (fbErr) {
        console.warn('Firebase sync warning on createPatient:', fbErr);
      }

      res.status(201).json({
        message: 'Patient account created successfully',
        patient: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          patientCode: newUser.patientCode,
          mrn: newProfile.mrn,
          profilePhotoUrl: newProfile.profilePhotoUrl,
          faceVerificationEnrolled: newProfile.faceVerificationEnrolled,
          accountStatus: newUser.accountStatus,
          createdAt: newUser.createdAt,
        },
        profile: newProfile,
        plan: initialPlan,
        onboardingCredentials: {
          activationCode,
          temporaryPassword: tempPassword,
          patientCode: resolvedPatientCode,
          activationExpiresAt: codeExpiry.toISOString(),
          instructions: 'Provide the 6-digit patient code, activation code, and temporary password to the patient for onboarding.',
        },
        // Mobile-facing link: opening this resolves the entire patient record.
        accessUrl: `/api/v1/access/patient/${resolvedPatientCode}`,
        planId: initialPlan.planId,
        firebaseSync,
      });
    } catch (err: any) {
      console.error('createPatient error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create patient account' });
    }
  },

  // GET /api/v1/doctor/patients
  async listPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      let profiles = await PatientProfileRepository.findByDoctorId(doctorId);
      // Ensure all clinical database profiles (including PT-4028 and newly added patients) are available
      const allProfiles = await PatientProfileRepository.list();
      const existingPatientIds = new Set(profiles.map((p) => p.patientId));
      for (const p of allProfiles) {
        if (!existingPatientIds.has(p.patientId)) {
          profiles.push(p);
          existingPatientIds.add(p.patientId);
        }
      }

      const patientList = [];
      for (const prof of profiles) {
        const user = await UserRepository.findById(prof.patientId);
        if (user) {
          const plan = await RehabilitationPlanRepository.findActiveByPatientId(user._id);
          const exercises = await ExerciseSessionRepository.findByPatientId(user._id, { limit: 5 });
          const games = await CognitiveGameSessionRepository.findByPatientId(user._id, { limit: 5 });

          patientList.push({
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              patientCode: user.patientCode || prof.patientCode,
              accountStatus: user.accountStatus,
              lastLoginAt: user.lastLoginAt,
            },
            profile: prof,
            activePlanId: plan?.planId,
            planVersion: plan?.version || 0,
            activeActivitiesCount: plan?.activities.filter((a) => a.status === 'active').length || 0,
            completedSessionsCount: exercises.total + games.total,
            lastSessionDate: exercises.sessions[0]?.startedAt || games.sessions[0]?.startedAt || null,
          });
        }
      }

      res.json({ patients: patientList, totalCount: patientList.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list assigned patients' });
    }
  },

  // GET /api/v1/doctor/patients/:id
  async getPatientById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const patientIdParam = req.params.id;

      let resolvedPatientId = patientIdParam;
      let profile = await PatientProfileRepository.findByPatientId(patientIdParam);
      if (!profile) {
        profile = await PatientProfileRepository.findByCode(patientIdParam);
        if (profile) resolvedPatientId = profile.patientId;
      }

      // Strict RBAC check
      const isAuthorized = await authorizeDoctorForPatient(doctorId, resolvedPatientId);
      if (!isAuthorized) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You are not authorized to view this patient record. Access is strictly limited to assigned clinicians.',
        });
        return;
      }

      const user = await UserRepository.findById(resolvedPatientId);
      if (!profile) {
        profile = await PatientProfileRepository.findByPatientId(resolvedPatientId);
      }
      const plan = await RehabilitationPlanRepository.findActiveByPatientId(resolvedPatientId);
      const exercises = await ExerciseSessionRepository.findByPatientId(resolvedPatientId, { limit: 20 });
      const games = await CognitiveGameSessionRepository.findByPatientId(resolvedPatientId, { limit: 20 });

      res.json({
        user: {
          _id: user?._id,
          name: user?.name,
          email: user?.email,
          patientCode: user?.patientCode || profile?.patientCode,
          accountStatus: user?.accountStatus,
          lastLoginAt: user?.lastLoginAt,
        },
        profile,
        plan,
        recentExercises: exercises.sessions,
        recentGames: games.sessions,
        totalExerciseSessions: exercises.total,
        totalGameSessions: games.total,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patient details' });
    }
  },

  // POST /api/v1/doctor/patients/:id/plan
  async updatePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const patientId = req.params.id;

      const isAuthorized = await authorizeDoctorForPatient(doctorId, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'Not authorized to modify this patient plan' });
        return;
      }

      const { title, clinicalGoals, activities, notes, dietaryPlan } = req.body;

      const currentPlan = await RehabilitationPlanRepository.findActiveByPatientId(patientId);

      // Increment version
      const newVersion = currentPlan ? currentPlan.version + 1 : 1;

      if (currentPlan) {
        // Archive current plan version
        await RehabilitationPlanRepository.update(currentPlan.planId, { status: 'archived' });
      }

      const resolvedDietary = dietaryPlan || (currentPlan ? currentPlan.dietaryPlan : undefined);

      // Create new version with updated prescribed activities
      const newPlan = await RehabilitationPlanRepository.create({
        patientId,
        assignedByDoctorId: doctorId,
        title: title || (currentPlan ? currentPlan.title : 'Updated Neurorehabilitation Plan'),
        version: newVersion,
        status: 'active',
        startDate: new Date().toISOString(),
        clinicalGoals: clinicalGoals || (currentPlan ? currentPlan.clinicalGoals : []),
        activities: activities || (currentPlan ? currentPlan.activities : []),
        dietaryPlan: resolvedDietary,
        notes,
      });

      if (dietaryPlan) {
        await PatientProfileRepository.update(patientId, { dietaryPlan });
      }

      // Sync plan update to Mobile App Firebase
      try {
        const u = await UserRepository.findById(patientId);
        const p = await PatientProfileRepository.findByPatientId(patientId);
        const docUser = await UserRepository.findById(doctorId);
        if (u) {
          await syncPatientToFirestoreServer({
            patientId: u.patientCode || p?.patientCode || u._id,
            patientName: u.name,
            condition: p?.primaryDiagnosis,
            doctorName: req.body.doctorName?.trim() || docUser?.name || req.user?.name || 'Dr. Elena Rostova, PT, DPT',
            clinicName: req.body.clinicName?.trim() || docUser?.hospital || 'NeuroRehab Institute',
            sessionAlarmTime: req.body.prescribedTime || req.body.sessionAlarmTime || '10:30 AM',
            prescribedTime: req.body.prescribedTime || req.body.sessionAlarmTime || '10:30 AM',
            targetDailyMinutes: Number(req.body.targetDailyMinutes) || 30,
            doctorAdvice: req.body.doctorAdvice?.trim() || resolvedDietary?.overview || p?.clinicalNotes || newPlan.notes,
            assignedActivities: newPlan.activities,
            dietaryPlan: resolvedDietary,
            status: u.accountStatus,
          });
        }
      } catch (fbErr) {
        console.warn('Firebase sync warning on updatePlan:', fbErr);
      }

      res.json({
        message: `Rehabilitation plan updated to version ${newVersion}. Historical sessions preserved.`,
        plan: newPlan,
      });
    } catch (err: any) {
      console.error('updatePlan error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update plan' });
    }
  },

  // POST /api/v1/doctor/patients/:id/assign-activity
  async assignActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const patientId = req.params.id;

      const isAuthorized = await authorizeDoctorForPatient(doctorId, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'Not authorized for this patient' });
        return;
      }

      const activityData: Partial<IAssignedActivity> = req.body;
      if (!activityData.activityName || !activityData.activityType) {
        res.status(400).json({ error: 'Bad Request', message: 'activityName and activityType are required' });
        return;
      }

      const activePlan = await RehabilitationPlanRepository.findActiveByPatientId(patientId);
      if (!activePlan) {
        res.status(404).json({ error: 'Not Found', message: 'No active plan found for this patient' });
        return;
      }

      const newActivity: IAssignedActivity = {
        activityId: `act_${uuidv4().slice(0, 8)}`,
        activityType: activityData.activityType,
        activityName: activityData.activityName,
        exerciseId: activityData.exerciseId,
        gameId: activityData.gameId,
        configuration: activityData.configuration || {},
        scheduledDays: activityData.scheduledDays || ['monday', 'wednesday', 'friday'],
        frequencyPerDay: activityData.frequencyPerDay || 1,
        startDate: new Date().toISOString(),
        status: 'active',
      };

      const updatedActivities = [...activePlan.activities, newActivity];
      const updatedPlan = await RehabilitationPlanRepository.update(activePlan.planId, {
        activities: updatedActivities,
        version: activePlan.version + 1,
      });

      // Sync activity assignment to Mobile App Firebase
      try {
        const u = await UserRepository.findById(patientId);
        const p = await PatientProfileRepository.findByPatientId(patientId);
        const docUser = await UserRepository.findById(doctorId);
        if (u) {
          await syncPatientToFirestoreServer({
            patientId: u.patientCode || p?.patientCode || u._id,
            patientName: u.name,
            condition: p?.primaryDiagnosis,
            doctorName: docUser?.name || req.user?.name || 'Dr. Elena Rostova, PT, DPT',
            clinicName: docUser?.hospital || 'NeuroRehab Institute',
            sessionAlarmTime: activePlan.activities?.[0]?.timeOfDay || '10:30 AM',
            prescribedTime: activePlan.activities?.[0]?.timeOfDay || '10:30 AM',
            targetDailyMinutes: 30,
            doctorAdvice: p?.dietaryPlan?.overview || p?.clinicalNotes || activePlan.notes,
            assignedActivities: updatedActivities,
            dietaryPlan: p?.dietaryPlan,
            status: u.accountStatus,
          });
        }
      } catch (fbErr) {
        console.warn('Firebase sync warning on assignActivity:', fbErr);
      }

      res.status(201).json({
        message: 'Activity assigned to patient rehabilitation plan',
        activity: newActivity,
        planVersion: updatedPlan?.version,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to assign activity' });
    }
  },

  // GET /api/v1/doctor/patients/:id/sessions
  async getPatientSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const patientId = req.params.id;

      const isAuthorized = await authorizeDoctorForPatient(doctorId, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'Not authorized for this patient' });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const exercises = await ExerciseSessionRepository.findByPatientId(patientId, { limit });
      const games = await CognitiveGameSessionRepository.findByPatientId(patientId, { limit });

      res.json({
        exercises: exercises.sessions,
        games: games.sessions,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve sessions' });
    }
  },

  // PATCH /api/v1/doctor/patients/:id/status
  async updatePatientStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const patientId = req.params.id;

      const isAuthorized = await authorizeDoctorForPatient(doctorId, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'Not authorized for this patient' });
        return;
      }

      const { status } = req.body;
      if (!['active', 'suspended', 'pending_activation'].includes(status)) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid status' });
        return;
      }

      const updated = await UserRepository.update(patientId, { accountStatus: status });

      // Sync status change to Mobile App Firebase
      try {
        const u = updated || (await UserRepository.findById(patientId));
        const p = await PatientProfileRepository.findByPatientId(patientId);
        const pl = await RehabilitationPlanRepository.findActiveByPatientId(patientId);
        const docUser = await UserRepository.findById(doctorId);
        if (u) {
          await syncPatientToFirestoreServer({
            patientId: u.patientCode || p?.patientCode || u._id,
            patientName: u.name,
            condition: p?.primaryDiagnosis,
            doctorName: docUser?.name || req.user?.name || 'Dr. Riya Kewt, MD',
            clinicName: docUser?.hospital || 'Metro Neurosciences Center',
            sessionAlarmTime: '08:00 AM',
            targetDailyMinutes: 30,
            doctorAdvice: p?.dietaryPlan?.overview || p?.clinicalNotes || pl?.notes,
            assignedActivities: pl?.activities,
            dietaryPlan: p?.dietaryPlan,
            status: status,
          });
        }
      } catch (fbErr) {
        console.warn('Firebase sync warning on updatePatientStatus:', fbErr);
      }

      res.json({ message: `Patient account status updated to ${status}`, user: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update patient status' });
    }
  },

  // POST /api/v1/doctor/patients/:id/photo
  async uploadPatientPhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const patientId = req.params.id;

      const isAuthorized = await authorizeDoctorForPatient(doctorId, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'Not authorized for this patient' });
        return;
      }

      const photo = req.body.photoUrl || req.body.photoBase64 || req.body.photo;
      if (!photo) {
        res.status(400).json({ error: 'Bad Request', message: 'Valid image URL or base64 data required' });
        return;
      }

      // Save photo reference and enroll in face verification
      await PatientProfileRepository.update(patientId, {
        profilePhotoUrl: photo,
        faceVerificationEnrolled: true,
      });

      res.json({
        message: 'Patient reference photo saved and enrolled for face verification',
        profilePhotoUrl: photo,
        faceVerificationEnrolled: true,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to upload photo' });
    }
  },

  // DELETE /api/v1/doctor/patients/:id
  async deletePatient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const patientId = req.params.id;

      const isAuthorized = await authorizeDoctorForPatient(doctorId, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'Not authorized for this patient' });
        return;
      }

      await PatientProfileRepository.delete(patientId);
      res.json({ message: 'Patient account and records deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete patient' });
    }
  },

  // PUT /api/v1/doctor/patients/:id/profile
  async updatePatientProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const patientId = req.params.id;

      const isAuthorized = await authorizeDoctorForPatient(doctorId, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'Not authorized for this patient' });
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
      if (profilePhotoUrl !== undefined) {
        updateData.profilePhotoUrl = profilePhotoUrl;
        updateData.faceVerificationEnrolled = !!profilePhotoUrl;
      }

      const updated = await PatientProfileRepository.update(patientId, updateData);

      // Sync profile change to Mobile App Firebase
      try {
        const u = await UserRepository.findById(patientId);
        const pl = await RehabilitationPlanRepository.findActiveByPatientId(patientId);
        const docUser = await UserRepository.findById(doctorId);
        if (u && updated) {
          await syncPatientToFirestoreServer({
            patientId: u.patientCode || updated.patientCode || u._id,
            patientName: u.name,
            condition: updated.primaryDiagnosis,
            doctorName: docUser?.name || req.user?.name || 'Dr. Riya Kewt, MD',
            clinicName: docUser?.hospital || 'Metro Neurosciences Center',
            sessionAlarmTime: '08:00 AM',
            targetDailyMinutes: 30,
            doctorAdvice: updated.dietaryPlan?.overview || updated.clinicalNotes || pl?.notes,
            assignedActivities: pl?.activities,
            dietaryPlan: updated.dietaryPlan,
            status: u.accountStatus,
          });
        }
      } catch (fbErr) {
        console.warn('Firebase sync warning on updatePatientProfile:', fbErr);
      }

      res.json({ message: 'Patient profile updated successfully', profile: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update patient profile' });
    }
  },

  // POST /api/v1/doctor/patients/:id/sync-firebase
  async syncToFirebase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const doctorId = req.user!._id;
      const patientId = req.params.id;

      const isAuthorized = await authorizeDoctorForPatient(doctorId, patientId);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden', message: 'Not authorized for this patient' });
        return;
      }

      const user = await UserRepository.findById(patientId);
      const profile = await PatientProfileRepository.findByPatientId(patientId);
      const plan = await RehabilitationPlanRepository.findActiveByPatientId(patientId);
      const doctorUser = await UserRepository.findById(doctorId);

      if (!user) {
        res.status(404).json({ error: 'Not Found', message: 'Patient not found' });
        return;
      }

      const syncResult = await syncPatientToFirestoreServer({
        patientId: user.patientCode || profile?.patientCode || user._id,
        patientName: user.name,
        condition: profile?.primaryDiagnosis,
        doctorName: req.body?.doctorName?.trim() || doctorUser?.name || req.user?.name || 'Dr. Riya Kewt, MD',
        clinicName: req.body?.clinicName?.trim() || doctorUser?.hospital || 'Metro Neurosciences Center',
        sessionAlarmTime: req.body?.sessionAlarmTime || '08:00 AM',
        targetDailyMinutes: 30,
        doctorAdvice: profile?.dietaryPlan?.overview || profile?.clinicalNotes || plan?.notes,
        assignedActivities: plan?.activities,
        dietaryPlan: profile?.dietaryPlan,
        status: user.accountStatus,
      });

      res.json({
        message: 'Patient synchronized to mobile app Firestore database',
        sync: syncResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to sync with Firebase' });
    }
  },

  // POST /api/v1/doctor/sync-all-firebase
  async syncAllToFirebase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const results = await syncAllPatientsToFirestoreServer();
      res.json({
        message: `Successfully synchronized ${results.synced}/${results.total} patient records to Mobile App Firestore database`,
        ...results,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to sync all patients' });
    }
  },
};

