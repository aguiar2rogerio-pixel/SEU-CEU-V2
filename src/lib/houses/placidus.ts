import { Rotation_EQD_ECT, SiderealTime } from "astronomy-engine";
import type { BirthTimeAccuracy, PlanetId, ZodiacSign } from "../types";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const ROOT_SCAN_STEPS = 720;
const ROOT_ANGLE_TOLERANCE = 1e-10;
const ORDER_TOLERANCE = 1e-7;

const ZODIAC_SIGNS: ZodiacSign[] = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes",
];

const PLANET_IDS: PlanetId[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];

export interface EclipticPoint {
  longitude: number;
  sign: ZodiacSign;
  degree: number;
}

export interface PlacidusCusp extends EclipticPoint {
  house: number;
}

export interface PlacidusAngles {
  ascendant: EclipticPoint;
  descendant: EclipticPoint;
  midheaven: EclipticPoint;
  imumCoeli: EclipticPoint;
}

export type PlacidusUnavailableReason =
  | "unknown-time"
  | "invalid-input"
  | "polar-latitude"
  | "no-solution"
  | "ambiguous-solution";

export type PlacidusResult =
  | {
      status: "calculated" | "estimated";
      system: "placidus";
      angles: PlacidusAngles;
      cusps: PlacidusCusp[];
      planetHouses: Record<PlanetId, number | null>;
      armc: number;
      obliquity: number;
      message: string | null;
    }
  | {
      status: "unavailable";
      system: "placidus";
      reason: PlacidusUnavailableReason;
      message: string;
    };

export interface PlacidusInput {
  /** Instante UTC já resolvido pelo fuso IANA do perfil. */
  birthInstant: Date | null;
  timeAccuracy: BirthTimeAccuracy;
  /** Latitude geográfica em graus: norte positiva, sul negativa. */
  latitude: number | null;
  /** Longitude geográfica em graus: leste positiva, oeste negativa. */
  longitude: number | null;
  /** Longitudes eclípticas tropicais existentes no mapa natal. */
  planetaryLongitudes?: Partial<Record<PlanetId, number | null>>;
}

