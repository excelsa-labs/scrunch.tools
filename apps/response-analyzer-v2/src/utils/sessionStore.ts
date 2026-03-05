import { get, set, del } from 'idb-keyval';
import type { FilterState } from '../types';

const STORE_KEY = 'response-analyzer-v2:session';

export interface SessionState {
  rawCSV: string;
  filters: FilterState;
  activeTab: string;
  searchInput: string;
  savedAt: number;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Save session state to IndexedDB (debounced — waits 500ms after last call).
 */
export function saveSession(state: Omit<SessionState, 'savedAt'>): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const session: SessionState = { ...state, savedAt: Date.now() };
    set(STORE_KEY, session).catch(err => {
      console.warn('Failed to save session:', err);
    });
  }, 500);
}

/**
 * Load session state from IndexedDB.
 * Returns null if no session exists or if it's older than 24 hours.
 */
export async function loadSession(): Promise<SessionState | null> {
  try {
    const session = await get<SessionState>(STORE_KEY);
    if (!session) return null;

    // Expire sessions older than 24 hours
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (Date.now() - session.savedAt > ONE_DAY) {
      await clearSession();
      return null;
    }

    return session;
  } catch (err) {
    console.warn('Failed to load session:', err);
    return null;
  }
}

/**
 * Clear the saved session from IndexedDB.
 */
export async function clearSession(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  try {
    await del(STORE_KEY);
  } catch (err) {
    console.warn('Failed to clear session:', err);
  }
}
