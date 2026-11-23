import { PLANETS, ZODIAC_SIGNS } from "./ephemeris";
import type { NatalChart, ZodiacSign } from "./types";

/**
 * O Radar é uma ferramenta de orientação: conta cada posição natal disponível
 * uma única vez no signo em que está. Não há pesos, bônus ou interpretação.
 */
export interface RadarSignResult {
  sign: ZodiacSign;
  positions: string[];
}

type SignPosition = { sign: ZodiacSign | null; status?: "calculated" | "estimated" | "unavailable" };

const ANGLE_LABELS: { id: "ascendant" | "descendant" | "midheaven" | "imumCoeli"; label: string }[] = [
  { id: "ascendant", label: "Ascendente" },
  { id: "descendant", label: "Descendente" },
  { id: "midheaven", label: "Meio do Céu" },
  { id: "imumCoeli", label: "Fundo do Céu" },
];

const COMPLEMENTARY_LABELS: { id: "northNode" | "southNode" | "lilith" | "chiron" | "partOfFortune" | "vertex"; label: string }[] = [
  { id: "northNode", label: "Nodo Norte" },
  { id: "southNode", label: "Nodo Sul" },
  { id: "lilith", label: "Lilith" },
  { id: "chiron", label: "Quíron" },
  { id: "partOfFortune", label: "Parte da Fortuna" },
  { id: "vertex", label: "Vértice" },
];

export function calculateAstrologicalRadar(natal: NatalChart | null): RadarSignResult[] {
  const positionsBySign = new Map<ZodiacSign, string[]>();
  ZODIAC_SIGNS.forEach((sign) => positionsBySign.set(sign, []));

  if (!natal) return [];

  const addPosition = (position: SignPosition | null | undefined, label: string) => {
    if (!position?.sign || position.status === "unavailable") return;
    positionsBySign.get(position.sign)?.push(label);
  };

  for (const planet of PLANETS) {
    addPosition(natal[planet.id], planet.name);
  }

  // O Ascendente legado e angles.ascendant representam a mesma posição.
  // Preferimos a versão estruturada e contamos o ponto apenas uma vez.
  const structuredAscendant = natal.angles?.ascendant;
  addPosition(structuredAscendant ?? natal.ascendant, "Ascendente");
  for (const angle of ANGLE_LABELS.slice(1)) {
    addPosition(natal.angles?.[angle.id], angle.label);
  }

  for (const point of COMPLEMENTARY_LABELS) {
    addPosition(natal.complementaryPoints?.[point.id], point.label);
  }

  return ZODIAC_SIGNS
    .map((sign, originalIndex) => ({ sign, positions: positionsBySign.get(sign) ?? [], originalIndex }))
    .filter((result) => result.positions.length >= 2)
    .sort((a, b) => b.positions.length - a.positions.length || a.originalIndex - b.originalIndex)
    .map(({ sign, positions }) => ({ sign, positions }));
}
