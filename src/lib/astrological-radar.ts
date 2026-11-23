import { ZODIAC_SIGNS, planetName } from "./ephemeris";
import type { NatalChart, PlanetId, ZodiacSign } from "./types";

/**
 * Pesos do Radar: Sol, Lua e Ascendente representam a base do mapa; Mercúrio,
 * Vênus e Marte recebem peso elevado; Júpiter e Saturno, peso intermediário;
 * Urano, Netuno e Plutão entram como camadas complementares.
 */
export const RADAR_WEIGHTS = {
  sun: 5,
  moon: 5,
  ascendant: 5,
  mercury: 4,
  venus: 4,
  mars: 4,
  jupiter: 3,
  saturn: 3,
  uranus: 1.5,
  neptune: 1.5,
  pluto: 1.5,
  concentration: 3,
  complementary: 1,
} as const;

export interface RadarSignResult {
  sign: ZodiacSign;
  score: number;
  reasons: string[];
  planetCount: number;
}

const WEIGHTED_PLANETS: PlanetId[] = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
];

export function calculateAstrologicalRadar(natal: NatalChart | null): RadarSignResult[] {
  const scoreBySign = new Map<ZodiacSign, { score: number; reasons: string[]; planetCount: number }>();
  ZODIAC_SIGNS.forEach((sign) => scoreBySign.set(sign, { score: 0, reasons: [], planetCount: 0 }));

  if (!natal) return ZODIAC_SIGNS.map((sign) => ({ sign, score: 0, reasons: [], planetCount: 0 }));

  const addPosition = (sign: ZodiacSign, weight: number, reason: string, countAsPlanet = false) => {
    const entry = scoreBySign.get(sign);
    if (!entry) return;
    entry.score += weight;
    entry.reasons.push(reason);
    if (countAsPlanet) entry.planetCount += 1;
  };

  for (const planetId of WEIGHTED_PLANETS) {
    const weight = RADAR_WEIGHTS[planetId];
    const position = natal[planetId];
    if (position) addPosition(position.sign, weight, `${planetName(planetId)} · peso ${weight}`, true);
  }

  const ascendant = natal.ascendant;
  if (ascendant) addPosition(ascendant.sign, RADAR_WEIGHTS.ascendant, `Ascendente · peso ${RADAR_WEIGHTS.ascendant}`);

  scoreBySign.forEach((entry) => {
    if (entry.planetCount >= 3) {
      entry.score += RADAR_WEIGHTS.concentration;
      entry.reasons.push(`Concentração de ${entry.planetCount} planetas · bônus ${RADAR_WEIGHTS.concentration}`);
    }
  });

  const complementaryPoints = [
    ["Nodo Norte", natal.complementaryPoints?.northNode],
    ["Nodo Sul", natal.complementaryPoints?.southNode],
    ["Quíron", natal.complementaryPoints?.chiron],
  ] as const;
  for (const [label, point] of complementaryPoints) {
    if (point?.sign) addPosition(point.sign, RADAR_WEIGHTS.complementary, `${label} · camada complementar +${RADAR_WEIGHTS.complementary}`);
  }

  return ZODIAC_SIGNS.map((sign, index) => {
    const entry = scoreBySign.get(sign)!;
    return { sign, score: Number(entry.score.toFixed(1)), reasons: entry.reasons, planetCount: entry.planetCount, originalIndex: index };
  })
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .map(({ originalIndex: _originalIndex, ...result }) => result);
}
