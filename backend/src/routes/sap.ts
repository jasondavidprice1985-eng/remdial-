import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { decodeSapCode, alternateColours } from '../services/sapDecoder';

const router = Router();

function decoderEnabled(): boolean {
  return process.env.SAP_DECODER_ENABLED === 'true';
}

router.get('/sap/decode/:code', requireAuth, async (req: Request, res: Response) => {
  if (!decoderEnabled()) {
    return res.status(404).json({ error: 'SAP decoder disabled' });
  }
  const raw = String(req.params.code || '').trim();
  if (!raw || raw.length > 40) return res.status(400).json({ error: 'Invalid code' });
  try {
    const decoded = await decodeSapCode(raw);
    return res.json({ decoded });
  } catch (e) {
    console.error('[SAP] decode error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sap/decode/:code/colours', requireAuth, async (req: Request, res: Response) => {
  if (!decoderEnabled()) {
    return res.status(404).json({ error: 'SAP decoder disabled' });
  }
  const raw = String(req.params.code || '').trim();
  if (!raw || raw.length > 40) return res.status(400).json({ error: 'Invalid code' });
  try {
    const alternates = await alternateColours(raw);
    return res.json({ alternates });
  } catch (e) {
    console.error('[SAP] alternates error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
