import { describe, expect, it } from "vitest";
import { calculateAstrologicalRadar } from "./astrological-radar";
import type { NatalChart, PlanetId } from "./types";

const emptyNatal = (): NatalChart => ({
  sun: null, moon: null, mercury: null, venus: null, mars: null,
  jupiter: null, saturn: null, uranus: null, neptune: null, pluto: null,
});

function position(planet: PlanetId, sign: "Áries" | "Touro"): NonNullable<NatalChart[PlanetId]> {
  return { planet, longitude: sign === "Áries" ? 10 : 40, sign, degree: 10, retrograde: false };
}

describe("calculateAstrologicalRadar", () => {
  it("mostra todos os signos e não inventa pontuação para posições ausentes", () => {
    const result = calculateAstrologicalRadar(emptyNatal());
    expect(result).toHaveLength(12);
    expect(result.every((item) => item.score === 0 && item.reasons.length === 0)).toBe(true);
  });

  it("aplica pesos principais e bônus de concentração", () => {
    const natal = emptyNatal();
    natal.sun = position("sun", "Áries");
    natal.moon = position("moon", "Áries");
    natal.mercury = position("mercury", "Áries");
    natal.ascendant = position("sun", "Touro");
    const aries = calculateAstrologicalRadar(natal).find((item) => item.sign === "Áries");
    expect(aries?.score).toBe(17);
    expect(aries?.reasons).toContain("Concentração de 3 planetas · bônus 3");
  });

  it("inclui nodos e Quíron como camadas complementares", () => {
    const natal = emptyNatal();
    natal.complementaryPoints = {
      northNode: { id: "northNode", longitude: 10, sign: "Áries", degree: 10, minute: 0, house: null, retrograde: false, motion: "not-applicable", speedDegreesPerDay: null, status: "calculated", method: "test", reason: null },
      chiron: { id: "chiron", longitude: 40, sign: "Touro", degree: 10, minute: 0, house: null, retrograde: false, motion: "retrograde", speedDegreesPerDay: null, status: "calculated", method: "test", reason: null },
    };
    const result = calculateAstrologicalRadar(natal);
    expect(result.find((item) => item.sign === "Áries")?.score).toBe(1);
    expect(result.find((item) => item.sign === "Touro")?.score).toBe(1);
  });
});
