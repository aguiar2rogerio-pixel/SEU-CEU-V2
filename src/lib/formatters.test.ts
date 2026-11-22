import { describe, expect, it } from "vitest";
import { formatDegreesMinutes } from "./formatters";

describe("formatDegreesMinutes", () => {
  it("mostra graus e minutos com zero à esquerda", () => {
    expect(formatDegreesMinutes(5.24, 14)).toBe("5°14′");
    expect(formatDegreesMinutes(0.08, 4)).toBe("0°04′");
  });

  it("preserva o limite de 29 graus e 59 minutos", () => {
    expect(formatDegreesMinutes(29.99, 59)).toBe("29°59′");
  });
});
