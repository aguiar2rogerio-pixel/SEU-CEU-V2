import { describe, expect, it } from "vitest";
import { calculateAscendant, calculateNatalChart, PLANETS, ZODIAC_SIGNS } from "../ephemeris";
import type { BirthProfile, PlanetId } from "../types";
import { getFusoHorario } from "../timezone";
import { calculatePlacidus } from "./placidus";

interface ReferenceChart {
  name: string;
  birthDate: string;
  birthTime: string;
  timezone: string;
  utc: string;
  latitude: number;
  longitude: number;
  ascendantDifferenceDeg: number;
  swissCusps: number[];
}

// Referências geradas com Swiss Ephemeris 2.10.03, swe_houses(..., b"P"),
// tropical, com os mesmos instantes UTC, coordenadas e fusos IANA dos casos.
const referenceCharts: ReferenceChart[] = [
  {
    name: "São Paulo",
    birthDate: "1990-06-15",
    birthTime: "08:30",
    timezone: "America/Sao_Paulo",
    utc: "1990-06-15T11:30:00.000Z",
    latitude: -23.5329,
    longitude: -46.6395,
    ascendantDifferenceDeg: 0.00234630032809946,
    swissCusps: [
      107.597790454, 142.885381181, 179.245686954, 211.506096409,
      238.574657991, 262.803258050, 287.597790454, 322.885381181,
      359.245686954, 31.506096409, 58.574657991, 82.803258050,
    ],
  },
  {
    name: "Manaus",
    birthDate: "2024-11-19",
    birthTime: "09:15",
    timezone: "America/Manaus",
    utc: "2024-11-19T13:15:00.000Z",
    latitude: -3.11866,
    longitude: -60.0212,
    ascendantDifferenceDeg: 0.0007180660054473265,
    swissCusps: [
      287.595970382, 315.929041449, 346.830659083, 19.275290405,
      50.563018369, 79.587106792, 107.595970382, 135.929041449,
      166.830659083, 199.275290405, 230.563018369, 259.587106792,
    ],
  },
  {
    name: "Rio Branco",
    birthDate: "2025-06-03",
    birthTime: "14:20",
    timezone: "America/Rio_Branco",
    utc: "2025-06-03T19:20:00.000Z",
    latitude: -9.97499,
    longitude: -67.8243,
    ascendantDifferenceDeg: 0.0010685103657124273,
    swissCusps: [
      208.659623898, 239.329271197, 266.446625581, 292.854781085,
      321.434201619, 353.887944192, 28.659623898, 59.329271197,
      86.446625581, 112.854781085, 141.434201619, 173.887944192,
    ],
  },
  {
    name: "Nova York",
    birthDate: "2024-10-01",
    birthTime: "14:00",
    timezone: "America/New_York",
    utc: "2024-10-01T18:00:00.000Z",
    latitude: 40.7128,
    longitude: -74.006,
    ascendantDifferenceDeg: 0.003505301010363837,
    swissCusps: [
      274.717828471, 314.690003761, 356.208011964, 28.995877473,
      53.691671719, 74.346453416, 94.717828471, 134.690003761,
      176.208011964, 208.995877473, 233.691671719, 254.346453416,
    ],
  },
];

function makeProfile(chart: ReferenceChart, accuracy: BirthProfile["birthTimeAccuracy"] = "exact"): BirthProfile {
  return {
    schemaVersion: 1,
    name: "Mapa de referência",
    birthDate: chart.birthDate,
    birthTime: chart.birthTime,
    birthTimeAccuracy: accuracy,
    birthPlace: chart.name,
    birthLatitude: chart.latitude,
    birthLongitude: chart.longitude,
    birthTimezone: chart.timezone,
    timezoneConfirmed: true,
    updatedAt: "2026-11-19T00:00:00.000Z",
  };
}

function angularDifference(first: number, second: number): number {
  const signed = ((first - second + 540) % 360) - 180;
  return Math.abs(signed);
}

function referenceHouseForLongitude(longitude: number, cusps: number[]): number {
  const normalize = (value: number) => ((value % 360) + 360) % 360;
  const normalized = normalize(longitude);

  for (let index = 0; index < cusps.length; index += 1) {
    const start = cusps[index];
    const end = cusps[(index + 1) % cusps.length];
    const span = normalize(end - start);
    const offset = normalize(normalized - start);
    if (offset < span) return index + 1;
  }

  throw new Error("A longitude should fall within one of the reference houses.");
}

function calculateReference(chart: ReferenceChart) {
  const profile = makeProfile(chart);
  const birthInstant = getFusoHorario(
    `${chart.birthDate}T${chart.birthTime}:00`,
    chart.timezone,
  ).instantUTC;
  const natal = calculateNatalChart(profile);
  const planetaryLongitudes = Object.fromEntries(
    PLANETS.map(({ id }) => [id, natal[id]?.longitude ?? null]),
  ) as Partial<Record<PlanetId, number | null>>;

  return {
    profile,
    birthInstant,
    natal,
    result: calculatePlacidus({
      birthInstant,
      timeAccuracy: "exact",
      latitude: chart.latitude,
      longitude: chart.longitude,
      planetaryLongitudes,
    }),
  };
}

