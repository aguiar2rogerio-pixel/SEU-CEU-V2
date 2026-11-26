import { describe, expect, it } from "vitest";
import { createBackupV2, parseBackup } from "./backup";
import { createEmptyMapRecord } from "./map-storage";
import type { ApplicationManifest, BirthProfile } from "./types";

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

function manifest(mapId: string): ApplicationManifest {
  return {
    schemaVersion: 2,
    primaryMapId: mapId,
    mapIds: [mapId],
    access: { testAccessGranted: true },
    createdAt: "2026-11-17T12:00:00.000Z",
    updatedAt: "2026-11-17T12:00:00.000Z",
  };
}

describe("backup v2", () => {
  it("preserva manifesto, mapas e acesso como dados separados", () => {
    const map = createEmptyMapRecord(profile);
    const data = createBackupV2(manifest(map.id), [map]);
    const parsed = parseBackup(JSON.stringify(data));
    expect(parsed.version).toBe(2);
    if (parsed.version !== 2) return;
    expect(parsed.manifest.primaryMapId).toBe(map.id);
    expect(parsed.maps[0].profile.name).toBe("Pessoa principal");
    expect(parsed.manifest.access.testAccessGranted).toBe(true);
  });

  it("rejeita mapa que não pertence ao manifesto", () => {
    const first = createEmptyMapRecord(profile);
    const second = createEmptyMapRecord({ ...profile, name: "Outra pessoa" });
    expect(() => createBackupV2(manifest(first.id), [second])).toThrow(/mapas/i);
  });

  it("mantém compatibilidade com o formato v1", () => {
    const parsed = parseBackup(JSON.stringify({ version: 1, exportedAt: "2026-11-17T12:00:00.000Z", profile, weeklyBundle: null }));
    expect(parsed.version).toBe(1);
    if (parsed.version !== 1) return;
    expect(parsed.profile).toEqual(profile);
    expect(parsed.weeklyBundle).toBeNull();
  });
});
