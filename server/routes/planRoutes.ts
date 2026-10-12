import { Router } from 'express';
import { PlanController } from '../controllers/planController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['doctor', 'admin']));

router.get('/', PlanController.listPlans);
router.post('/', PlanController.createPlan);
router.get('/:planId', PlanController.getPlan);
router.patch('/:planId', PlanController.updatePlan);
router.delete('/:planId', PlanController.deletePlan);
router.post('/:planId/activities', PlanController.addActivity);
router.patch('/:planId/activities/:activityId', PlanController.updateActivity);
router.delete('/:planId/activities/:activityId', PlanController.deleteActivity);

export default router;