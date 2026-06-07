import webpush from 'web-push';
import { pool } from '../db';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     || 'mailto:noreply@system22.xyz';

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC;
}

function ensureConfigured(): void {
  if (configured) return;
  if (!isPushConfigured()) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
}

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;   // path within the app to open on click, e.g. '/?ticket=abc'
  tag?:  string;   // groups similar notifications (replaces previous with same tag)
}

interface SubscriptionRow {
  id:       number;
  endpoint: string;
  p256dh:   string;
  auth:     string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  ensureConfigured();

  const r = await pool.query<SubscriptionRow>(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=$1',
    [userId]
  );
  if (r.rows.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.allSettled(
    r.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 = subscription is gone (uninstalled, expired). Clean up.
        if (status === 404 || status === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]).catch(() => {});
        } else {
          console.error('[push] send failed:', status, err);
        }
      }
    })
  );
}

export async function sendPushToRole(role: 'manager' | 'office', payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  ensureConfigured();

  const r = await pool.query<SubscriptionRow>(
    `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
     FROM push_subscriptions ps
     JOIN users u ON u.id = ps.user_id
     WHERE u.role = $1`,
    [role]
  );
  if (r.rows.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.allSettled(
    r.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]).catch(() => {});
        } else {
          console.error('[push] send failed:', status, err);
        }
      }
    })
  );
}
