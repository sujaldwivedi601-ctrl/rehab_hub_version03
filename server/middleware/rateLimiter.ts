import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const attemptsMap = new Map<string, AttemptRecord>();

export function createRateLimiter(options: { max: number; windowMs: number; message?: string }) {
  const { max, windowMs, message = 'Too many requests, please try again later.' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || ''}${req.path}:${ip}`;
    const now = Date.now();

    const record = attemptsMap.get(key);
    if (!record || now > record.resetAt) {
      attemptsMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfterSeconds,
      });
      return;
    }

    record.count++;
    return next();
  };
}
