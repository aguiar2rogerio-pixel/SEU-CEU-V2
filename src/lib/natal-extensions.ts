import { Body, createEphemera, fromWasm, type Ephemeris } from "@astrologer/ephemera";
import ephemerisWasmUrl from "@astrologer/ephemera/wasm/ephemeris-1as-chiron.wasm?url";
import { findHouseForLongitude, type PlacidusResult } from "./houses/placidus";
import { calculateProfilePlacidus } from "./houses/profile-placidus";
import { ZODIAC_SIGNS } from "./ephemeris";
import { getFusoHorario } from "./timezone";
import type {
  BirthProfile,
  ComplementaryPointId,
  ComplementaryPointPosition,
  NatalAngle,
  NatalAngleId,
  NatalChart,
  NatalEclipticPoint,
  NatalHouseCusp,
  NatalHouseData,
} from "./types";

const EPHEMERA_MODULE = "1as-chiron" as const;
const EPHEMERA_VERSION = "0.4.1";
export const NATAL_EXTENSIONS_VERSION = "natal-points-v1-ephemera-0.4.1";
const JULIAN_UNIX_EPOCH = 2440587.5;
const DAY_MS = 86400000;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const ROOT_SCAN_STEPS = 720;
const ROOT_TOLERANCE = 1e-11;
const MOTION_TOLERANCE_DEG_PER_DAY = 1e-6;

let ephemerisPromise: Promise<Ephemeris> | null = null;

function loadEphemeris(): Promise<Ephemeris> {
  if (!ephemerisPromise) {
    const load = typeof window === "undefined"
      ? createEphemera({ module: EPHEMERA_MODULE })
      : fetch(ephemerisWasmUrl).then(async (response) => {
        if (!response.ok) throw new Error(`Não foi possível carregar a efeméride local: ${response.status}`);
        return fromWasm(await response.arrayBuffer());
      });
    ephemerisPromise = load.catch((error: unknown) => {
      ephemerisPromise = null;
      throw error;
    });
  }
  return ephemerisPromise;
}

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

function eclipticPoint(longitude: number): NatalEclipticPoint {
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  const degree = normalized - signIndex * 30;
  return {
    longitude: normalized,
    sign: ZODIAC_SIGNS[signIndex],
    degree,
    minute: Math.floor((degree % 1) * 60),
  };
}

function getReferenceBirthInstant(profile: BirthProfile): Date | null {
  const referenceTime = profile.birthTimeAccuracy === "unknown"
    ? "12:00"
    : (profile.birthTime || "12:00");
  try {
    const instant = getFusoHorario(
      `${profile.birthDate}T${referenceTime}:00`,
      profile.birthTimezone,
    ).instantUTC;
    return Number.isNaN(instant.getTime()) ? null : instant;
  } catch {
    return null;
  }
}

function fractionalYear(date: Date): number {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const next = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (next - start);
}

function speedMotion(speed: number): "direct" | "retrograde" | "stationary" {
  if (speed < -MOTION_TOLERANCE_DEG_PER_DAY) return "retrograde";
  if (speed > MOTION_TOLERANCE_DEG_PER_DAY) return "direct";
  return "stationary";
}

function pointPosition(
  id: ComplementaryPointId,
  longitude: number,
  house: number | null,
  status: "calculated" | "estimated",
  method: string,
  speed: number | null,
  reason: string | null = null,
): ComplementaryPointPosition {
  const point = eclipticPoint(longitude);
  const motion = speed === null ? "not-applicable" : speedMotion(speed);
  return {
    id,
    ...point,
    house,
    retrograde: speed === null ? null : motion === "retrograde",
    motion,
    speedDegreesPerDay: speed,
    status,
    method,
    reason,
  };
}

function unavailablePoint(
  id: ComplementaryPointId,
  method: string,
  reason: string,
): ComplementaryPointPosition {
  return {
    id,
    longitude: null,
    sign: null,
    degree: null,
    minute: null,
    house: null,
    retrograde: null,
    motion: null,
    speedDegreesPerDay: null,
    status: "unavailable",
    method,
    reason,
  };
}

function toNatalAngle(id: NatalAngleId, longitude: number): NatalAngle {
  return { id, ...eclipticPoint(longitude) };
}

