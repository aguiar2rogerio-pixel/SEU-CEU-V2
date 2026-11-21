import { describe, expect, it } from "vitest";
import { calculateProfilePlacidus } from "./profile-placidus";
import type { BirthProfile, NatalChart } from "../types";

const baseProfile: BirthProfile = {
  schemaVersion: 1,
  name: "Perfil de teste",
  birthDate: "2024-01-15",
  birthTime: "12:00",
  birthTimeAccuracy: "exact",
  birthPlace: "São Paulo, SP",
  birthLatitude: -23.55,
  birthLongitude: -46.63,
  birthTimezone: "America/Sao_Paulo",
  timezoneConfirmed: true,
  updatedAt: "2024-01-15T12:00:00.000Z",
};

const emptyNatal: NatalChart = {
  sun: null,
  moon: null,
  mercury: null,
  venus: null,
  mars: null,
  jupiter: null,
  saturn: null,
  uranus: null,
  neptune: null,
  pluto: null,
  ascendant: null,
};

describe("calculateProfilePlacidus", () => {
  it("resolve o horário civil pelo fuso IANA e entrega as 12 cúspides", () => {
    const result = calculateProfilePlacidus(baseProfile, emptyNatal);

    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;
    expect(result.cusps).toHaveLength(12);
    expect(result.angles.ascendant.longitude).toBe(result.cusps[0].longitude);
  });

  it("marca as casas como indisponíveis quando o horário é desconhecido", () => {
    const result = calculateProfilePlacidus(
      { ...baseProfile, birthTime: null, birthTimeAccuracy: "unknown" },
      emptyNatal,
    );

    expect(result).toMatchObject({ status: "unavailable", reason: "unknown-time" });
  });

  it("mantém o resultado explicitamente estimado para horário aproximado", () => {
    const result = calculateProfilePlacidus(
      { ...baseProfile, birthTimeAccuracy: "approximate" },
      emptyNatal,
    );

    expect(result.status).toBe("estimated");
    if (result.status === "estimated") {
      expect(result.message).toContain("aproximado");
    }
  });

  it("usa as longitudes planetárias recebidas sem recalculá-las", () => {
    const cusps = calculateProfilePlacidus(baseProfile, emptyNatal);
    expect(cusps.status).toBe("calculated");
    if (cusps.status !== "calculated") return;

    const natalWithSunOnAscendant: NatalChart = {
      ...emptyNatal,
      sun: {
        planet: "sun",
        longitude: cusps.cusps[0].longitude,
        sign: cusps.cusps[0].sign,
        degree: cusps.cusps[0].degree,
        retrograde: false,
      },
    };
    const result = calculateProfilePlacidus(baseProfile, natalWithSunOnAscendant);

    expect(result.status).toBe("calculated");
    if (result.status === "calculated") {
      expect(result.planetHouses.sun).toBe(1);
    }
  });

  it("não aplica casas alternativas quando faltam coordenadas", () => {
    const result = calculateProfilePlacidus(
      { ...baseProfile, birthLatitude: null, birthLongitude: null },
      emptyNatal,
    );

    expect(result).toMatchObject({ status: "unavailable", reason: "invalid-input" });
  });
});
