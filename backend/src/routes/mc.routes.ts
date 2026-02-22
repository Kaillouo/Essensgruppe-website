import { Router } from 'express';
import net from 'net';

const router = Router();

const MC_HOST = 'Mc.essensgruppe.com';
const MC_PORT = 25565;
const TIMEOUT_MS = 3000;

// GET /api/mc/status — TCP ping to check if MC server is reachable
router.get('/status', (_req, res) => {
  const socket = new net.Socket();
  let resolved = false;

  const done = (online: boolean) => {
    if (resolved) return;
    resolved = true;
    socket.destroy();
    res.json({ online });
  };

  socket.setTimeout(TIMEOUT_MS);
  socket.connect(MC_PORT, MC_HOST, () => done(true));
  socket.on('error', () => done(false));
  socket.on('timeout', () => done(false));
});

export default router;