function mapHouseData(result: PlacidusResult): NatalHouseData {
  if (result.status === "unavailable") {
    return {
      status: "unavailable",
      system: "placidus",
      angles: null,
      cusps: [],
      message: result.message,
    };
  }

  const angles: Record<NatalAngleId, NatalAngle> = {
    ascendant: toNatalAngle("ascendant", result.angles.ascendant.longitude),
    descendant: toNatalAngle("descendant", result.angles.descendant.longitude),
    midheaven: toNatalAngle("midheaven", result.angles.midheaven.longitude),
    imumCoeli: toNatalAngle("imumCoeli", result.angles.imumCoeli.longitude),
  };
  const cusps: NatalHouseCusp[] = result.cusps.map((cusp) => ({
    ...eclipticPoint(cusp.longitude),
    house: cusp.house,
  }));

  return {
    status: result.status,
    system: "placidus",
    angles,
    cusps,
    message: result.message,
  };
}

function vertexLongitude(
  armc: number,
  latitude: number,
  obliquity: number,
): number | null {
  const phi = latitude * DEG;
  const epsilon = obliquity * DEG;

  const valuesAt = (longitude: number) => {
    const lambda = longitude * DEG;
    const rightAscension = Math.atan2(
      Math.sin(lambda) * Math.cos(epsilon),
      Math.cos(lambda),
    );
    const declination = Math.asin(Math.max(-1, Math.min(1, Math.sin(lambda) * Math.sin(epsilon))));
    const hourAngle = normalizeLongitude(armc - rightAscension * RAD) * DEG;
    const primeVerticalResidual =
      Math.sin(declination) * Math.cos(phi) -
      Math.cos(declination) * Math.sin(phi) * Math.cos(hourAngle);
    return { residual: primeVerticalResidual, hourAngle: hourAngle * RAD };
  };

  const roots: number[] = [];
  let left = 0;
  let leftValue = valuesAt(left).residual;
  for (let index = 1; index <= ROOT_SCAN_STEPS; index += 1) {
    const right = (360 * index) / ROOT_SCAN_STEPS;
    let rightValue = valuesAt(right).residual;
    if (Math.abs(leftValue) <= ROOT_TOLERANCE) roots.push(normalizeLongitude(left));
    if (leftValue * rightValue < 0) {
      let low = left;
      let high = right;
      let lowValue = leftValue;
      for (let iteration = 0; iteration < 80; iteration += 1) {
        const middle = (low + high) / 2;
        const middleValue = valuesAt(middle).residual;
        if (Math.abs(middleValue) <= ROOT_TOLERANCE || high - low <= ROOT_TOLERANCE) {
          low = middle;
          high = middle;
          break;
        }
        if (lowValue * middleValue > 0) {
          low = middle;
          lowValue = middleValue;
        } else {
          high = middle;
        }
      }
      roots.push(normalizeLongitude((low + high) / 2));
    }
    left = right;
    leftValue = rightValue;
  }
  if (Math.abs(leftValue) <= ROOT_TOLERANCE) roots.push(0);

  const westernRoots = roots.filter((longitude) => {
    const hourAngle = valuesAt(longitude).hourAngle;
    return hourAngle > 1e-8 && hourAngle < 180 - 1e-8;
  });
  return westernRoots.length === 1 ? westernRoots[0] : null;
}

export function calculatePartOfFortuneLongitude(
  sunLongitude: number,
  moonLongitude: number,
  ascendantLongitude: number,
  isDayChart: boolean,
): number {
  return normalizeLongitude(
    ascendantLongitude + (isDayChart ? moonLongitude - sunLongitude : sunLongitude - moonLongitude),
  );
}

export function calculateSolarAltitudeDegrees(
  sunLongitude: number,
  latitude: number,
  armc: number,
  obliquity: number,
): number {
  const lambda = sunLongitude * DEG;
  const phi = latitude * DEG;
  const epsilon = obliquity * DEG;
  const rightAscension = Math.atan2(
    Math.sin(lambda) * Math.cos(epsilon),
    Math.cos(lambda),
  );
  const declination = Math.asin(Math.max(-1, Math.min(1, Math.sin(lambda) * Math.sin(epsilon))));
  const hourAngle = normalizeLongitude(armc - rightAscension * RAD) * DEG;
  const sineAltitude =
    Math.sin(phi) * Math.sin(declination) +
    Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sineAltitude))) * RAD;
}

