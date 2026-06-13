import { PendingReport } from '@shared/types';

const DB_NAME    = 'remedial_manager';
const DB_VERSION = 2;

const STORE_PENDING   = 'pending_reports';
const STORE_MESSAGES  = 'pending_messages';
const STORE_SYNC_META = 'sync_meta';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const store = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id', autoIncrement: true });
        store.createIndex('ticketId', 'ticketId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_META)) {
        db.createObjectStore(STORE_SYNC_META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function savePendingReport(report: PendingReport): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    const req = tx.objectStore(STORE_PENDING).put(report);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function getAllPendingReports(): Promise<PendingReport[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_PENDING, 'readonly');
    const req = tx.objectStore(STORE_PENDING).getAll();
    req.onsuccess = () =>
      resolve((req.result as PendingReport[]).sort((a, b) => a.key - b.key));
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingReport(key: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_PENDING, 'readwrite');
    const req = tx.objectStore(STORE_PENDING).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// --- Pending messages (for offline chat) ---

export interface QueuedMessage {
  id?: number;
  ticketId: string;
  body: Record<string, unknown>;
  createdAt: number;
}

export async function savePendingMessage(msg: Omit<QueuedMessage, 'id'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MESSAGES, 'readwrite');
    const req = tx.objectStore(STORE_MESSAGES).add(msg);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function getAllPendingMessages(): Promise<QueuedMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_MESSAGES, 'readonly');
    const req = tx.objectStore(STORE_MESSAGES).getAll();
    req.onsuccess = () => resolve((req.result as QueuedMessage[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingMessage(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_MESSAGES, 'readwrite');
    const req = tx.objectStore(STORE_MESSAGES).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// --- Sync metadata ---

export async function getLastSyncTimestamp(): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_SYNC_META, 'readonly');
    const req = tx.objectStore(STORE_SYNC_META).get('lastSync');
    req.onsuccess = () => resolve((req.result as string) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function setLastSyncTimestamp(ts: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_META, 'readwrite');
    const req = tx.objectStore(STORE_SYNC_META).put(ts, 'lastSync');
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
