import { describe, expect, it } from "vitest";
import { calculateAstrologicalRadar } from "./astrological-radar";
import type { ComplementaryPointId, NatalChart, NatalAngleId, PlanetId, ZodiacSign } from "./types";

const emptyNatal = (): NatalChart => ({
  sun: null, moon: null, mercury: null, venus: null, mars: null,
  jupiter: null, saturn: null, uranus: null, neptune: null, pluto: null,
});

function planetPosition(planet: PlanetId, sign: ZodiacSign) {
  return { planet, longitude: 10, sign, degree: 10, retrograde: false };
}

function anglePosition(id: NatalAngleId, sign: ZodiacSign) {
  return { id, longitude: 10, sign, degree: 10, minute: 0 };
}

function complementaryPosition(id: ComplementaryPointId, sign: ZodiacSign) {
  return { id, longitude: 10, sign, degree: 10, minute: 0, house: null, retrograde: false, motion: "not-applicable" as const, speedDegreesPerDay: null, status: "calculated" as const, method: "test", reason: null };
}

describe("calculateAstrologicalRadar", () => {
  it("retorna nenhum destaque quando não há duas posições no mesmo signo", () => {
    const natal = emptyNatal();
    natal.sun = planetPosition("sun", "Áries");
    natal.moon = planetPosition("moon", "Touro");
    expect(calculateAstrologicalRadar(natal)).toEqual([]);
  });

  it("exibe apenas signos com duas ou mais posições e ordena por concentração", () => {
    const natal = emptyNatal();
    natal.sun = planetPosition("sun", "Áries");
    natal.moon = planetPosition("moon", "Áries");
    natal.mercury = planetPosition("mercury", "Touro");
    natal.venus = planetPosition("venus", "Touro");
    natal.mars = planetPosition("mars", "Touro");

    expect(calculateAstrologicalRadar(natal)).toEqual([
      { sign: "Touro", positions: ["Mercúrio", "Vênus", "Marte"] },
      { sign: "Áries", positions: ["Sol", "Lua"] },
    ]);
  });

  it("contabiliza ângulos e pontos complementares, sem duplicar o Ascendente legado", () => {
    const natal = emptyNatal();
    natal.ascendant = planetPosition("sun", "Câncer");
    natal.pluto = planetPosition("pluto", "Escorpião");
    natal.angles = {
      ascendant: anglePosition("ascendant", "Câncer"),
      descendant: anglePosition("descendant", "Câncer"),
      midheaven: anglePosition("midheaven", "Virgem"),
      imumCoeli: anglePosition("imumCoeli", "Virgem"),
    };
    natal.complementaryPoints = {
      northNode: complementaryPosition("northNode", "Câncer"),
      southNode: complementaryPosition("southNode", "Virgem"),
      lilith: complementaryPosition("lilith", "Virgem"),
      chiron: complementaryPosition("chiron", "Libra"),
      partOfFortune: complementaryPosition("partOfFortune", "Libra"),
      vertex: complementaryPosition("vertex", "Escorpião"),
    };

    expect(calculateAstrologicalRadar(natal)).toEqual([
      { sign: "Virgem", positions: ["Meio do Céu", "Fundo do Céu", "Nodo Sul", "Lilith"] },
      { sign: "Câncer", positions: ["Ascendente", "Descendente", "Nodo Norte"] },
      { sign: "Libra", positions: ["Quíron", "Parte da Fortuna"] },
      { sign: "Escorpião", positions: ["Plutão", "Vértice"] },
    ]);
  });

  it("contabiliza os dez planetas quando estão disponíveis", () => {
    const natal = emptyNatal();
    const planets: PlanetId[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
    for (const planet of planets) natal[planet] = planetPosition(planet, "Áries");

    expect(calculateAstrologicalRadar(natal)).toEqual([{
      sign: "Áries",
      positions: ["Sol", "Lua", "Mercúrio", "Vênus", "Marte", "Júpiter", "Saturno", "Urano", "Netuno", "Plutão"],
    }]);
  });

  it("ignora pontos complementares marcados como indisponíveis", () => {
    const natal = emptyNatal();
    natal.sun = planetPosition("sun", "Áries");
    natal.complementaryPoints = {
      northNode: { ...complementaryPosition("northNode", "Áries"), sign: "Áries", status: "unavailable" },
    };

    expect(calculateAstrologicalRadar(natal)).toEqual([]);
  });

  it("mantém a ordem zodiacal original em empates", () => {
    const natal = emptyNatal();
    natal.sun = planetPosition("sun", "Áries");
    natal.moon = planetPosition("moon", "Áries");
    natal.mercury = planetPosition("mercury", "Touro");
    natal.venus = planetPosition("venus", "Touro");
    expect(calculateAstrologicalRadar(natal).map((item) => item.sign)).toEqual(["Áries", "Touro"]);
  });
});
