import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { decodeSapCode, alternateColours } from '../services/sapDecoder';
import { findKitchen, suggestDevelopers } from '../services/kitchenLookup';

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

router.get('/sap/kitchen', requireAuth, async (req: Request, res: Response) => {
  if (!decoderEnabled()) {
    return res.status(404).json({ error: 'SAP decoder disabled' });
  }
  const developer = String(req.query.developer || '').trim();
  const site      = String(req.query.site      || '').trim();
  const plot      = String(req.query.plot      || '').trim();
  if (!developer || !site || !plot) {
    return res.status(400).json({ error: 'developer, site and plot are required' });
  }
  if (developer.length > 200 || site.length > 200 || plot.length > 50) {
    return res.status(400).json({ error: 'Inputs too long' });
  }
  try {
    const result = await findKitchen(developer, site, plot);
    return res.json(result);
  } catch (e) {
    console.error('[SAP] kitchen lookup error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sap/developers', requireAuth, async (req: Request, res: Response) => {
  if (!decoderEnabled()) {
    return res.status(404).json({ error: 'SAP decoder disabled' });
  }
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ suggestions: [] });
  if (q.length > 100) return res.status(400).json({ error: 'Query too long' });
  try {
    const suggestions = await suggestDevelopers(q);
    return res.json({ suggestions });
  } catch (e) {
    console.error('[SAP] developer suggest error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