interface RootResult {
  value: number | null;
  ambiguous: boolean;
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function unavailable(
  reason: PlacidusUnavailableReason,
  message: string,
): PlacidusResult {
  return { status: "unavailable", system: "placidus", reason, message };
}

function pointAt(longitude: number): EclipticPoint {
  const normalized = normalizeDegrees(longitude);
  const signIndex = Math.floor(normalized / 30);
  return {
    longitude: normalized,
    sign: ZODIAC_SIGNS[signIndex],
    degree: normalized - signIndex * 30,
  };
}

function opposite(longitude: number): number {
  return normalizeDegrees(longitude + 180);
}

/** Obliquidade verdadeira da eclíptica da data, extraída da rotação EQD→ECT. */
function trueObliquityRadians(instant: Date): number {
  const matrix = Rotation_EQD_ECT(instant).rot;
  return Math.atan2(matrix[2][1], matrix[1][1]);
}

function rightAscensionFromLongitude(longitude: number, obliquity: number): number {
  const lambda = longitude * DEG;
  return normalizeDegrees(Math.atan2(
    Math.sin(lambda) * Math.cos(obliquity),
    Math.cos(lambda),
  ) * RAD);
}

function longitudeFromRightAscension(rightAscension: number, obliquity: number): number {
  const alpha = rightAscension * DEG;
  return normalizeDegrees(Math.atan2(
    Math.sin(alpha),
    Math.cos(alpha) * Math.cos(obliquity),
  ) * RAD);
}

function declinationFromRightAscension(rightAscension: number, obliquity: number): number {
  const alpha = rightAscension * DEG;
  return Math.atan(Math.tan(obliquity) * Math.sin(alpha));
}

/** Retorna o semi-arco diurno em graus; null indica ponto circumpolar ou singular. */
function semiDiurnalArc(
  rightAscension: number,
  latitude: number,
  obliquity: number,
): number | null {
  const declination = declinationFromRightAscension(rightAscension, obliquity);
  const argument = -Math.tan(latitude * DEG) * Math.tan(declination);
  const numericTolerance = 1e-12;

  if (argument < -1 - numericTolerance || argument > 1 + numericTolerance) {
    return null;
  }

  return Math.acos(Math.min(1, Math.max(-1, argument))) * RAD;
}

function targetHourAngle(house: 11 | 12 | 2 | 3, semiArc: number): number {
  const semiNocturnalArc = 180 - semiArc;

  switch (house) {
    case 11:
      // O ponto completou 2/3 do arco desde o nascer até a culminação superior.
      return -semiArc / 3;
    case 12:
      // O ponto completou 1/3 do arco desde o nascer até a culminação superior.
      return (-2 * semiArc) / 3;
    case 2:
      // 2/3 do arco noturno, contado da culminação inferior em direção ao nascer.
      return -180 + (2 * semiNocturnalArc) / 3;
    case 3:
      // 1/3 do arco noturno, contado da culminação inferior em direção ao nascer.
      return -180 + semiNocturnalArc / 3;
  }
}

function residualForHouse(
  house: 11 | 12 | 2 | 3,
  rightAscension: number,
  armc: number,
  latitude: number,
  obliquity: number,
): number | null {
  const semiArc = semiDiurnalArc(rightAscension, latitude, obliquity);
  if (semiArc === null) return null;

  // A raiz é procurada no ramo oriental, onde H = ARMC − α fica em [−180°, 0°].
  const hourAngle = armc - rightAscension;
  return hourAngle - targetHourAngle(house, semiArc);
}

function solveCuspRightAscension(
  house: 11 | 12 | 2 | 3,
  start: number,
  end: number,
  armc: number,
  latitude: number,
  obliquity: number,
): RootResult {
  if (!(end > start)) return { value: null, ambiguous: false };

  const brackets: [number, number][] = [];
  let previousAngle = start;
  let previousResidual = residualForHouse(house, previousAngle, armc, latitude, obliquity);
  if (previousResidual === null) return { value: null, ambiguous: false };

  for (let index = 1; index <= ROOT_SCAN_STEPS; index += 1) {
    const currentAngle = start + ((end - start) * index) / ROOT_SCAN_STEPS;
    const currentResidual = residualForHouse(house, currentAngle, armc, latitude, obliquity);
    if (currentResidual === null) return { value: null, ambiguous: false };

    if (Math.abs(previousResidual) <= ROOT_ANGLE_TOLERANCE) {
      brackets.push([previousAngle, previousAngle]);
    } else if (previousResidual * currentResidual < 0) {
      brackets.push([previousAngle, currentAngle]);
    }

    previousAngle = currentAngle;
    previousResidual = currentResidual;
  }

  if (Math.abs(previousResidual) <= ROOT_ANGLE_TOLERANCE) {
    brackets.push([previousAngle, previousAngle]);
  }

  if (brackets.length === 0) return { value: null, ambiguous: false };
  if (brackets.length > 1) return { value: null, ambiguous: true };

  let [left, right] = brackets[0];
  if (left === right) return { value: left, ambiguous: false };

  let leftResidual = residualForHouse(house, left, armc, latitude, obliquity);
  if (leftResidual === null) return { value: null, ambiguous: false };

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (left + right) / 2;
    const middleResidual = residualForHouse(house, middle, armc, latitude, obliquity);
    if (middleResidual === null) return { value: null, ambiguous: false };
    if (Math.abs(middleResidual) <= ROOT_ANGLE_TOLERANCE || right - left <= ROOT_ANGLE_TOLERANCE) {
      return { value: middle, ambiguous: false };
    }

    if (leftResidual * middleResidual > 0) {
      left = middle;
      leftResidual = middleResidual;
    } else {
      right = middle;
    }
  }

  return { value: (left + right) / 2, ambiguous: false };
}

function assignHouses(
  cusps: PlacidusCusp[],
  longitudes: Partial<Record<PlanetId, number | null>> | undefined,
): Record<PlanetId, number | null> {
  const result = {} as Record<PlanetId, number | null>;

  for (const planet of PLANET_IDS) {
    const longitude = longitudes?.[planet];
    if (longitude == null) {
      result[planet] = null;
      continue;
    }

    const normalized = normalizeDegrees(longitude);
    let house: number | null = null;

    for (let index = 0; index < cusps.length; index += 1) {
      const start = cusps[index].longitude;
      const end = cusps[(index + 1) % cusps.length].longitude;
      const span = normalizeDegrees(end - start);
      const offset = normalizeDegrees(normalized - start);
      if (offset < span) {
        house = cusps[index].house;
        break;
      }
    }

    result[planet] = house;
  }

  return result;
}

function hasValidCuspOrder(cusps: PlacidusCusp[]): boolean {
  return cusps.every((cusp, index) => {
    const next = cusps[(index + 1) % cusps.length];
    const width = normalizeDegrees(next.longitude - cusp.longitude);
    return width > ORDER_TOLERANCE && width < 180;
  });
}

/**
 * Calcula um mapa Placidus isolado. Não altera nem substitui as posições já
 * calculadas pelo aplicativo. Horários e coordenadas devem vir do perfil atual.
 */
