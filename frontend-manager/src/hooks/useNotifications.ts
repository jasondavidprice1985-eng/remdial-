import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../auth/apiClient';

type Status = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

// base64url-to-Uint8Array — VAPID public key arrives as a base64url string,
// PushManager.subscribe needs a Uint8Array
function urlBase64ToUint8(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function useNotifications(authed: boolean): {
  status: Status;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
} {
  const [status, setStatus] = useState<Status>('loading');

  const refresh = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg) { setStatus('unsubscribed'); return; }
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub ? 'subscribed' : 'unsubscribed');
  }, []);

  useEffect(() => { if (authed) refresh(); }, [authed, refresh]);

  const enable = useCallback(async (): Promise<void> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setStatus(perm === 'denied' ? 'denied' : 'unsubscribed');
      return;
    }
    setStatus('loading');
    try {
      const keyRes = await apiFetch('/push/vapid-key');
      if (!keyRes.ok) throw new Error('no vapid key');
      const { key } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8(key) as unknown as BufferSource,
        });
      }

      const subJson = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const post = await apiFetch('/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
      });
      if (!post.ok) throw new Error('subscribe failed');
      setStatus('subscribed');
    } catch (err) {
      console.error('[push] enable failed', err);
      setStatus('unsubscribed');
    }
  }, []);

  const disable = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiFetch('/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setStatus('unsubscribed');
    } catch (err) {
      console.error('[push] disable failed', err);
      await refresh();
    }
  }, [refresh]);

  return { status, enable, disable };
}