function pointHouse(longitude: number, result: PlacidusResult): number | null {
  return result.status === "unavailable"
    ? null
    : findHouseForLongitude(longitude, result.cusps);
}

function pointReason(
  referenceReason: string | null,
  houseReason: string | null,
  house: number | null,
): string | null {
  return [referenceReason, houseReason && house === null ? houseReason : null]
    .filter((reason): reason is string => reason !== null)
    .join(" ") || null;
}

export interface NatalExtensions {
  natalExtensionsVersion: string;
  angles: Record<NatalAngleId, NatalAngle> | null;
  houses: NatalHouseData;
  complementaryPoints: Record<ComplementaryPointId, ComplementaryPointPosition>;
}

/**
 * Calcula os pontos adicionais em uma instância local da Ephemera. Os dez
 * planetas e o Ascendente legado continuam sendo fornecidos pelo motor atual.
 */
export async function calculateNatalExtensions(
  profile: BirthProfile,
  natal: NatalChart,
): Promise<NatalExtensions> {
  const instant = getReferenceBirthInstant(profile);
  const houseResult = calculateProfilePlacidus(profile, natal);
  const houses = mapHouseData(houseResult);
  const angles = houses.angles;
  const estimated = profile.birthTimeAccuracy !== "exact";
  const status = estimated ? "estimated" : "calculated";
  const referenceReason = profile.birthTimeAccuracy === "unknown"
    ? "O horário é desconhecido; a longitude foi avaliada às 12:00 locais apenas como referência."
    : profile.birthTimeAccuracy === "approximate"
      ? "O horário de nascimento foi informado como aproximado."
      : null;
  const houseReason = houseResult.status === "unavailable"
    ? houseResult.message
    : null;
  const pointData: Record<ComplementaryPointId, ComplementaryPointPosition> = {
    northNode: unavailablePoint("northNode", "Nodo Médio; Ephemera 0.4.1", "Não foi possível calcular a posição do Nodo Médio."),
    southNode: unavailablePoint("southNode", "Oposição exata de 180° ao Nodo Norte", "Não foi possível calcular a posição do Nodo Sul."),
    lilith: unavailablePoint("lilith", "Lilith Média; apogeu lunar médio; Ephemera 0.4.1", "Não foi possível calcular a posição da Lilith Média."),
    chiron: unavailablePoint("chiron", "2060 Quíron aparente, geocêntrico e tropical; Ephemera 0.4.1 / JPL Horizons", "Não foi possível calcular a posição de Quíron."),
    partOfFortune: unavailablePoint("partOfFortune", "Fórmula tradicional diurna/noturna", "A Parte da Fortuna depende do Sol, da Lua e do Ascendente."),
    vertex: unavailablePoint("vertex", "Interseção da eclíptica com o prime vertical ocidental", "O Vértice depende do horário e das coordenadas de nascimento."),
  };

  if (!instant) {
    const reason = "Data, horário ou fuso do nascimento indisponível para a efeméride local.";
    for (const id of Object.keys(pointData) as ComplementaryPointId[]) {
      pointData[id] = unavailablePoint(id, pointData[id].method, reason);
    }
    return { natalExtensionsVersion: NATAL_EXTENSIONS_VERSION, angles, houses, complementaryPoints: pointData };
  }

  try {
    const ephemeris = await loadEphemeris();
    const jdUt = instant.getTime() / DAY_MS + JULIAN_UNIX_EPOCH;
    const year = fractionalYear(instant);
    const meanNode = ephemeris.position(Body.MeanNode, jdUt, { apparent: false, year });
    const meanLilith = ephemeris.position(Body.MeanLilith, jdUt, { apparent: false, year });
    const chiron = ephemeris.position(Body.Chiron, jdUt, { apparent: true, year });

    if (meanNode) {
      const northLongitude = normalizeLongitude(meanNode.longitude);
      const southLongitude = normalizeLongitude(northLongitude + 180);
      const northHouse = pointHouse(northLongitude, houseResult);
      const southHouse = pointHouse(southLongitude, houseResult);
      pointData.northNode = pointPosition(
        "northNode", northLongitude, northHouse, status,
        `Nodo Médio ascendente; Ephemera ${EPHEMERA_VERSION}; longitude média eclíptica tropical.`,
        meanNode.longitudeSpeed,
        pointReason(referenceReason, houseReason, northHouse),
      );
      pointData.southNode = pointPosition(
        "southNode", southLongitude, southHouse, status,
        `Nodo Sul exatamente oposto ao Nodo Norte; Ephemera ${EPHEMERA_VERSION}.`,
        meanNode.longitudeSpeed,
        pointReason(referenceReason, houseReason, southHouse),
      );
    }

    if (meanLilith) {
      const longitude = normalizeLongitude(meanLilith.longitude);
      const house = pointHouse(longitude, houseResult);
      pointData.lilith = pointPosition(
        "lilith", longitude, house, status,
        `Lua Negra Média (apogeu lunar médio); Ephemera ${EPHEMERA_VERSION}; longitude tropical.`,
        meanLilith.longitudeSpeed,
        pointReason(referenceReason, houseReason, house),
      );
    }

    if (chiron) {
      const longitude = normalizeLongitude(chiron.longitude);
      const house = pointHouse(longitude, houseResult);
      pointData.chiron = pointPosition(
        "chiron", longitude, house, status,
        `2060 Quíron aparente geocêntrico tropical; série Chebyshev JPL Horizons, Ephemera ${EPHEMERA_VERSION}.`,
        chiron.longitudeSpeed,
        pointReason(referenceReason, houseReason, house),
      );
    }
  } catch (error) {
    const reason = error instanceof Error
      ? `A efeméride local de pontos complementares falhou: ${error.message}`
      : "A efeméride local de pontos complementares falhou.";
    for (const id of ["northNode", "southNode", "lilith", "chiron"] as const) {
      pointData[id] = unavailablePoint(id, pointData[id].method, reason);
    }
  }

  if (angles && natal.sun && natal.moon) {
    if (houseResult.status !== "unavailable" && profile.birthLatitude != null) {
      const solarAltitude = calculateSolarAltitudeDegrees(
        natal.sun.longitude,
        profile.birthLatitude,
        houseResult.armc,
        houseResult.obliquity,
      );
      const isDayChart = solarAltitude >= 0;
      const longitude = calculatePartOfFortuneLongitude(
        natal.sun.longitude,
        natal.moon.longitude,
        angles.ascendant.longitude,
        isDayChart,
      );
      const house = pointHouse(longitude, houseResult);
      pointData.partOfFortune = pointPosition(
        "partOfFortune",
        longitude,
        house,
        status,
        `Parte da Fortuna tradicional ${isDayChart ? "diurna: ASC + Lua − Sol" : "noturna: ASC + Sol − Lua"}; sect determinado pela altitude solar geométrica ${solarAltitude.toFixed(4)}° (altitude zero conta como diurno); sistema tropical.`,
        null,
        pointReason(referenceReason, houseReason, house),
      );
    }
  }

  if (houseResult.status !== "unavailable" && profile.birthLatitude != null) {
    const longitude = vertexLongitude(
      houseResult.armc,
      profile.birthLatitude,
      houseResult.obliquity,
    );
    if (longitude !== null) {
      const house = pointHouse(longitude, houseResult);
      pointData.vertex = pointPosition(
        "vertex",
        longitude,
        house,
        status,
        "Interseção ocidental entre a eclíptica verdadeira da data e o prime vertical, resolvida pelo ARMC e latitude geográfica.",
        null,
        pointReason(referenceReason, houseReason, house),
      );
    } else {
      pointData.vertex = unavailablePoint(
        "vertex",
        "Interseção da eclíptica com o prime vertical ocidental",
        "Não foi encontrada uma interseção ocidental única para o horário e a latitude informados.",
      );
    }
  } else if (profile.birthTimeAccuracy === "unknown") {
    pointData.vertex = unavailablePoint(
      "vertex",
      "Interseção da eclíptica com o prime vertical ocidental",
      "O Vértice e sua casa não são calculáveis sem horário de nascimento conhecido.",
    );
  }

  if (profile.birthTimeAccuracy === "unknown") {
    pointData.partOfFortune = unavailablePoint(
      "partOfFortune",
      "Fórmula tradicional diurna/noturna: ASC + Lua − Sol ou ASC + Sol − Lua",
      "A Parte da Fortuna requer Lua e Ascendente confiáveis; o horário de nascimento é desconhecido.",
    );
  }

  return { natalExtensionsVersion: NATAL_EXTENSIONS_VERSION, angles, houses, complementaryPoints: pointData };
}