export function calculatePlacidus(input: PlacidusInput): PlacidusResult {
  if (input.timeAccuracy === "unknown") {
    return unavailable(
      "unknown-time",
      "Placidus indisponível: o horário de nascimento é desconhecido.",
    );
  }

  const { birthInstant, latitude, longitude } = input;
  if (
    !(birthInstant instanceof Date) ||
    Number.isNaN(birthInstant.getTime()) ||
    latitude == null || longitude == null ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return unavailable(
      "invalid-input",
      "Placidus indisponível: data, horário ou coordenadas geográficas inválidas.",
    );
  }

  for (const planet of PLANET_IDS) {
    const planetLongitude = input.planetaryLongitudes?.[planet];
    if (planetLongitude != null && !Number.isFinite(planetLongitude)) {
      return unavailable(
        "invalid-input",
        `Placidus indisponível: longitude inválida para ${planet}.`,
      );
    }
  }

  const obliquity = trueObliquityRadians(birthInstant);
  const obliquityDegrees = obliquity * RAD;
  const polarCircle = 90 - obliquityDegrees;
  if (Math.abs(latitude) >= polarCircle - 1e-8) {
    return unavailable(
      "polar-latitude",
      "Placidus indisponível nesta latitude polar; nenhum sistema alternativo foi aplicado.",
    );
  }

  const armc = normalizeDegrees(SiderealTime(birthInstant) * 15 + longitude);
  const theta = armc * DEG;
  const phi = latitude * DEG;

  const ascendantLongitude = normalizeDegrees(Math.atan2(
    Math.cos(theta),
    -(Math.sin(theta) * Math.cos(obliquity) + Math.tan(phi) * Math.sin(obliquity)),
  ) * RAD);
  const midheavenLongitude = normalizeDegrees(Math.atan2(
    Math.sin(theta),
    Math.cos(theta) * Math.cos(obliquity),
  ) * RAD);
  const ascendantRightAscension = rightAscensionFromLongitude(ascendantLongitude, obliquity);
  const ascendantOffset = normalizeDegrees(ascendantRightAscension - armc);

  if (ascendantOffset <= ORDER_TOLERANCE || ascendantOffset >= 180 - ORDER_TOLERANCE) {
    return unavailable(
      "no-solution",
      "Placidus indisponível: não foi possível definir o ramo do Ascendente para as cúspides.",
    );
  }

  const ascendantRa = armc + ascendantOffset;
  const cuspRoots = new Map<11 | 12 | 2 | 3, number>();
  const solveOrder: (11 | 12 | 2 | 3)[] = [11, 12, 2, 3];

  for (const house of solveOrder) {
    const start = house === 11 || house === 12 ? armc : ascendantRa;
    const end = house === 11 || house === 12 ? ascendantRa : armc + 180;
    const root = solveCuspRightAscension(house, start, end, armc, latitude, obliquity);

    if (root.ambiguous) {
      return unavailable(
        "ambiguous-solution",
        `Placidus indisponível: mais de uma solução matemática para a cúspide ${house}.`,
      );
    }
    if (root.value === null) {
      return unavailable(
        "no-solution",
        `Placidus indisponível: não foi encontrada uma solução para a cúspide ${house}.`,
      );
    }
    cuspRoots.set(house, root.value);
  }

  const cusp2Longitude = longitudeFromRightAscension(cuspRoots.get(2)!, obliquity);
  const cusp3Longitude = longitudeFromRightAscension(cuspRoots.get(3)!, obliquity);
  const cusp11Longitude = longitudeFromRightAscension(cuspRoots.get(11)!, obliquity);
  const cusp12Longitude = longitudeFromRightAscension(cuspRoots.get(12)!, obliquity);
  const descendantLongitude = opposite(ascendantLongitude);
  const imumCoeliLongitude = opposite(midheavenLongitude);

  const cuspLongitudes = [
    ascendantLongitude,
    cusp2Longitude,
    cusp3Longitude,
    imumCoeliLongitude,
    opposite(cusp11Longitude),
    opposite(cusp12Longitude),
    descendantLongitude,
    opposite(cusp2Longitude),
    opposite(cusp3Longitude),
    midheavenLongitude,
    cusp11Longitude,
    cusp12Longitude,
  ];
  const cusps = cuspLongitudes.map((cusp, index) => ({
    ...pointAt(cusp),
    house: index + 1,
  }));

  if (!hasValidCuspOrder(cusps)) {
    return unavailable(
      "no-solution",
      "Placidus indisponível: as cúspides calculadas não formam uma sequência válida.",
    );
  }

  const angles: PlacidusAngles = {
    ascendant: pointAt(ascendantLongitude),
    descendant: pointAt(descendantLongitude),
    midheaven: pointAt(midheavenLongitude),
    imumCoeli: pointAt(imumCoeliLongitude),
  };

  const isEstimated = input.timeAccuracy === "approximate";
  return {
    status: isEstimated ? "estimated" : "calculated",
    system: "placidus",
    angles,
    cusps,
    planetHouses: assignHouses(cusps, input.planetaryLongitudes),
    armc,
    obliquity: obliquityDegrees,
    message: isEstimated
      ? "Cálculo estimado: o horário de nascimento foi informado como aproximado."
      : null,
  };
}
