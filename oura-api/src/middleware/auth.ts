import type { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const serverKey = process.env.OURA_SERVER_KEY;

  // Skip auth if no server key is configured (local dev)
  if (!serverKey) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== serverKey) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }

  next();
}
