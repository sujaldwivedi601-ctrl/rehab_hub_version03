import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { initDatabase, dbStore } from './server/db/connection.js';
import { seedInitialData, migratePatientCodes } from './server/db/seed.js';

import authRoutes from './server/routes/authRoutes.js';
import patientRoutes from './server/routes/patientRoutes.js';
import sessionRoutes from './server/routes/sessionRoutes.js';
import doctorRoutes from './server/routes/doctorRoutes.js';
import scienceRoutes from './server/routes/scienceRoutes.js';
import testRoutes from './server/routes/testRoutes.js';
import accessRoutes from './server/routes/accessRoutes.js';
import { userRouter, doctorRouter } from './server/routes/accountRoutes.js';
import patientResourceRoutes from './server/routes/patientResourceRoutes.js';
import planRoutes from './server/routes/planRoutes.js';
import { exerciseRouter, gameRouter } from './server/routes/sessionRecordRoutes.js';
import analyticsRoutes from './server/routes/analyticsRoutes.js';
import { syncAllPatientsToFirestoreServer } from './server/services/firebaseServerSync.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Express middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const state = dbStore.getState();
  res.json({
    status: 'ok',
    service: 'NeuroRehab Connect Shared API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      status: 'UP',
      engine: dbStore.getMongoConnected() ? 'external-mongodb' : 'embedded-persistent-json',
      storageFile: 'data/neurorehab_db.json',
      connectedToExternalMongo: dbStore.getMongoConnected(),
      records: {
        users: state.users.length,
        patientProfiles: state.patientProfiles.length,
        rehabilitationPlans: state.rehabilitationPlans.length,
        exerciseSessions: state.exerciseSessions.length,
        cognitiveGameSessions: state.cognitiveGameSessions.length,
      },
    },
  });
});

// REST API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patient', patientRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/doctor', doctorRoutes);
app.use('/api/v1/science', scienceRoutes);
app.use('/api/v1/tests', testRoutes);
// Public 6-digit patient-code access (mobile app opens patient records)
app.use('/api/v1/access', accessRoutes);

// Full CRUD REST resources
app.use('/api/v1/users', userRouter);
app.use('/api/v1/doctors', doctorRouter);
app.use('/api/v1/patients', patientResourceRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/exercise-sessions', exerciseRouter);
app.use('/api/v1/game-sessions', gameRouter);
app.use('/api/v1/analytics', analyticsRoutes);

// Safe database offline fallback error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.name === 'MongooseError' || err?.name === 'MongoNetworkError' || err?.message?.includes('buffering timed out')) {
    console.info('[Database fallback] Handled database offline event safely');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

async function startServer() {
  try {
    // 1. Initialize Database & Seed
    await initDatabase();
    await seedInitialData();
    await migratePatientCodes();

    // 2. Synchronize all patient records to Mobile App Firestore Database
    syncAllPatientsToFirestoreServer().catch((e) =>
      console.warn('[Firebase] Initial sync notice:', e?.message || e)
    );

    // 2. Vite middleware in dev or static files in production
    if (!isProduction) {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted in development mode');
    } else {
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(port, '0.0.0.0', () => {
      console.log(`\n  ➜ Local:   http://localhost:${port}/`);
      console.log(`  ➜ Network: http://0.0.0.0:${port}/`);
      console.log(`  ➜ Health:  http://localhost:${port}/api/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
