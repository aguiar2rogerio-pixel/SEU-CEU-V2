import { ArrowUpRight, BriefcaseBusiness, Heart, Sparkles } from "lucide-react";
import type { DailyReading } from "../lib/types";
import { formatDateISO, planetName } from "../lib/ephemeris";
import { getReadingBasisLabel } from "../lib/readings";

type Props = { reading: DailyReading; compact?: boolean };

export function ReadingCard({ reading, compact = false }: Props) {
  return (
    <article className={`reading-card ${compact ? "reading-card--compact" : ""}`}>
      <div className="reading-card__topline">
        <span className="eyebrow"><Sparkles size={13} aria-hidden="true" /> {getReadingBasisLabel(reading)}</span>
        <time dateTime={reading.date}>{formatDateISO(reading.date, { weekday: "short", day: "numeric", month: "short" })}</time>
      </div>
      <h3>{reading.title}</h3>
      <p className="reading-card__summary">{reading.summary}</p>
      {reading.aspects.length > 0 && (
        <div className="aspect-pills" aria-label="Aspectos calculados">
          {reading.aspects.slice(0, 2).map((aspect) => (
            <span className="aspect-pill" key={`${aspect.transitPlanet}-${aspect.natalPlanet}-${aspect.type}`}>
              {planetName(aspect.transitPlanet)} {aspect.type} seu {planetName(aspect.natalPlanet)}
            </span>
          ))}
        </div>
      )}
      <div className="reading-card__action"><ArrowUpRight size={16} aria-hidden="true" /><span>{reading.action}</span></div>
      {!compact && (
        <div className="advice-grid">
          <div className="advice-item"><BriefcaseBusiness size={16} aria-hidden="true" /><div><span>{reading.basis === "aspecto-pessoal" ? "Trabalho e prioridades" : "Reflexão geral para trabalho e prioridades"}</span><p>{reading.career}</p></div></div>
          <div className="advice-item"><Heart size={16} aria-hidden="true" /><div><span>{reading.basis === "aspecto-pessoal" ? "Relações e vínculos" : "Reflexão geral para relações e vínculos"}</span><p>{reading.relationships}</p></div></div>
        </div>
      )}
    </article>
  );
}
