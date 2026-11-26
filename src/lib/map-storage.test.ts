import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addMapToApplication,
  calculateProfileFingerprint,
  createEmptyMapRecord,
  deleteMapFromApplication,
  loadApplicationManifest,
  loadAllNatalMapRecords,
  loadNatalMapRecord,
  migrateLegacyStorage,
  mapStorageKey,
  restoreApplicationState,
  restoreImportedApplicationState,
  restoreLegacyBackupAsApplicationState,
  setPrimaryMapInApplication,
  updateMapInApplication,
} from "./map-storage";
import type { BirthProfile } from "./types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const profile: BirthProfile = {
  schemaVersion: 1,
  name: "Pessoa principal",
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

describe("map-storage", () => {
  it("migra o perfil, as leituras locais e o acesso sem apagar as chaves antigas", () => {
    const storage = new MemoryStorage();
    storage.setItem("seu_ceu_profile", JSON.stringify(profile));
    storage.setItem("seu_ceu_saved_ai_reading", "Leitura natal legada");
    storage.setItem("seu_ceu_reading_current", "Momento legado");
    storage.setItem("seu_ceu_v2_test_access", "granted");
    vi.stubGlobal("localStorage", storage);

    const manifest = migrateLegacyStorage();
    expect(manifest?.primaryMapId).toBeTruthy();
    expect(manifest?.access.testAccessGranted).toBe(true);
    const map = loadNatalMapRecord(manifest?.primaryMapId ?? "");
    expect(map?.readings.natal?.text).toBe("Leitura natal legada");
    expect(map?.readings.current?.text).toBe("Momento legado");
    expect(storage.getItem("seu_ceu_profile")).toBe(JSON.stringify(profile));
    expect(storage.getItem("seu_ceu_v2_test_access")).toBe("granted");
  });

  it("é repetível e não duplica o mapa principal", () => {
    const storage = new MemoryStorage();
    storage.setItem("seu_ceu_profile", JSON.stringify(profile));
    vi.stubGlobal("localStorage", storage);

    const first = migrateLegacyStorage();
    const second = migrateLegacyStorage();
    expect(second).toEqual(first);
    expect(loadApplicationManifest()?.mapIds).toHaveLength(1);
  });

  it("ignora o nome ao calcular o fingerprint natal", () => {
    expect(calculateProfileFingerprint(profile)).toBe(
      calculateProfileFingerprint({ ...profile, name: "Outro nome", updatedAt: "2026-11-18T12:00:00.000Z" }),
    );
  });

  it("mantém registros individuais independentes", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const first = createEmptyMapRecord(profile);
    const second = createEmptyMapRecord({ ...profile, name: "Outra pessoa" });
    storage.setItem(mapStorageKey(first.id), JSON.stringify(first));
    storage.setItem(mapStorageKey(second.id), JSON.stringify(second));
    expect(first.id).not.toBe(second.id);
    expect(loadNatalMapRecord(first.id)?.profile.name).toBe("Pessoa principal");
    expect(loadNatalMapRecord(second.id)?.profile.name).toBe("Outra pessoa");
  });

  it("cria mapa adicional sem bundle e permite transferir o principal", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const first = createEmptyMapRecord(profile);
    const now = new Date().toISOString();
    restoreApplicationState({ schemaVersion: 2, primaryMapId: first.id, mapIds: [first.id], access: { testAccessGranted: true }, createdAt: now, updatedAt: now }, [first]);
    const second = createEmptyMapRecord({ ...profile, name: "Outra pessoa" });
    addMapToApplication(second);
    expect(loadApplicationManifest()?.mapIds).toHaveLength(2);
    expect(loadNatalMapRecord(second.id)?.weeklyBundle).toBeNull();
    expect(setPrimaryMapInApplication(second.id).primaryMapId).toBe(second.id);
  });

  it("preserva a leitura quando só o nome muda e remove somente a natal quando os dados mudam", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const map = createEmptyMapRecord(profile);
    const withReading = { ...map, readings: { ...map.readings, natal: { text: "Leitura", type: "natal" as const, savedAt: "2026-11-01", calculationFingerprint: map.calculationFingerprint, profileName: profile.name, status: "current" as const } } };
    const now = new Date().toISOString();
    restoreApplicationState({ schemaVersion: 2, primaryMapId: map.id, mapIds: [map.id], access: { testAccessGranted: true }, createdAt: now, updatedAt: now }, [withReading]);
    const renamed = updateMapInApplication({ ...withReading, profile: { ...profile, name: "Nome novo" }, readings: { ...withReading.readings, natal: { ...withReading.readings.natal!, profileName: "Nome novo" } } });
    expect(loadNatalMapRecord(renamed.primaryMapId!)?.readings.natal?.text).toBe("Leitura");
    const changed = loadNatalMapRecord(map.id)!;
    updateMapInApplication({ ...changed, profile: { ...profile, birthDate: "1991-06-15" }, readings: { ...changed.readings, natal: null } });
    expect(loadNatalMapRecord(map.id)?.readings.natal).toBeNull();
  });

  it("exclui um mapa sem afetar os outros e permite permanecer sem principal", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const first = createEmptyMapRecord(profile);
    const second = createEmptyMapRecord({ ...profile, name: "Outra pessoa" });
    const now = new Date().toISOString();
    restoreApplicationState({ schemaVersion: 2, primaryMapId: first.id, mapIds: [first.id, second.id], access: { testAccessGranted: true }, createdAt: now, updatedAt: now }, [first, second]);
    deleteMapFromApplication(first.id);
    expect(loadApplicationManifest()?.primaryMapId).toBeNull();
    expect(loadAllNatalMapRecords()).toHaveLength(1);
    expect(loadNatalMapRecord(second.id)?.profile.name).toBe("Outra pessoa");
  });

  it("rejeita restauração quando o manifesto e os registros não têm o mesmo conjunto de IDs", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const first = createEmptyMapRecord(profile);
    const second = createEmptyMapRecord({ ...profile, name: "Outra pessoa" });
    const now = new Date().toISOString();
    expect(() => restoreApplicationState({ schemaVersion: 2, primaryMapId: first.id, mapIds: [first.id, second.id], access: { testAccessGranted: false }, createdAt: now, updatedAt: now }, [first, first])).toThrow(/inválido/i);
  });

  it("não importa autorização de acesso de backup v1 ou v2", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const map = createEmptyMapRecord(profile);
    const now = new Date().toISOString();
    const importedManifest = { schemaVersion: 2 as const, primaryMapId: map.id, mapIds: [map.id], access: { testAccessGranted: true }, createdAt: now, updatedAt: now };
    restoreImportedApplicationState(importedManifest, [map], false);
    expect(loadApplicationManifest()?.access.testAccessGranted).toBe(false);
    restoreLegacyBackupAsApplicationState(profile, null, false);
    expect(loadApplicationManifest()?.access.testAccessGranted).toBe(false);
  });
});
