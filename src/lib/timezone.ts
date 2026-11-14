import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type FusoInfo = {
  instantUTC: Date;
  offset: string;
  nome: string;
};

/**
 * Converte uma data/hora de parede (sem sufixo de zona) usando a zona IANA
 * informada e devolve também o offset que essa zona aplica naquele instante.
 * O offset só é informativo: nunca é somado manualmente ao instante.
 */
export function getFusoHorario(localDateTime: string, timezone: string): FusoInfo {
  const instantUTC = fromZonedTime(localDateTime, timezone);
  if (Number.isNaN(instantUTC.getTime())) {
    throw new Error("Não foi possível interpretar a data, hora e fuso informados.");
  }

  const formattedOffset = formatInTimeZone(instantUTC, timezone, "xxx");
  const offset = formattedOffset === "Z" ? "+00:00" : formattedOffset;

  return {
    instantUTC,
    offset,
    nome: `UTC${offset}`,
  };
}
