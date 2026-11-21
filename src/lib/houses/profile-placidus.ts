import { calculatePlacidus } from "./placidus";
import { getFusoHorario } from "../timezone";
import type { BirthProfile, NatalChart, PlanetId } from "../types";

const PLANET_IDS: PlanetId[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];

/**
 * Adapta o perfil e as longitudes natais já calculadas à entrada do módulo
 * Placidus. O horário local é resolvido pelo helper IANA existente.
 */
export function calculateProfilePlacidus(
  profile: BirthProfile,
  natal: NatalChart | null,
) {
  let birthInstant: Date | null = null;
  if (profile.birthTimeAccuracy !== "unknown" && profile.birthTime) {
    try {
      birthInstant = getFusoHorario(
        `${profile.birthDate}T${profile.birthTime}:00`,
        profile.birthTimezone,
      ).instantUTC;
    } catch {
      // Deixa o motor identificar a entrada como indisponível, sem inferir outro horário.
    }
  }

  const planetaryLongitudes = Object.fromEntries(
    PLANET_IDS.map((planet) => [planet, natal?.[planet]?.longitude ?? null]),
  ) as Partial<Record<PlanetId, number | null>>;

  return calculatePlacidus({
    birthInstant,
    timeAccuracy: profile.birthTimeAccuracy,
    latitude: profile.birthLatitude ?? null,
    longitude: profile.birthLongitude ?? null,
    planetaryLongitudes,
  });
}
