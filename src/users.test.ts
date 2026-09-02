import { describe, expect, it } from "vitest";
import { SAVE_KEY } from "./data";
import {
  claimLegacySave,
  isValidUsername,
  normalizeUsername,
  readUserIndex,
  readUserSave,
  rememberUser,
  saveKeyFor,
} from "./users";

function mem(): Storage {
  const data: Record<string, string> = {};
  return {
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
    key() {
      return null;
    },
    get length() {
      return Object.keys(data).length;
    },
  } as Storage;
}

describe("username sign-in", () => {
  it("accepts short local names and rejects empty junk", () => {
    expect(isValidUsername("Caleb")).toBe(true);
    expect(isValidUsername("  caleb_2 ")).toBe(true);
    expect(normalizeUsername("  caleb_2 ")).toBe("caleb_2");
    expect(isValidUsername("")).toBe(false);
    expect(isValidUsername("???")).toBe(false);
  });

  it("moves the legacy save onto the first username only", () => {
    const storage = mem();
    storage.setItem(SAVE_KEY, JSON.stringify({ v: 4, views: 999, lifetimeViews: 999 }));
    expect(claimLegacySave("Caleb", storage)).toBe(true);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(JSON.parse(readUserSave("Caleb", storage)!).views).toBe(999);
    expect(claimLegacySave("Alice", storage)).toBe(false);
    expect(readUserSave("Alice", storage)).toBeNull();
    expect(storage.getItem(saveKeyFor("Caleb"))).toBeTruthy();
  });

  it("remembers last user without mixing names that share a slug", () => {
    const storage = mem();
    rememberUser("Caleb", storage);
    rememberUser("caleb", storage);
    rememberUser("Alice", storage);
    const index = readUserIndex(storage);
    expect(index.names).toEqual(["Caleb", "Alice"]);
    expect(index.last).toBe("Alice");
  });
});
