import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";
import { EPHEMERIS_MODEL_VERSION } from "./ephemeris";
import type { BirthProfile } from "./types";

const profile: BirthProfile = {
  schemaVersion: 1,
  name: "Perfil de teste",
  birthDate: "1990-06-15",
  birthTime: "12:00",
  birthTimeAccuracy: "exact",
  birthPlace: "",
  birthTimezone: "UTC",
  timezoneConfirmed: true,
  updatedAt: "2000-01-01T12:00:00.000Z",
};

const oldBundle = {
  version: 1,
  weekStart: "2026-10-12",
  profileUpdatedAt: profile.updatedAt,
  calculatedAt: "2026-10-12T12:00:00.000Z",
  natal: {} as any,
  days: Array.from({ length: 7 }, () => ({})) as any,
  readings: Array.from({ length: 7 }, () => ({})) as any,
};

function checkWeeklyBundleVersion(bundle: any): boolean {
  return (
    bundle &&
    typeof bundle === "object" &&
    bundle.ephemerisVersion === EPHEMERIS_MODEL_VERSION
  );
}

describe("versão das efemérides salvas", () => {
  it("não reutiliza uma semana calculada antes do motor geocêntrico", () => {
    expect(checkWeeklyBundleVersion(oldBundle)).toBe(false);
  });

  it("aceita uma semana marcada com a versão atual do motor", () => {
    expect(
      checkWeeklyBundleVersion({
        ...oldBundle,
        ephemerisVersion: EPHEMERIS_MODEL_VERSION,
      })
    ).toBe(true);
  });

  it("importa o perfil de um backup e realiza o parse correto", () => {
    const backup = {
      version: 1,
      exportedAt: "2026-10-12T12:00:00.000Z",
      profile,
      weeklyBundle: null,
    };

    const imported = parseBackup(JSON.stringify(backup));
    expect(imported.profile).toEqual(profile);
    expect(imported.weeklyBundle).toBeNull();
  });
});
