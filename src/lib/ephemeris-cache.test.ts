import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";
import {
  calculateNatalChart,
  calculateWeek,
  EPHEMERIS_MODEL_VERSION,
  getMondayISO,
} from "./ephemeris";
import { isReusableWeeklyBundle } from "./weekly-bundle";
import { createWeeklyReadings } from "./readings";
import type { BirthProfile, WeeklyBundle } from "./types";

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

const referenceDate = new Date(2026, 10, 17, 12, 0, 0);

function makeBundle(
  targetProfile: BirthProfile = profile,
  reference = referenceDate,
): WeeklyBundle {
  const natal = calculateNatalChart(targetProfile);
  const days = calculateWeek(reference);
  return {
    version: 1,
    ephemerisVersion: EPHEMERIS_MODEL_VERSION,
    weekStart: getMondayISO(reference),
    profileUpdatedAt: targetProfile.updatedAt,
    calculatedAt: "2026-11-17T12:00:00.000Z",
    natal,
    days,
    readings: createWeeklyReadings(targetProfile, natal, days),
  };
}

describe("validação do cache semanal", () => {
  it("reutiliza o bundle atual do perfil e da semana", () => {
    const bundle = makeBundle();
    expect(isReusableWeeklyBundle(bundle, profile, referenceDate)).toBe(true);
  });

  it("rejeita uma semana calculada por outra versão do motor", () => {
    const bundle = { ...makeBundle(), ephemerisVersion: "modelo-anterior" };
    expect(isReusableWeeklyBundle(bundle, profile, referenceDate)).toBe(false);
  });

  it("rejeita bundle de outra semana ou de outro perfil", () => {
    const previousWeek = makeBundle(profile, new Date(2026, 10, 10, 12, 0, 0));
    const changedProfile = { ...profile, updatedAt: "2001-01-01T12:00:00.000Z" };

    expect(isReusableWeeklyBundle(previousWeek, profile, referenceDate)).toBe(false);
    expect(isReusableWeeklyBundle(makeBundle(), changedProfile, referenceDate)).toBe(false);
  });

  it("rejeita estrutura incompleta em vez de entregar dados inválidos à interface", () => {
    const incomplete = { ...makeBundle(), days: [] };
    expect(isReusableWeeklyBundle(incomplete, profile, referenceDate)).toBe(false);
  });

  it("preserva o perfil de um backup antigo e descarta leituras sem versão de motor", () => {
    const current = makeBundle();
    const legacyBundle = { ...current, ephemerisVersion: undefined };
    const backup = {
      version: 1,
      exportedAt: "2026-11-17T12:00:00.000Z",
      profile,
      weeklyBundle: legacyBundle,
    };

    const imported = parseBackup(JSON.stringify(backup));
    expect(imported.profile).toEqual(profile);
    expect(imported.weeklyBundle).toBeNull();
  });

  it("rejeita um backup sem os campos de perfil necessários ao cálculo", () => {
    const backup = {
      version: 1,
      profile: { name: "Perfil incompleto", birthDate: "1990-06-15" },
      weeklyBundle: null,
    };

    expect(() => parseBackup(JSON.stringify(backup))).toThrow("perfil válido");
  });
});
