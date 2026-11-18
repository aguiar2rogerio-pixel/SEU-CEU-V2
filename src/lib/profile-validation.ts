import type { BirthProfile, BirthTimeAccuracy } from "./types";

const ACCURACY_VALUES: BirthTimeAccuracy[] = ["exact", "approximate", "unknown"];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isOptionalCoordinate(value: unknown, minimum: number, maximum: number): boolean {
  return value === undefined || value === null ||
    (typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum);
}

/** Aceita perfis completos; quando ausente, normaliza o schemaVersion legado para v1. */
export function parseBirthProfile(value: unknown): BirthProfile | null {
  if (!isRecord(value) || (value.schemaVersion !== undefined && value.schemaVersion !== 1)) return null;

  const normalized: UnknownRecord = {
    ...value,
    schemaVersion: 1,
    birthPlace: value.birthPlace === undefined ? null : value.birthPlace,
  };
  const timeAccuracy = normalized.birthTimeAccuracy;
  const birthTime = normalized.birthTime;

  if (
    typeof normalized.name !== "string" || normalized.name.trim().length === 0 ||
    !isIsoDate(normalized.birthDate) ||
    !ACCURACY_VALUES.includes(timeAccuracy as BirthTimeAccuracy) ||
    !(birthTime === null || (typeof birthTime === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime))) ||
    (timeAccuracy !== "unknown" && typeof birthTime !== "string") ||
    (timeAccuracy === "unknown" && birthTime !== null) ||
    !(normalized.birthPlace === null || typeof normalized.birthPlace === "string") ||
    !isOptionalString(normalized.birthState) ||
    !isOptionalString(normalized.birthCity) ||
    !isOptionalCoordinate(normalized.birthLatitude, -90, 90) ||
    !isOptionalCoordinate(normalized.birthLongitude, -180, 180) ||
    typeof normalized.birthTimezone !== "string" || normalized.birthTimezone.trim().length === 0 ||
    typeof normalized.timezoneConfirmed !== "boolean" ||
    typeof normalized.updatedAt !== "string" || Number.isNaN(Date.parse(normalized.updatedAt))
  ) {
    return null;
  }

  return normalized as unknown as BirthProfile;
}
