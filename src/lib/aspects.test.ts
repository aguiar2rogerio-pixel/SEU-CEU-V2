import { describe, expect, it } from "vitest";
import { angularDistance, findAspect } from "./aspects";

describe("cálculos de aspectos", () => {
  it("normaliza a distância pela volta de 360 graus", () => {
    expect(angularDistance(359, 1)).toBe(2);
  });

  it("identifica conjunção, trígono e oposição dentro do orbe", () => {
    expect(findAspect(359, 1)).toMatchObject({ type: "conjunção", orb: 2 });
    expect(findAspect(12, 131)).toMatchObject({ type: "trígono", orb: 1 });
    expect(findAspect(42, 220)).toMatchObject({ type: "oposição", orb: 2 });
  });

  it("não inventa aspecto fora dos orbes definidos", () => {
    expect(findAspect(0, 34)).toBeNull();
  });
});
