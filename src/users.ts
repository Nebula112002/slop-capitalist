import { SAVE_KEY, UI_ROUTE_KEY, USER_INDEX_KEY } from "./data";

export type UserIndex = {
  last: string;
  names: string[];
};

export function normalizeUsername(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 24);
}

export function usernameSlug(name: string): string {
  return normalizeUsername(name).toLowerCase();
}

export function isValidUsername(raw: string): boolean {
  const name = normalizeUsername(raw);
  return /^[A-Za-z0-9][A-Za-z0-9 _-]{0,23}$/.test(name);
}

export function saveKeyFor(username: string): string {
  return `${SAVE_KEY}.${encodeURIComponent(usernameSlug(username))}`;
}

export function uiKeyFor(username: string): string {
  return `${UI_ROUTE_KEY}.${encodeURIComponent(usernameSlug(username))}`;
}

export function emptyUserIndex(): UserIndex {
  return { last: "", names: [] };
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = normalizeUsername(raw);
    if (!isValidUsername(name)) continue;
    const slug = usernameSlug(name);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(name);
  }
  return out;
}

export function readUserIndex(storage: Storage): UserIndex {
  try {
    const raw = storage.getItem(USER_INDEX_KEY);
    if (!raw) return emptyUserIndex();
    const parsed = JSON.parse(raw) as Partial<UserIndex>;
    const names = uniqueNames(Array.isArray(parsed.names) ? parsed.names.map(String) : []);
    const lastRaw = typeof parsed.last === "string" ? parsed.last : "";
    const last =
      names.find((name) => usernameSlug(name) === usernameSlug(lastRaw)) ?? names[0] ?? "";
    return { last, names };
  } catch {
    return emptyUserIndex();
  }
}

export function writeUserIndex(index: UserIndex, storage: Storage): void {
  storage.setItem(USER_INDEX_KEY, JSON.stringify({ last: index.last, names: uniqueNames(index.names) }));
}

export function rememberUser(username: string, storage: Storage): UserIndex {
  const name = normalizeUsername(username);
  const index = readUserIndex(storage);
  const slug = usernameSlug(name);
  const existing = index.names.find((row) => usernameSlug(row) === slug);
  const names = existing ? index.names : [...index.names, name];
  const next = { last: existing ?? name, names };
  writeUserIndex(next, storage);
  return next;
}

export function claimLegacySave(username: string, storage: Storage): boolean {
  const key = saveKeyFor(username);
  if (storage.getItem(key)) return false;
  const legacy = storage.getItem(SAVE_KEY);
  if (!legacy) return false;
  storage.setItem(key, legacy);
  storage.removeItem(SAVE_KEY);
  return true;
}

export function readUserSave(username: string, storage: Storage): string | null {
  return storage.getItem(saveKeyFor(username));
}

export function writeUserSave(username: string, raw: string, storage: Storage): void {
  storage.setItem(saveKeyFor(username), raw);
}

export function clearUserSave(username: string, storage: Storage): void {
  storage.removeItem(saveKeyFor(username));
}

/**
 * Erasure, for real: every save, every player name, and the remembered screen.
 * Prefix-scanned rather than key-by-key so a save from an older build cannot
 * survive a player asking for their data to be deleted.
 */
export function clearAllLocalData(storage: Storage): string[] {
  const doomed: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith("slop-capitalist")) doomed.push(key);
  }
  for (const key of doomed) storage.removeItem(key);
  return doomed;
}
