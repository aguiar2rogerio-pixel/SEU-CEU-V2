import { getPlanetLongitude, normalizeLongitude, positionAt } from "./ephemeris";
import type { DailyEphemeris, ZodiacSign } from "./types";

type MoonPhaseName =
  | "Lua Nova"
  | "Lua Crescente"
  | "Quarto Crescente"
  | "Lua Gibosa Crescente"
  | "Lua Cheia"
  | "Lua Gibosa Minguante"
  | "Quarto Minguante"
  | "Lua Minguante";

export type MoonPhaseInfo = {
  name: MoonPhaseName;
  sign: ZodiacSign;
  lunationSign: ZodiacSign;
  isLunationStart: boolean;
  label: string;
  lunationLabel: string;
  reading: string;
};

function isoDateAtNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

function phaseAngle(day: DailyEphemeris): number {
  return normalizeLongitude(day.positions.moon.longitude - day.positions.sun.longitude);
}

function phaseName(angle: number): MoonPhaseName {
  if (angle >= 337.5 || angle < 22.5) return "Lua Nova";
  if (angle < 67.5) return "Lua Crescente";
  if (angle < 112.5) return "Quarto Crescente";
  if (angle < 157.5) return "Lua Gibosa Crescente";
  if (angle < 202.5) return "Lua Cheia";
  if (angle < 247.5) return "Lua Gibosa Minguante";
  if (angle < 292.5) return "Quarto Minguante";
  return "Lua Minguante";
}

function distanceToNew(angle: number): number {
  return Math.min(angle, 360 - angle);
}

function previousNewMoon(isoDate: string): { isoDate: string; sign: ZodiacSign } {
  const current = isoDateAtNoon(isoDate);
  let bestDate = isoDate;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let offset = 0; offset <= 35; offset += 1) {
    const date = new Date(current);
    date.setUTCDate(date.getUTCDate() - offset);
    const angle = normalizeLongitude(
      getPlanetLongitude("moon", date) - getPlanetLongitude("sun", date),
    );
    const distance = distanceToNew(angle);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDate = date.toISOString().slice(0, 10);
    }
  }

  const newMoonDate = isoDateAtNoon(bestDate);
  return {
    isoDate: bestDate,
    sign: positionAt("moon", newMoonDate).sign,
  };
}

function phaseReading(name: MoonPhaseName, sign: ZodiacSign, lunationSign: ZodiacSign): string {
  if (name === "Lua Nova") {
    return `Um novo ciclo começa em ${sign}. A lunação convida a escolher uma intenção e observar o que pede renovação.`;
  }
  if (name === "Lua Cheia") {
    return `A lunação chega a um ponto de culminação em ${sign}. Observe o que ganhou clareza e o que pede reconhecimento.`;
  }
  if (name === "Lua Crescente" || name === "Quarto Crescente" || name === "Lua Gibosa Crescente") {
    return `A lunação iniciada em ${lunationSign} ganha força enquanto a Lua atravessa ${sign}. Acompanhe o que está crescendo e escolha um próximo passo possível.`;
  }
  return `A lunação iniciada em ${lunationSign} segue em recolhimento enquanto a Lua atravessa ${sign}. Reserve espaço para revisar, simplificar e concluir.`;
}

export function getMoonPhaseInfo(day: DailyEphemeris): MoonPhaseInfo {
  const angle = phaseAngle(day);
  const name = phaseName(angle);
  const sign = day.positions.moon.sign;
  const newMoon = previousNewMoon(day.date);
  const isLunationStart = newMoon.isoDate === day.date && name === "Lua Nova";

  return {
    name,
    sign,
    lunationSign: newMoon.sign,
    isLunationStart,
    label: `${name} em ${sign}`,
    lunationLabel: isLunationStart
      ? `Início da lunação em ${newMoon.sign}.`
      : `Lunação iniciada em ${newMoon.sign}.`,
    reading: phaseReading(name, sign, newMoon.sign),
  };
}

export function getMoonWeekLead(days: DailyEphemeris[]): string {
  if (!days.length) return "A Lua da semana está sendo calculada.";
  const first = getMoonPhaseInfo(days[0]);
  const last = getMoonPhaseInfo(days[days.length - 1]);
  const newMoonDay = days.find((day) => getMoonPhaseInfo(day).isLunationStart);

  if (newMoonDay) {
    const newMoon = getMoonPhaseInfo(newMoonDay);
    return `A semana marca o início da lunação em ${newMoon.lunationSign}.`;
  }
  if (first.label === last.label) {
    return `A semana acompanha a ${first.name.toLowerCase()} em ${first.sign}.`;
  }
  return `A Lua atravessa a semana de ${first.name.toLowerCase()} em ${first.sign} até ${last.name.toLowerCase()} em ${last.sign}.`;
}
