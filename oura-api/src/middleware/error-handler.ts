import type { Request, Response, NextFunction } from 'express';
import { OuraApiError } from '../oura-client.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err.message);

  if (err instanceof OuraApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
