import { Body, Ecliptic, EclipticGeoMoon, GeoVector, SunPosition } from "astronomy-engine";
import type { BirthProfile, DailyEphemeris, NatalChart, PlanetId, PlanetPosition, ZodiacSign } from "./types";
import { getFusoHorario } from "./timezone";

export const EPHEMERIS_MODEL_VERSION = "geocentric-tropical-v2";

export const ZODIAC_SIGNS: ZodiacSign[] = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes",
];

export const PLANETS: { id: PlanetId; name: string; body: Body | null }[] = [
  { id: "sun", name: "Sol", body: null },
  { id: "moon", name: "Lua", body: Body.Moon },
  { id: "mercury", name: "Mercúrio", body: Body.Mercury },
  { id: "venus", name: "Vênus", body: Body.Venus },
  { id: "mars", name: "Marte", body: Body.Mars },
  { id: "jupiter", name: "Júpiter", body: Body.Jupiter },
  { id: "saturn", name: "Saturno", body: Body.Saturn },
  { id: "uranus", name: "Urano", body: Body.Uranus },
  { id: "neptune", name: "Netuno", body: Body.Neptune },
  { id: "pluto", name: "Plutão", body: Body.Pluto },
];

const RETROGRADE_PLANETS = new Set<PlanetId>([
  "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
]);

export function planetName(id: PlanetId): string {
  return PLANETS.find((planet) => planet.id === id)?.name ?? id;
}

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

export function getPlanetLongitude(planet: PlanetId, date: Date): number {
  const definition = PLANETS.find((item) => item.id === planet);
  if (!definition) throw new Error(`Planeta não reconhecido: ${planet}`);

  let longitude: number;
  if (planet === "sun") {
    longitude = SunPosition(date).elon;
  } else if (planet === "moon") {
    longitude = EclipticGeoMoon(date).lon;
  } else {
    if (definition.body === null) throw new Error(`Corpo astronômico ausente: ${planet}`);
    longitude = Ecliptic(GeoVector(definition.body, date, true)).elon;
  }

  return normalizeLongitude(longitude);
}

export function positionAt(planet: PlanetId, date: Date, retrograde = false): PlanetPosition {
  const longitude = getPlanetLongitude(planet, date);
  const signIndex = Math.floor(longitude / 30) % 12;
  return {
    planet,
    longitude,
    sign: ZODIAC_SIGNS[signIndex],
    degree: longitude - signIndex * 30,
    retrograde,
  };
}

export function calculateAscendant(birthInstant: Date, latitude?: number | null, longitude?: number | null): PlanetPosition | null {
  if (latitude == null || longitude == null) return null;

  const JD = birthInstant.getTime() / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525.0;

  let gmst = 280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  gmst = normalizeLongitude(gmst);

  const lst = normalizeLongitude(gmst + longitude);
  const lstRad = (lst * Math.PI) / 180;

  const obliq = 23.439292 - 0.0130042 * T;
  const obliqRad = (obliq * Math.PI) / 180;

  const latRad = (latitude * Math.PI) / 180;

  const y = Math.cos(lstRad);
  const x = -(Math.sin(lstRad) * Math.cos(obliqRad) + Math.tan(latRad) * Math.sin(obliqRad));

  const ascRad = Math.atan2(y, x);
  const ascDeg = normalizeLongitude((ascRad * 180) / Math.PI);

  const signIndex = Math.floor(ascDeg / 30) % 12;
  return {
    planet: "sun" as PlanetId,
    longitude: ascDeg,
    sign: ZODIAC_SIGNS[signIndex],
    degree: ascDeg - signIndex * 30,
    retrograde: false,
  };
}

function shortestArc(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function isoDateInLocalCalendar(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function utcMidday(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

export function getMondayISO(reference = new Date()): string {
  const monday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const daysFromMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysFromMonday);
  return isoDateInLocalCalendar(monday);
}

export function weekDates(mondayISO = getMondayISO()): string[] {
  const monday = new Date(`${mondayISO}T12:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

export function calculateWeek(reference = new Date()): DailyEphemeris[] {
  const dates = weekDates(getMondayISO(reference));
  return dates.map((isoDate) => {
    const today = utcMidday(isoDate);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const positions = {} as Record<PlanetId, PlanetPosition>;
    const retrogrades: PlanetId[] = [];

    for (const planet of PLANETS) {
      let isRetrograde = false;
      if (RETROGRADE_PLANETS.has(planet.id)) {
        const movement = shortestArc(
          getPlanetLongitude(planet.id, today),
          getPlanetLongitude(planet.id, tomorrow),
        );
        isRetrograde = movement < -0.005;
        if (isRetrograde) retrogrades.push(planet.id);
      }
      positions[planet.id] = positionAt(planet.id, today, isRetrograde);
    }

    return { date: isoDate, positions, retrogrades, globalAspects: [] };
  });
}

export function calculateNatalChart(profile: BirthProfile) {
  const referenceTime = profile.birthTimeAccuracy === "unknown" ? "12:00" : (profile.birthTime || "12:00");
  const localDateTime = `${profile.birthDate}T${referenceTime}:00`;

  const { instantUTC: birthInstant, nome: fusoUsado } = getFusoHorario(localDateTime, profile.birthTimezone);

  if (Number.isNaN(birthInstant.getTime())) {
    throw new Error("Não foi possível interpretar data, hora e fuso do nascimento.");
  }

  const chart = {} as NatalChart;
  for (const planet of PLANETS) {
    if (planet.id === "moon" && profile.birthTimeAccuracy === "unknown") {
      chart[planet.id] = null;
    } else {
      chart[planet.id] = positionAt(planet.id, birthInstant);
    }
  }

  const ascendant = profile.birthTimeAccuracy !== "unknown"
    ? calculateAscendant(birthInstant, profile.birthLatitude, profile.birthLongitude)
    : null;

  return {
    ...chart,
    ascendant,
    _meta: {
      fusoUsado,
    },
  };
}

export function formatDateISO(isoDate: string, options: Intl.DateTimeFormatOptions = {}): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...options }).format(date);
}

export function formatWeekRange(mondayISO: string): string {
  const dates = weekDates(mondayISO);
  const first = new Date(`${dates[0]}T12:00:00.000Z`);
  const last = new Date(`${dates[6]}T12:00:00.000Z`);
  const monthFirst = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(first);
  const monthLast = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(last);
  const firstDay = first.getUTCDate();
  const lastDay = last.getUTCDate();
  return monthFirst === monthLast
    ? `${firstDay}–${lastDay} de ${monthLast}`
    : `${firstDay} de ${monthFirst} a ${lastDay} de ${monthLast}`;
}

export function currentLocalISODate(reference = new Date()): string {
  return isoDateInLocalCalendar(reference);
}

