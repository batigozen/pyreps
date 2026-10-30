import { Dexie, type EntityTable } from "dexie";

// Schema v1 from ARCHITECTURE.md. Only `kv` is used so far; Phase 4 fills the others.
// Changing a store's indexes later needs db.version(2) and a migration.

type KvRow = { key: string; value: unknown };
type IdRow = { id?: number; cardId: string; at: number };

type PyRepsDb = Dexie & {
  reviewStates: EntityTable<{ cardId: string; due: Date; state: number }, "cardId">;
  reviewLog: EntityTable<IdRow & { rating: number }, "id">;
  attempts: EntityTable<IdRow, "id">;
  projects: EntityTable<{ projectId: string }, "projectId">;
  kv: EntityTable<KvRow, "key">;
};

export const db = new Dexie("pyreps") as PyRepsDb;

db.version(1).stores({
  reviewStates: "cardId, due, state",
  reviewLog: "++id, cardId, at, rating",
  attempts: "++id, cardId, at",
  projects: "projectId",
  kv: "key",
});

export async function getKv<T>(key: string): Promise<T | undefined> {
  const row = await db.kv.get(key);
  return row?.value as T | undefined;
}

export async function setKv(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}

export async function deleteKv(key: string): Promise<void> {
  await db.kv.delete(key);
}

const draftKey = (id: string) => `draft:${id}`;

/** The user's unfinished code for a write card or the playground. */
export const loadDraft = (id: string) => getKv<string>(draftKey(id));
export const saveDraft = (id: string, code: string) => setKv(draftKey(id), code);
export const clearDraft = (id: string) => deleteKv(draftKey(id));
