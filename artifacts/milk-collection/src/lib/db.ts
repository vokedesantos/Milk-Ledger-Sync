import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CreateRecordBody } from '@workspace/api-client-react';

interface MilkDB extends DBSchema {
  records: {
    key: string;
    value: CreateRecordBody & { localId: string; synced: boolean; createdAt: string; };
    indexes: { 'synced': boolean };
  };
}

let dbPromise: Promise<IDBPDatabase<MilkDB>> | null = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB<MilkDB>('milk-collection-db', 1, {
    upgrade(db) {
      const store = db.createObjectStore('records', { keyPath: 'localId' });
      store.createIndex('synced', 'synced');
    },
  });
}

export async function saveLocalRecord(record: CreateRecordBody & { localId: string }) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put('records', {
    ...record,
    synced: false,
    createdAt: new Date().toISOString(),
  });
}

export async function getUnsyncedRecords() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return db.getAllFromIndex('records', 'synced', false);
}

export async function markRecordsSynced(localIds: string[]) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const tx = db.transaction('records', 'readwrite');
  
  for (const id of localIds) {
    const record = await tx.store.get(id);
    if (record) {
      record.synced = true;
      await tx.store.put(record);
    }
  }
  await tx.done;
}

export async function getLocalRecords() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return db.getAll('records');
}
