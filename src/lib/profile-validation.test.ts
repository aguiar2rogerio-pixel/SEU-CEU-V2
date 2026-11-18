import { describe, expect, it } from "vitest";
import { parseBirthProfile } from "./profile-validation";

const validProfile = {
  schemaVersion: 1,
  name: "Pessoa de teste",
  birthDate: "1990-06-15",
  birthTime: "12:30",
  birthTimeAccuracy: "exact",
  birthPlace: "São Paulo - SP",
  birthState: "SP",
  birthCity: "São Paulo",
  birthLatitude: -23.55,
  birthLongitude: -46.63,
  birthTimezone: "America/Sao_Paulo",
  timezoneConfirmed: true,
  updatedAt: "2026-11-17T12:00:00.000Z",
};

describe("parseBirthProfile", () => {
  it("aceita um perfil completo sem alterar horário, coordenadas ou fuso", () => {
    expect(parseBirthProfile(validProfile)).toEqual(validProfile);
  });

  it("aceita um horário desconhecido sem inventar um horário de referência", () => {
    const profile = { ...validProfile, birthTime: null, birthTimeAccuracy: "unknown" };
    expect(parseBirthProfile(profile)).toEqual(profile);
  });

  it("rejeita horário desconhecido combinado com um horário aparentemente exato", () => {
    const profile = { ...validProfile, birthTimeAccuracy: "unknown" };
    expect(parseBirthProfile(profile)).toBeNull();
  });

  it("rejeita datas, coordenadas, horário e fuso malformados", () => {
    expect(parseBirthProfile({ ...validProfile, birthDate: "1990-02-30" })).toBeNull();
    expect(parseBirthProfile({ ...validProfile, birthLatitude: 110 })).toBeNull();
    expect(parseBirthProfile({ ...validProfile, birthTime: "25:90" })).toBeNull();
    expect(parseBirthProfile({ ...validProfile, birthTimezone: " " })).toBeNull();
  });
});
