import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "./ephemeris";
import { calculateNatalExtensions, calculatePartOfFortuneLongitude, calculateSolarAltitudeDegrees } from "./natal-extensions";
import { findHouseForLongitude } from "./houses/placidus";
import { calculateProfilePlacidus } from "./houses/profile-placidus";
import type { BirthProfile, ComplementaryPointId, ComplementaryPointPosition } from "./types";

const referenceProfile: BirthProfile = {
  schemaVersion: 1,
  name: "Mapa de referência Astro-Seek",
  birthDate: "1970-07-09",
  birthTime: "13:30",
  birthTimeAccuracy: "exact",
  birthPlace: "Suzano, SP",
  birthLatitude: -23.5448,
  birthLongitude: -46.3112,
  birthTimezone: "America/Sao_Paulo",
  timezoneConfirmed: true,
  updatedAt: "2026-11-21T00:00:00.000Z",
};

const referenceLongitudes: Record<ComplementaryPointId, number> = {
  northNode: 335 + 14 / 60,
  southNode: 155 + 14 / 60,
  lilith: 143 + 49 / 60,
  chiron: 10 + 21 / 60,
  partOfFortune: 294 + 54 / 60,
  vertex: 20 + 49 / 60,
};

function expectWithinOneArcminute(actual: number, expected: number) {
  const signed = ((actual - expected + 540) % 360) - 180;
  expect(Math.abs(signed)).toBeLessThan(1 / 60);
}

function expectWithinTwoArcminutes(actual: number, expected: number) {
  const signed = ((actual - expected + 540) % 360) - 180;
  expect(Math.abs(signed)).toBeLessThan(2 / 60);
}

function expectPosition(
  position: ComplementaryPointPosition,
  expected: { sign: string; wholeDegree: number; minute: number; house: number },
) {
  expect(position.status).toBe("calculated");
  expect(position.sign).toBe(expected.sign);
  expect(position.degree).not.toBeNull();
  expect(Math.floor(position.degree!)).toBe(expected.wholeDegree);
  expect(position.minute).toBe(expected.minute);
  expect(position.house).toBe(expected.house);
}

