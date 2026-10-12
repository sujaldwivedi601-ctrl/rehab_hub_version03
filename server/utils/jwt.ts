import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IUser } from '../models/types.js';

// ─── Configuration ───────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'neurorehab-connect-dev-secret-key-2026';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const BCRYPT_SALT_ROUNDS = 12;

// ─── Token Payload ───────────────────────────────────────────────
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ─── Password Utilities ──────────────────────────────────────────

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 */
export async function comparePassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// ─── Access Token ────────────────────────────────────────────────

/**
 * Generate a short-lived JWT access token for the given user.
 */
export function generateAccessToken(user: IUser): string {
  const payload: TokenPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Verify and decode a JWT access token. Returns the payload or null if invalid/expired.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// ─── Refresh Token ───────────────────────────────────────────────

/**
 * Generate a cryptographically random refresh token string.
 */
export function generateRefreshTokenString(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Hash a raw refresh token for safe storage (SHA-256).
 */
export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Calculate the expiry date for a new refresh token.
 */
export function calculateRefreshTokenExpiry(): string {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expiresAt.toISOString();
}
