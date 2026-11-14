import { PLANETS } from "./ephemeris";
import type { AspectType, DailyEphemeris, GlobalAspect, NatalChart, PlanetId, TransitAspect } from "./types";

const ASPECTS: { type: AspectType; angle: number; orb: number }[] = [
  { type: "conjunção", angle: 0, orb: 7 },
  { type: "sextil", angle: 60, orb: 4 },
  { type: "quadratura", angle: 90, orb: 5 },
  { type: "trígono", angle: 120, orb: 5 },
  { type: "oposição", angle: 180, orb: 7 },
];

const PLANET_WEIGHT: Record<PlanetId, number> = {
  sun: 7, moon: 3, mercury: 5, venus: 5, mars: 6,
  jupiter: 6, saturn: 7, uranus: 5, neptune: 4, pluto: 5,
};

const ASPECT_WEIGHT: Record<AspectType, number> = {
  "conjunção": 4, "oposição": 3.5, "quadratura": 3.2, "trígono": 2.7, "sextil": 2.2,
};

export function angularDistance(first: number, second: number): number {
  const difference = Math.abs(((first - second) % 360 + 360) % 360);
  return Math.min(difference, 360 - difference);
}

export function findAspect(first: number, second: number): { type: AspectType; orb: number } | null {
  const distance = angularDistance(first, second);
  const match = ASPECTS
    .map((aspect) => ({ ...aspect, deviation: Math.abs(distance - aspect.angle) }))
    .filter((aspect) => aspect.deviation <= aspect.orb)
    .sort((a, b) => a.deviation - b.deviation)[0];
  if (!match) return null;
  return { type: match.type, orb: match.deviation };
}

export function findGlobalAspects(day: DailyEphemeris): GlobalAspect[] {
  const planets = PLANETS.map((planet) => planet.id);
  const results: GlobalAspect[] = [];
  for (let firstIndex = 0; firstIndex < planets.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < planets.length; secondIndex += 1) {
      const firstPlanet = planets[firstIndex];
      const secondPlanet = planets[secondIndex];
      const first = day.positions[firstPlanet];
      const second = day.positions[secondPlanet];
      const aspect = findAspect(first.longitude, second.longitude);
      if (aspect && aspect.orb <= (aspect.type === "conjunção" || aspect.type === "oposição" ? 3 : 2)) {
        results.push({ firstPlanet, secondPlanet, ...aspect, date: day.date });
      }
    }
  }
  return results.sort((a, b) => a.orb - b.orb);
}

export function findPersonalAspects(days: DailyEphemeris[], natal: NatalChart): TransitAspect[] {
  const results: TransitAspect[] = [];
  for (const day of days) {
    for (const transit of PLANETS) {
      for (const natalPlanet of PLANETS) {
        const natalPosition = natal[natalPlanet.id];
        if (!natalPosition) continue;
        const aspect = findAspect(day.positions[transit.id].longitude, natalPosition.longitude);
        if (!aspect) continue;
        const score = PLANET_WEIGHT[transit.id] + ASPECT_WEIGHT[aspect.type] - aspect.orb / 3;
        results.push({
          transitPlanet: transit.id,
          natalPlanet: natalPlanet.id,
          type: aspect.type,
          orb: aspect.orb,
          score,
          date: day.date,
        });
      }
    }
  }
  return results;
}
