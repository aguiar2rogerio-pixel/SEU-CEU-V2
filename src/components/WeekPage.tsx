import { Check, RefreshCw, Sparkles } from "lucide-react";
import { ReadingCard } from "./ReadingCard";
import { SectionHeading } from "./SectionHeading";
import { formatDateISO, planetName } from "../lib/ephemeris";
import { formatDegrees } from "../lib/formatters";
import type { DailyEphemeris, DailyReading } from "../lib/types";

type WeekPageProps = {
  days: DailyEphemeris[];
  shortRange: string;
  calculatedAt: string | null;
  todayISO: string;
  selectedDate: string;
  selectedReading: DailyReading | null;
  selectedSky: DailyEphemeris | null;
  copiedPromptType: string | null;
  onSelectDate: (date: string) => void;
  onCopyWeeklyPrompt: () => void;
};

function dayName(isoDate: string, short = false): string {
  return formatDateISO(isoDate, { weekday: short ? "short" : "long" });
}

export function WeekPage({
  days,
  shortRange,
  calculatedAt,
  todayISO,
  selectedDate,
  selectedReading,
  selectedSky,
  copiedPromptType,
  onSelectDate,
  onCopyWeeklyPrompt,
}: WeekPageProps) {
  return (
    <>
      <section className="page-intro page-intro--week">
        <span className="eyebrow">SEGUNDA A DOMINGO</span>
        <h1>Sua semana, em perspectiva.</h1>
        <p>{shortRange} <span className="hero-dot">·</span> última leitura calculada {calculatedAt ? formatDateISO(calculatedAt.slice(0, 10), { day: "numeric", month: "short" }) : "—"}</p>
      </section>
      <div className="week-strip" role="tablist" aria-label="Dias da semana">
        {days.map((day) => (
          <button
            key={day.date}
            role="tab"
            aria-selected={selectedDate === day.date}
            className={`week-day ${selectedDate === day.date ? "is-active" : ""} ${day.date === todayISO ? "is-today" : ""}`}
            onClick={() => onSelectDate(day.date)}
          >
            <span>{dayName(day.date, true).replace(".", "")}</span>
            <strong>{Number(day.date.slice(-2))}</strong>
            {day.date === todayISO && <i aria-label="Hoje" />}
          </button>
        ))}
      </div>
      {selectedReading && <ReadingCard reading={selectedReading} />}
      {selectedSky && <SkyDetail day={selectedSky} />}

      {selectedSky && (
        <div style={{ margin: "1.5rem 0", textAlign: "center" }}>
          <button
            className="button button--secondary"
            style={{ width: "100%", justifyContent: "center", gap: "0.5rem" }}
            onClick={onCopyWeeklyPrompt}
          >
            {copiedPromptType === "week" ? <Check size={17} /> : <Sparkles size={17} color="#f0c674" />}
            {copiedPromptType === "week" ? "Prompt do Dia Copiado!" : "Gerar Prompt deste Dia para IA"}
          </button>
        </div>
      )}

      <section className="section-block week-explanation">
        <SectionHeading eyebrow="COMO LER" title="Um convite, não uma sentença" />
        <p>As posições e os ângulos são calculados no seu dispositivo. Os textos são regras simbólicas simples, não previsões garantidas. Quando não aparece um aspecto pessoal forte, preferimos dizer isso a inventar uma mensagem.</p>
        <p className="tiny-note">A Lua muda rapidamente. Com horário de nascimento desconhecido, ela fica de fora do cruzamento natal; o horário de referência dos demais planetas aparece como aproximado.</p>
      </section>
    </>
  );
}

function SkyDetail({ day }: { day: DailyEphemeris }) {
  const aspects = day.globalAspects.slice(0, 4);
  const retrogrades = day.retrogrades.map((id) => planetName(id));

  return (
    <section className="sky-detail">
      <div className="sky-detail__header">
        <div>
          <span className="eyebrow">CÉU COMPARTILHADO</span>
          <h2>{dayName(day.date)} em movimento</h2>
        </div>
        <span className="sky-detail__date">{formatDateISO(day.date, { day: "numeric", month: "short" })}</span>
      </div>
      <div className="event-list">
        {aspects.length ? aspects.map((aspect) => (
          <div className="event-row" key={`${aspect.firstPlanet}-${aspect.secondPlanet}-${aspect.type}`}>
            <Sparkles size={15} />
            <span>
              <strong>{planetName(aspect.firstPlanet)} {aspect.type} {planetName(aspect.secondPlanet)}</strong>
              <small>Orbe calculated: {formatDegrees(aspect.orb)}</small>
            </span>
          </div>
        )) : <p className="empty-note">Nenhum aspecto maior próximo segundo os orbes deste MVP.</p>}
      </div>
      <div className="retrograde-row">
        <RefreshCw size={15} />
        <span>
          <strong>Retrógrados</strong>
          <small>{retrogrades.length ? retrogrades.join(", ") : "Nenhum detectado hoje"}</small>
        </span>
      </div>
    </section>
  );
}
