import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, authorizePatientAccess } from '../middleware/auth.js';
import {
  RehabilitationPlanRepository,
  UserRepository,
} from '../models/repositories.js';
import { IAssignedActivity, IRehabilitationPlan } from '../models/types.js';

async function loadPlanAndCheck(planId: string, user: any): Promise<{ plan: IRehabilitationPlan | null; authorized: boolean }> {
  const plan = await RehabilitationPlanRepository.findByPlanId(planId);
  if (!plan) return { plan: null, authorized: false };
  const authorized = await authorizePatientAccess(user, plan.patientId);
  return { plan, authorized };
}

export const PlanController = {
  // GET /api/v1/plans?patientId=&status=
  async listPlans(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.query.patientId as string;
      const status = req.query.status as string;

      if (patientId && !(await authorizePatientAccess(req.user!, patientId))) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view these plans' });
        return;
      }

      const plans = await RehabilitationPlanRepository.list({ patientId, status });
      res.json({ plans, totalCount: plans.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list plans' });
    }
  },

  // GET /api/v1/plans/:planId
  async getPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plan, authorized } = await loadPlanAndCheck(req.params.planId, req.user);
      if (!plan) {
        res.status(404).json({ error: 'Not Found', message: 'Plan not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to view this plan' });
        return;
      }
      const doctor = plan.assignedByDoctorId ? await UserRepository.findById(plan.assignedByDoctorId) : null;
      res.json({
        plan: {
          ...plan,
          prescribedByDoctorName: doctor ? doctor.name : null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch plan' });
    }
  },

  // POST /api/v1/plans
  async createPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const patientId = req.body.patientId;
      if (!patientId) {
        res.status(400).json({ error: 'Bad Request', message: 'patientId is required' });
        return;
      }
      if (!(await authorizePatientAccess(req.user!, patientId))) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to create a plan for this patient' });
        return;
      }

      const plan = await RehabilitationPlanRepository.create({
        patientId,
        assignedByDoctorId: req.user!.role === 'patient' ? req.user!._id : req.body.assignedByDoctorId || req.user!._id,
        title: req.body.title || 'Neurorehabilitation Protocol',
        version: req.body.version || 1,
        status: req.body.status || 'active',
        startDate: req.body.startDate || new Date().toISOString(),
        endDate: req.body.endDate,
        clinicalGoals: req.body.clinicalGoals || [],
        activities: req.body.activities || [],
        dietaryPlan: req.body.dietaryPlan,
        notes: req.body.notes,
      });

      res.status(201).json({ message: 'Rehabilitation plan created successfully', plan });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create plan' });
    }
  },

  // PATCH /api/v1/plans/:planId
  async updatePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plan, authorized } = await loadPlanAndCheck(req.params.planId, req.user);
      if (!plan) {
        res.status(404).json({ error: 'Not Found', message: 'Plan not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to update this plan' });
        return;
      }

      const { title, clinicalGoals, activities, dietaryPlan, notes, status, endDate, startDate } = req.body;
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (clinicalGoals !== undefined) updates.clinicalGoals = clinicalGoals;
      if (activities !== undefined) updates.activities = activities;
      if (dietaryPlan !== undefined) updates.dietaryPlan = dietaryPlan;
      if (notes !== undefined) updates.notes = notes;
      if (status !== undefined && ['active', 'completed', 'archived'].includes(status)) updates.status = status;
      if (endDate !== undefined) updates.endDate = endDate;
      if (startDate !== undefined) updates.startDate = startDate;
      if (req.body.incrementVersion) updates.version = plan.version + 1;

      const updated = await RehabilitationPlanRepository.update(plan.planId, updates);
      res.json({ message: 'Rehabilitation plan updated successfully', plan: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update plan' });
    }
  },

  // DELETE /api/v1/plans/:planId
  async deletePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plan, authorized } = await loadPlanAndCheck(req.params.planId, req.user);
      if (!plan) {
        res.status(404).json({ error: 'Not Found', message: 'Plan not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to delete this plan' });
        return;
      }
      await RehabilitationPlanRepository.delete(plan.planId);
      res.json({ message: 'Rehabilitation plan deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete plan' });
    }
  },

  // POST /api/v1/plans/:planId/activities
  async addActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plan, authorized } = await loadPlanAndCheck(req.params.planId, req.user);
      if (!plan) {
        res.status(404).json({ error: 'Not Found', message: 'Plan not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to modify this plan' });
        return;
      }

      const body = req.body as Partial<IAssignedActivity>;
      if (!body.activityName || !body.activityType) {
        res.status(400).json({ error: 'Bad Request', message: 'activityName and activityType are required' });
        return;
      }

      const newActivity: IAssignedActivity = {
        activityId: body.activityId || `act_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        activityType: body.activityType,
        activityName: body.activityName,
        exerciseId: body.exerciseId,
        gameId: body.gameId,
        timeOfDay: body.timeOfDay,
        configuration: body.configuration || {},
        scheduledDays: body.scheduledDays || ['monday', 'wednesday', 'friday'],
        frequencyPerDay: body.frequencyPerDay || 1,
        startDate: body.startDate || new Date().toISOString(),
        endDate: body.endDate,
        status: body.status || 'active',
      };

      const updated = await RehabilitationPlanRepository.update(plan.planId, {
        activities: [...plan.activities, newActivity],
        version: plan.version + 1,
      });

      res.status(201).json({
        message: 'Activity assigned to rehabilitation plan',
        activity: newActivity,
        planVersion: updated?.version,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to assign activity' });
    }
  },

  // PATCH /api/v1/plans/:planId/activities/:activityId
  async updateActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plan, authorized } = await loadPlanAndCheck(req.params.planId, req.user);
      if (!plan) {
        res.status(404).json({ error: 'Not Found', message: 'Plan not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to modify this plan' });
        return;
      }

      const activityId = req.params.activityId;
      const existing = plan.activities.find((a) => a.activityId === activityId);
      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Activity not found in this plan' });
        return;
      }

      const updates = { ...existing, ...req.body, activityId };
      const updatedActivities = plan.activities.map((a) => (a.activityId === activityId ? updates : a));
      const updated = await RehabilitationPlanRepository.update(plan.planId, {
        activities: updatedActivities,
        version: plan.version + 1,
      });

      res.json({ message: 'Activity updated successfully', activity: updates, planVersion: updated?.version });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update activity' });
    }
  },

  // DELETE /api/v1/plans/:planId/activities/:activityId
  async deleteActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plan, authorized } = await loadPlanAndCheck(req.params.planId, req.user);
      if (!plan) {
        res.status(404).json({ error: 'Not Found', message: 'Plan not found' });
        return;
      }
      if (!authorized) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to modify this plan' });
        return;
      }

      const activityId = req.params.activityId;
      const remaining = plan.activities.filter((a) => a.activityId !== activityId);
      if (remaining.length === plan.activities.length) {
        res.status(404).json({ error: 'Not Found', message: 'Activity not found in this plan' });
        return;
      }

      const updated = await RehabilitationPlanRepository.update(plan.planId, {
        activities: remaining,
        version: plan.version + 1,
      });

      res.json({ message: 'Activity removed from rehabilitation plan', planVersion: updated?.version });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete activity' });
    }
  },
};