describe("cálculo isolado das casas Placidus", () => {
  it.each(referenceCharts)("reproduz as cúspides de referência do Swiss Ephemeris para $name", (chart) => {
    const { birthInstant, natal, result } = calculateReference(chart);
    expect(birthInstant.toISOString()).toBe(chart.utc);
    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;

    expect(result.system).toBe("placidus");
    expect(result.cusps).toHaveLength(12);
    const differences = result.cusps.map((cusp, index) =>
      angularDifference(cusp.longitude, chart.swissCusps[index]),
    );
    differences.forEach((difference) => expect(difference).toBeLessThan(0.0001));

    for (const planet of PLANETS) {
      const position = natal[planet.id];
      const expectedHouse = position === null
        ? null
        : referenceHouseForLongitude(position.longitude, chart.swissCusps);
      expect(result.planetHouses[planet.id]).toBe(expectedHouse);
    }
  });

  it("mantém ângulos, oposições e cúspides angulares matematicamente consistentes", () => {
    const { result } = calculateReference(referenceCharts[0]);
    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;

    const longitude = (house: number) => result.cusps[house - 1].longitude;
    expect(longitude(1)).toBeCloseTo(result.angles.ascendant.longitude, 10);
    expect(longitude(4)).toBeCloseTo(result.angles.imumCoeli.longitude, 10);
    expect(longitude(7)).toBeCloseTo(result.angles.descendant.longitude, 10);
    expect(longitude(10)).toBeCloseTo(result.angles.midheaven.longitude, 10);

    for (const [first, opposite] of [[1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [6, 12]]) {
      expect(angularDifference(longitude(opposite), longitude(first) + 180)).toBeLessThan(1e-9);
    }

    for (const cusp of result.cusps) {
      const signIndex = Math.floor(cusp.longitude / 30);
      expect(cusp.sign).toBe(ZODIAC_SIGNS[signIndex]);
      expect(cusp.degree).toBeCloseTo(cusp.longitude - signIndex * 30, 10);
    }

    expect(result.angles.descendant.longitude).toBeCloseTo(
      (result.angles.ascendant.longitude + 180) % 360,
      10,
    );
    expect(result.angles.imumCoeli.longitude).toBeCloseTo(
      (result.angles.midheaven.longitude + 180) % 360,
      10,
    );
  });

  it("atribui a cada planeta a casa do intervalo da longitude e respeita o início inclusivo da cúspide", () => {
    const { result, natal } = calculateReference(referenceCharts[0]);
    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;

    const boundaryResult = calculatePlacidus({
      birthInstant: getFusoHorario(
        `${referenceCharts[0].birthDate}T${referenceCharts[0].birthTime}:00`,
        referenceCharts[0].timezone,
      ).instantUTC,
      timeAccuracy: "exact",
      latitude: referenceCharts[0].latitude,
      longitude: referenceCharts[0].longitude,
      planetaryLongitudes: {
        sun: result.cusps[0].longitude,
        moon: result.cusps[1].longitude,
      },
    });
    expect(boundaryResult.status).toBe("calculated");
    if (boundaryResult.status !== "calculated") return;

    expect(boundaryResult.planetHouses.sun).toBe(1);
    expect(boundaryResult.planetHouses.moon).toBe(2);
    expect(boundaryResult.planetHouses.mercury).toBeNull();
    expect(boundaryResult.planetHouses.pluto).toBeNull();

    for (const planet of PLANETS) {
      const house = result.planetHouses[planet.id];
      const position = natal[planet.id];
      if (position === null) {
        expect(house).toBeNull();
        continue;
      }
      expect(house).toBeGreaterThanOrEqual(1);
      expect(house).toBeLessThanOrEqual(12);
    }
  });

  it("marca Placidus como indisponível sem horário exato e não usa casas substitutas em latitude polar", () => {
    const chart = referenceCharts[0];
    const instant = getFusoHorario(`${chart.birthDate}T${chart.birthTime}:00`, chart.timezone).instantUTC;
    const unknownTime = calculatePlacidus({
      birthInstant: null,
      timeAccuracy: "unknown",
      latitude: chart.latitude,
      longitude: chart.longitude,
    });
    expect(unknownTime.status).toBe("unavailable");
    if (unknownTime.status === "unavailable") expect(unknownTime.reason).toBe("unknown-time");

    const polar = calculatePlacidus({
      birthInstant: instant,
      timeAccuracy: "exact",
      latitude: 70,
      longitude: 25,
    });
    expect(polar.status).toBe("unavailable");
    if (polar.status === "unavailable") {
      expect(polar.reason).toBe("polar-latitude");
      expect(polar.message).toContain("nenhum sistema alternativo");
    }
  });

  it("identifica como estimado o cálculo com horário aproximado e rejeita coordenadas inválidas", () => {
    const chart = referenceCharts[0];
    const instant = getFusoHorario(`${chart.birthDate}T${chart.birthTime}:00`, chart.timezone).instantUTC;
    const estimated = calculatePlacidus({
      birthInstant: instant,
      timeAccuracy: "approximate",
      latitude: chart.latitude,
      longitude: chart.longitude,
    });
    expect(estimated.status).toBe("estimated");
    if (estimated.status === "estimated") {
      expect(estimated.message).toContain("horário de nascimento foi informado como aproximado");
    }

    const invalid = calculatePlacidus({
      birthInstant: instant,
      timeAccuracy: "exact",
      latitude: 91,
      longitude: chart.longitude,
    });
    expect(invalid.status).toBe("unavailable");
    if (invalid.status === "unavailable") expect(invalid.reason).toBe("invalid-input");
  });

  it.each(referenceCharts)("mede a diferença para o Ascendente legado sem substituí-lo ($name)", (chart) => {
    const { birthInstant, result } = calculateReference(chart);
    expect(result.status).toBe("calculated");
    const legacy = calculateAscendant(birthInstant, chart.latitude, chart.longitude);
    expect(legacy).not.toBeNull();
    if (result.status !== "calculated" || legacy === null) return;

    const difference = angularDifference(result.angles.ascendant.longitude, legacy.longitude);
    expect(difference).toBeCloseTo(chart.ascendantDifferenceDeg, 5);
  });
});
