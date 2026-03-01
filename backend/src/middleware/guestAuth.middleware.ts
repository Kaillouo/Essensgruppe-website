import { Request, Response, NextFunction } from 'express';

export interface GuestRequest extends Request {
  guestId?: string;
}

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function authenticateGuest(req: GuestRequest, res: Response, next: NextFunction) {
  const guestId = req.headers['x-guest-id'] as string | undefined;
  if (!guestId || !UUID_RE.test(guestId)) {
    return res.status(401).json({ error: 'Gültige Gast-ID fehlt.' });
  }
  req.guestId = guestId;
  next();
}
