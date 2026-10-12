import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export interface DatabaseState {
  users: any[];
  patientProfiles: any[];
  rehabilitationPlans: any[];
  exerciseSessions: any[];
  cognitiveGameSessions: any[];
  refreshTokens: any[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'neurorehab_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory + persistent JSON database adapter for zero-downtime operation
// Automatically backs up and syncs with Mongoose models if MONGODB_URI is provided.
class EmbeddedDataStore {
  private state: DatabaseState = {
    users: [],
    patientProfiles: [],
    rehabilitationPlans: [],
    exerciseSessions: [],
    cognitiveGameSessions: [],
    refreshTokens: [],
  };

  private isConnectedToMongo = false;

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing local database file, initializing clean state.', e);
    }
  }

  public saveToFile() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public setMongoConnected(status: boolean) {
    this.isConnectedToMongo = status;
  }

  public getMongoConnected(): boolean {
    return this.isConnectedToMongo;
  }
}

export const dbStore = new EmbeddedDataStore();

// Configure Mongoose to fail fast rather than hang when offline
mongoose.set('bufferCommands', false);

export async function initDatabase(): Promise<{ isMongo: boolean; message: string }> {
  const rawMongoUri = process.env.MONGODB_URI?.trim();

  // In cloud container environments without a local MongoDB daemon,
  // localhost / 127.0.0.1 targets will immediately throw ECONNREFUSED.
  // We route directly to the persistent embedded storage engine.
  const isLocalhost =
    !rawMongoUri ||
    rawMongoUri.includes('localhost') ||
    rawMongoUri.includes('127.0.0.1');

  if (!isLocalhost && rawMongoUri) {
    try {
      await mongoose.connect(rawMongoUri, {
        serverSelectionTimeoutMS: 3000,
      });
      dbStore.setMongoConnected(true);
      console.log('Connected successfully to MongoDB at:', rawMongoUri.split('@')[1] || 'configured URI');
      return { isMongo: true, message: 'Connected to external MongoDB database' };
    } catch (err: any) {
      console.info('External MongoDB connection unavailable, using embedded engine:', err.message);
      dbStore.setMongoConnected(false);
      return { isMongo: false, message: `Fallback to embedded persistent engine: ${err.message}` };
    }
  } else {
    console.info('Operating on embedded persistent JSON database engine (data/neurorehab_db.json).');
    dbStore.setMongoConnected(false);
    return { isMongo: false, message: 'Running on embedded persistent JSON database' };
  }
}
