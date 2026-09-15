import type { HistoryEntry, SessionState } from "../types/exam";

const SESSION_KEY = "examhelper:session";
const HISTORY_PREFIX = "examhelper:history:";
const THEME_KEY = "examhelper:theme";
const MAX_HISTORY = 20;

export type Theme = "light" | "dark";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function saveSession(session: SessionState): void {
  write(SESSION_KEY, session);
}

export function loadSession(): SessionState | null {
  return read<SessionState>(SESSION_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function loadHistory(examId: string): HistoryEntry[] {
  return read<HistoryEntry[]>(HISTORY_PREFIX + examId) ?? [];
}

export function appendHistory(examId: string, entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory(examId)].slice(0, MAX_HISTORY);
  write(HISTORY_PREFIX + examId, next);
  return next;
}

export function resumableSession(examId: string): SessionState | null {
  const session = loadSession();
  if (!session || session.examId !== examId || session.finishedAt) return null;
  return session;
}

export function resolvedTheme(): Theme {
  const stored = read<Theme>(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function saveTheme(theme: Theme): void {
  write(THEME_KEY, theme);
  applyTheme(theme);
}
