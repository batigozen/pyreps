import { create } from "zustand";
import {
  clearSession,
  saveSession,
  setDailyDone,
  type SessionData,
  type SessionResult,
} from "../db/db.ts";

type SessionStore = {
  session: SessionData | null;
  /** Start or resume a session. It is saved, so closing the app keeps it. */
  begin: (session: SessionData) => void;
  /** Records the answer to the card at `index`, and moves the pointer past it. */
  answer: (result: SessionResult, requeue: boolean) => void;
  /** Replaces the rating of the last result ("I knew this" / "I guessed"). */
  rerate: (rating: SessionResult["rating"]) => void;
  end: () => void;
};

const persist = (session: SessionData) => {
  void saveSession(session);
  if (session.mode === "daily" && session.index >= session.queue.length)
    void setDailyDone(session.day);
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  begin: (session) => {
    persist(session);
    set({ session });
  },
  answer: (result, requeue) => {
    const current = get().session;
    if (!current) return;
    const again = requeue && !current.requeued.includes(result.cardId);
    const session: SessionData = {
      ...current,
      index: current.index + 1,
      queue: again ? [...current.queue, result.cardId] : current.queue,
      requeued: again ? [...current.requeued, result.cardId] : current.requeued,
      results: [...current.results, result],
    };
    persist(session);
    set({ session });
  },
  rerate: (rating) => {
    const current = get().session;
    const last = current?.results.at(-1);
    if (!current || !last) return;
    const session = { ...current, results: [...current.results.slice(0, -1), { ...last, rating }] };
    persist(session);
    set({ session });
  },
  end: () => {
    void clearSession();
    set({ session: null });
  },
}));
