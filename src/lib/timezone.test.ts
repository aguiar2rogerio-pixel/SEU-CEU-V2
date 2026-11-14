import { describe, expect, it } from "vitest";
import { getFusoHorario } from "./timezone";

describe("conversão de horário local pelo fuso IANA", () => {
  it("aplica uma única vez o offset de verão de São Paulo", () => {
    const result = getFusoHorario("2018-11-10T12:00:00", "America/Sao_Paulo");

    expect(result.instantUTC.toISOString()).toBe("2018-11-10T14:00:00.000Z");
    expect(result.offset).toBe("-02:00");
    expect(result.nome).toBe("UTC-02:00");
  });

  it("usa o offset próprio de Manaus em vez de presumir UTC-03", () => {
    const result = getFusoHorario("2020-07-01T12:00:00", "America/Manaus");

    expect(result.instantUTC.toISOString()).toBe("2020-07-01T16:00:00.000Z");
    expect(result.nome).toBe("UTC-04:00");
  });

  it("resolve uma zona IANA fora do Brasil", () => {
    const result = getFusoHorario("2018-07-01T12:00:00", "Europe/Lisbon");

    expect(result.instantUTC.toISOString()).toBe("2018-07-01T11:00:00.000Z");
    expect(result.nome).toBe("UTC+01:00");
  });
});
