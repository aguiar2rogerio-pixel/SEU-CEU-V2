import { describe, expect, it } from "vitest";
import { calculateNatalChart, calculateWeek, getMondayISO, getPlanetLongitude, PLANETS } from "./ephemeris";
import type { BirthProfile } from "./types";

const profile: BirthProfile = {
  schemaVersion: 1,
  name: "Pessoa de teste",
  birthDate: "1990-06-15",
  birthTime: null,
  birthTimeAccuracy: "unknown",
  birthPlace: "",
  birthTimezone: "America/Sao_Paulo",
  timezoneConfirmed: true,
  updatedAt: "2026-10-10T12:00:00.000Z",
};

describe("efemérides locais", () => {
  it("gera sete dias, começando na segunda-feira", () => {
    const monday = getMondayISO(new Date(2026, 9, 14, 12, 0));
    const days = calculateWeek(new Date(2026, 9, 14, 12, 0));
    expect(monday).toBe("2026-10-12");
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-10-12");
    expect(days[6].date).toBe("2026-10-18");
  });

  it("calcula todos os corpos disponíveis e não confirma a Lua sem horário natal", () => {
    const natal = calculateNatalChart(profile);
    // Conta apenas os planetas, ignorando _meta e a chave opcional do Ascendente.
    const planetKeys = Object.keys(natal).filter(key => !key.startsWith('_') && key !== "ascendant");
    expect(planetKeys).toHaveLength(PLANETS.length);
    expect(natal.sun?.sign).toBeTruthy();
    expect(natal.moon).toBeNull();
  });

  it("usa longitudes eclípticas tropicais geocêntricas, não heliocêntricas", () => {
    const j2000 = new Date("2000-01-01T12:00:00.000Z");
    // Valores de referência do Astronomy Engine para a época J2000. O orbe do teste
    // tolera arredondamentos, mas distingue as longitudes geocêntricas das heliocêntricas.
    const expected: [Parameters<typeof getPlanetLongitude>[0], number][] = [
      ["sun", 280.3686],
      ["moon", 223.3239],
      ["mercury", 271.8889],
      ["venus", 241.5652],
      ["mars", 327.9639],
      ["jupiter", 25.2542],
      ["saturn", 40.3961],
      ["uranus", 314.8061],
      ["neptune", 303.1954],
      ["pluto", 251.4547],
    ];

    for (const [planet, longitude] of expected) {
      expect(getPlanetLongitude(planet, j2000), planet).toBeCloseTo(longitude, 1);
    }
  });

  it("inclui a Lua natal quando o horário é conhecido e mantém a omissão quando é desconhecido", () => {
    const exactProfile: BirthProfile = {
      ...profile,
      birthDate: "2000-01-01",
      birthTime: "12:00",
      birthTimeAccuracy: "exact",
      birthTimezone: "UTC",
    };
    const natal = calculateNatalChart(exactProfile);

    expect(natal.moon?.longitude).toBeCloseTo(223.3239, 1);
    expect(natal.moon?.sign).toBe("Escorpião");
    expect(calculateNatalChart(profile).moon).toBeNull();
  });

  // ✅ Novo teste: verifica que o ajuste de Horário de Verão está disponível
  it("retorna o offset IANA usado para calcular o mapa natal", () => {
    const natal = calculateNatalChart(profile);
    expect(natal._meta).toBeDefined();
    expect(natal._meta?.fusoUsado).toBe("UTC-03:00");
  });
});
