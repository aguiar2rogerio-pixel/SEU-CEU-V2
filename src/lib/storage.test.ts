import { afterEach, describe, expect, it, vi } from "vitest";
import { restoreProfileAndBundle } from "./storage";
import type { BirthProfile } from "./types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  private failRemoveOnceFor: string | null = null;

  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) {
    if (key === this.failRemoveOnceFor) {
      this.failRemoveOnceFor = null;
      throw new Error("simulated storage failure");
    }
    this.values.delete(key);
  }
  clear() { this.values.clear(); }
  failNextRemove(key: string) { this.failRemoveOnceFor = key; }
}

const nextProfile: BirthProfile = {
  schemaVersion: 1,
  name: "Perfil novo",
  birthDate: "1990-06-15",
  birthTime: "12:00",
  birthTimeAccuracy: "exact",
  birthPlace: "São Paulo - SP",
  birthState: "SP",
  birthCity: "São Paulo",
  birthLatitude: -23.55,
  birthLongitude: -46.63,
  birthTimezone: "America/Sao_Paulo",
  timezoneConfirmed: true,
  updatedAt: "2026-11-17T12:00:00.000Z",
};

afterEach(() => vi.unstubAllGlobals());

describe("restoreProfileAndBundle", () => {
  it("grava o perfil e remove uma semana que o backup não pode reutilizar", () => {
    const storage = new MemoryStorage();
    storage.setItem("seu_ceu_profile", JSON.stringify({ name: "Perfil antigo" }));
    storage.setItem("seu_ceu_weekly_bundle", JSON.stringify({ weekStart: "2026-11-16" }));
    vi.stubGlobal("localStorage", storage);

    restoreProfileAndBundle(nextProfile, null);

    expect(JSON.parse(storage.getItem("seu_ceu_profile") ?? "null")).toEqual(nextProfile);
    expect(storage.getItem("seu_ceu_weekly_bundle")).toBeNull();
  });

  it("restaura os valores anteriores se uma das gravações da importação falhar", () => {
    const storage = new MemoryStorage();
    const oldProfile = JSON.stringify({ name: "Perfil antigo" });
    const oldBundle = JSON.stringify({ weekStart: "2026-11-16" });
    storage.setItem("seu_ceu_profile", oldProfile);
    storage.setItem("seu_ceu_weekly_bundle", oldBundle);
    storage.failNextRemove("seu_ceu_weekly_bundle");
    vi.stubGlobal("localStorage", storage);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => restoreProfileAndBundle(nextProfile, null)).toThrow(/restauração/i);
    expect(storage.getItem("seu_ceu_profile")).toBe(oldProfile);
    expect(storage.getItem("seu_ceu_weekly_bundle")).toBe(oldBundle);
    consoleError.mockRestore();
  });
});
