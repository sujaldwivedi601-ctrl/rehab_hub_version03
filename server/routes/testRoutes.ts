import { Router, Request, Response } from 'express';
import { dbStore } from '../db/connection.js';

const router = Router();

// GET /api/v1/tests/ping - Simple connectivity check
router.get('/ping', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Test endpoint reachable',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/tests/db-status - Database status for integration tests
router.get('/db-status', (_req: Request, res: Response) => {
  const state = dbStore.getState();
  res.json({
    status: 'ok',
    engine: dbStore.getMongoConnected() ? 'external-mongodb' : 'embedded-persistent-json',
    connectedToExternalMongo: dbStore.getMongoConnected(),
    records: {
      users: state.users.length,
      patientProfiles: state.patientProfiles.length,
      rehabilitationPlans: state.rehabilitationPlans.length,
      exerciseSessions: state.exerciseSessions.length,
      cognitiveGameSessions: state.cognitiveGameSessions.length,
    },
  });
});

export default router;