describe("extensão natal: pontos complementares e ângulos", () => {
  it("compara os seis pontos com a referência Astro-Seek usando longitude interna não arredondada", async () => {
    const baseNatal = calculateNatalChart(referenceProfile);
    const result = await calculateNatalExtensions(referenceProfile, baseNatal);
    const points = result.complementaryPoints;

    expectPosition(points.northNode, { sign: "Peixes", wholeDegree: 5, minute: 14, house: 5 });
    expectPosition(points.southNode, { sign: "Virgem", wholeDegree: 5, minute: 14, house: 11 });
    expectPosition(points.lilith, { sign: "Leão", wholeDegree: 23, minute: 49, house: 10 });
    expectPosition(points.chiron, { sign: "Áries", wholeDegree: 10, minute: 21, house: 5 });
    expectPosition(points.partOfFortune, { sign: "Capricórnio", wholeDegree: 24, minute: 55, house: 3 });
    expectPosition(points.vertex, { sign: "Áries", wholeDegree: 20, minute: 49, house: 6 });

    for (const id of ["northNode", "southNode", "lilith", "chiron", "vertex"] as const) {
      expect(points[id].longitude).not.toBeNull();
      expectWithinOneArcminute(points[id].longitude!, referenceLongitudes[id]);
    }
    expectWithinTwoArcminutes(points.partOfFortune.longitude!, referenceLongitudes.partOfFortune);

    expect(points.northNode.method).toContain("Nodo Médio");
    expect(points.lilith.method).toContain("Lua Negra Média");
    expect(points.chiron.method).toContain("JPL Horizons");
    expect(points.partOfFortune.method).toContain("diurna");
    expect(points.partOfFortune.method).toContain("Lua − Sol");
  });

  it("mantém o Nodo Sul exatamente oposto e mantém as retrogradações por velocidade", async () => {
    const result = await calculateNatalExtensions(referenceProfile, calculateNatalChart(referenceProfile));
    const north = result.complementaryPoints.northNode;
    const south = result.complementaryPoints.southNode;

    expect(north.longitude).not.toBeNull();
    expect(south.longitude).not.toBeNull();
    expect(((south.longitude! - north.longitude! + 360) % 360)).toBeCloseTo(180, 12);
    expect(north.retrograde).toBe(true);
    expect(south.retrograde).toBe(true);
    expect(result.complementaryPoints.lilith.retrograde).toBe(false);
    expect(result.complementaryPoints.chiron.retrograde).toBe(false);
    expect(result.complementaryPoints.chiron.motion).toBe("direct");
  });

  it("expõe ASC, DSC, MC e IC estruturados e preserva o Ascendente legado e os dez planetas", async () => {
    const baseNatal = calculateNatalChart(referenceProfile);
    const result = await calculateNatalExtensions(referenceProfile, baseNatal);
    const extendedNatal = { ...baseNatal, ...result };

    expect(result.angles).not.toBeNull();
    expect(result.houses.status).toBe("calculated");
    expect(result.houses.cusps).toHaveLength(12);
    expect(result.angles!.ascendant.longitude).toBeCloseTo(result.houses.cusps[0].longitude, 10);
    expect(result.angles!.descendant.longitude).toBeCloseTo(result.houses.cusps[6].longitude, 10);
    expect(result.angles!.imumCoeli.longitude).toBeCloseTo(result.houses.cusps[3].longitude, 10);
    expect(result.angles!.midheaven.longitude).toBeCloseTo(result.houses.cusps[9].longitude, 10);
    expect(result.angles!.ascendant.sign).toBe("Escorpião");
    expect(result.angles!.ascendant.minute).toBe(41);
    expectWithinTwoArcminutes(result.angles!.ascendant.longitude, 228 + 40 / 60);
    expect(result.angles!.midheaven.sign).toBe("Leão");
    expect(result.angles!.midheaven.minute).toBe(0);

    expect(extendedNatal.ascendant).toEqual(baseNatal.ascendant);
    for (const id of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const) {
      expect(extendedNatal[id]).toEqual(baseNatal[id]);
    }
  });

  it("determina casas das posições internas antes de exibir graus/minutos arredondados, inclusive junto às cúspides", async () => {
    const baseNatal = calculateNatalChart(referenceProfile);
    const result = await calculateNatalExtensions(referenceProfile, baseNatal);
    expect(result.houses.status).toBe("calculated");

    for (const id of ["northNode", "southNode", "lilith", "chiron", "partOfFortune", "vertex"] as const) {
      const point = result.complementaryPoints[id];
      expect(point.longitude).not.toBeNull();
      expect(point.house).toBe(findHouseForLongitude(point.longitude!, result.houses.cusps));
    }
    expect(result.complementaryPoints.northNode.house).toBe(5);
    expect(result.complementaryPoints.chiron.house).toBe(5);

    const sixthCusp = result.houses.cusps[5].longitude;
    expect(result.complementaryPoints.chiron.longitude!).toBeLessThan(sixthCusp);
    expect(sixthCusp - result.complementaryPoints.chiron.longitude!).toBeLessThan(0.1);
  });

  it("usa fórmulas diferentes para mapas diurnos e noturnos e classifica pelo horizonte solar local", async () => {
    expect(calculatePartOfFortuneLongitude(100, 200, 50, true)).toBe(150);
    expect(calculatePartOfFortuneLongitude(100, 200, 50, false)).toBe(310);

    const dayNatal = calculateNatalChart(referenceProfile);
    const dayHouses = calculateProfilePlacidus(referenceProfile, dayNatal);
    expect(dayHouses.status).toBe("calculated");
    if (dayHouses.status !== "calculated" || !dayNatal.sun) return;
    expect(calculateSolarAltitudeDegrees(
      dayNatal.sun.longitude,
      referenceProfile.birthLatitude!,
      dayHouses.armc,
      dayHouses.obliquity,
    )).toBeGreaterThan(0);

    const nightProfile = { ...referenceProfile, birthTime: "00:30" };
    const nightNatal = calculateNatalChart(nightProfile);
    const nightHouses = calculateProfilePlacidus(nightProfile, nightNatal);
    expect(nightHouses.status).toBe("calculated");
    if (nightHouses.status !== "calculated" || !nightNatal.sun) return;
    expect(calculateSolarAltitudeDegrees(
      nightNatal.sun.longitude,
      nightProfile.birthLatitude!,
      nightHouses.armc,
      nightHouses.obliquity,
    )).toBeLessThan(0);
    const nightResult = await calculateNatalExtensions(nightProfile, nightNatal);
    expect(nightResult.complementaryPoints.partOfFortune.method).toContain("noturna: ASC + Sol − Lua");
  });

  it("marca resultados dependentes do horário como estimados ou indisponíveis quando o horário é aproximado/desconhecido", async () => {
    const approximate = { ...referenceProfile, birthTimeAccuracy: "approximate" as const };
    const approximateResult = await calculateNatalExtensions(approximate, calculateNatalChart(approximate));
    expect(approximateResult.houses.status).toBe("estimated");
    expect(approximateResult.complementaryPoints.northNode.status).toBe("estimated");
    expect(approximateResult.complementaryPoints.partOfFortune.status).toBe("estimated");
    expect(approximateResult.complementaryPoints.vertex.status).toBe("estimated");

    const unknown = { ...referenceProfile, birthTime: null, birthTimeAccuracy: "unknown" as const };
    const unknownResult = await calculateNatalExtensions(unknown, calculateNatalChart(unknown));
    expect(unknownResult.angles).toBeNull();
    expect(unknownResult.houses.status).toBe("unavailable");
    expect(unknownResult.complementaryPoints.northNode.status).toBe("estimated");
    expect(unknownResult.complementaryPoints.chiron.status).toBe("estimated");
    expect(unknownResult.complementaryPoints.northNode.house).toBeNull();
    expect(unknownResult.complementaryPoints.partOfFortune.status).toBe("unavailable");
    expect(unknownResult.complementaryPoints.vertex.status).toBe("unavailable");
  });
});
