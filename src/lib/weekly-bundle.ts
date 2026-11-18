import {
  EPHEMERIS_MODEL_VERSION,
  getMondayISO,
  PLANETS,
  weekDates,
  ZODIAC_SIGNS,
} from "./ephemeris";
import type {
  AspectType,
  BirthProfile,
  DailyEphemeris,
  DailyReading,
  GlobalAspect,
  NatalChart,
  PlanetId,
  PlanetPosition,
  TransitAspect,
  WeeklyBundle,
} from "./types";

const PLANET_IDS = PLANETS.map(({ id }) => id);
const ASPECT_TYPES: AspectType[] = ["conjunção", "sextil", "quadratura", "trígono", "oposição"];
const READING_BASES = ["aspecto-pessoal", "reflexao-geral"] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isPlanetPosition(value: unknown): value is PlanetPosition {
  if (!isRecord(value)) return false;
  const planet = value.planet;
  return (
    (typeof planet === "string" && [...PLANET_IDS, "ascendant"].includes(planet as PlanetId | "ascendant")) &&
    isFiniteNumber(value.longitude) && value.longitude >= 0 && value.longitude < 360 &&
    typeof value.sign === "string" && ZODIAC_SIGNS.includes(value.sign as (typeof ZODIAC_SIGNS)[number]) &&
    isFiniteNumber(value.degree) && value.degree >= 0 && value.degree < 30 &&
    typeof value.retrograde === "boolean"
  );
}

function isNatalChart(value: unknown): value is NatalChart {
  if (!isRecord(value)) return false;
  const hasAllPlanets = PLANET_IDS.every((id) =>
    Object.prototype.hasOwnProperty.call(value, id) &&
    (value[id] === null || isPlanetPosition(value[id]))
  );
  const ascendantIsValid = !Object.prototype.hasOwnProperty.call(value, "ascendant") ||
    value.ascendant === null || isPlanetPosition(value.ascendant);
  return hasAllPlanets && ascendantIsValid;
}

function isGlobalAspect(value: unknown): value is GlobalAspect {
  if (!isRecord(value)) return false;
  return (
    PLANET_IDS.includes(value.firstPlanet as PlanetId) &&
    PLANET_IDS.includes(value.secondPlanet as PlanetId) &&
    ASPECT_TYPES.includes(value.type as AspectType) &&
    isFiniteNumber(value.orb) && value.orb >= 0 &&
    isIsoDate(value.date)
  );
}

function isTransitAspect(value: unknown): value is TransitAspect {
  if (!isRecord(value)) return false;
  return (
    PLANET_IDS.includes(value.transitPlanet as PlanetId) &&
    PLANET_IDS.includes(value.natalPlanet as PlanetId) &&
    ASPECT_TYPES.includes(value.type as AspectType) &&
    isFiniteNumber(value.orb) && value.orb >= 0 &&
    isFiniteNumber(value.score) &&
    isIsoDate(value.date)
  );
}

function isDailyEphemeris(value: unknown): value is DailyEphemeris {
  if (!isRecord(value) || !isIsoDate(value.date)) return false;
  const positions = value.positions;
  if (!isRecord(positions)) return false;
  return (
    PLANET_IDS.every((id) => isPlanetPosition(positions[id])) &&
    Array.isArray(value.retrogrades) &&
    value.retrogrades.every((id) => PLANET_IDS.includes(id as PlanetId)) &&
    Array.isArray(value.globalAspects) &&
    value.globalAspects.every(isGlobalAspect)
  );
}

function isDailyReading(value: unknown): value is DailyReading {
  if (!isRecord(value)) return false;
  return (
    isIsoDate(value.date) &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    typeof value.action === "string" &&
    typeof value.career === "string" &&
    typeof value.relationships === "string" &&
    Array.isArray(value.aspects) && value.aspects.every(isTransitAspect) &&
    READING_BASES.includes(value.basis as (typeof READING_BASES)[number])
  );
}

/** Valida em tempo de execução o pacote na entrada do armazenamento e do backup. */
export function isWeeklyBundle(value: unknown): value is WeeklyBundle {
  if (!isRecord(value)) return false;
  if (
    value.version !== 1 ||
    typeof value.ephemerisVersion !== "string" ||
    !isIsoDate(value.weekStart) ||
    typeof value.profileUpdatedAt !== "string" ||
    typeof value.calculatedAt !== "string" ||
    !isNatalChart(value.natal) ||
    !Array.isArray(value.days) || value.days.length !== 7 ||
    !Array.isArray(value.readings) || value.readings.length !== 7
  ) {
    return false;
  }

  if (!value.days.every(isDailyEphemeris) || !value.readings.every(isDailyReading)) return false;
  const expectedDates = weekDates(value.weekStart);
  return value.days.every((day, index) => day.date === expectedDates[index]) &&
    value.readings.every((reading, index) => reading.date === expectedDates[index]);
}

/**
 * Reutiliza uma semana salva somente quando corresponde ao perfil, à semana
 * local e à versão exata do modelo de cálculo desta aplicação.
 */
export function isReusableWeeklyBundle(
  value: unknown,
  profile: BirthProfile,
  referenceDate = new Date(),
): value is WeeklyBundle {
  return (
    isWeeklyBundle(value) &&
    value.ephemerisVersion === EPHEMERIS_MODEL_VERSION &&
    value.weekStart === getMondayISO(referenceDate) &&
    value.profileUpdatedAt === profile.updatedAt
  );
}
