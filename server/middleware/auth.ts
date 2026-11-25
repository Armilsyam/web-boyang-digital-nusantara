import type { NextFunction, Request, Response } from 'express';
import { db, mapUser } from '../db.ts';
import { verifySessionToken } from '../utils/crypto.ts';
import type { User } from '../../src/types/index.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    result[k] = v;
  }
  return result;
}

export function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies['boyang_session'] || null;
}

export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  const payload = verifySessionToken(token);
  if (payload) {
    const row = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(payload.uid) as Record<string, unknown> | undefined;
    if (row) {
      req.user = mapUser(row);
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Silakan masuk terlebih dahulu.' });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Silakan masuk terlebih dahulu.' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Administrator.' });
  }
  next();
}
