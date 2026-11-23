import { Check, RefreshCw, Sparkles } from "lucide-react";
import { ReadingCard } from "./ReadingCard";
import { SectionHeading } from "./SectionHeading";
import { formatDateISO, planetName } from "../lib/ephemeris";
import { formatDegrees } from "../lib/formatters";
import type { DailyEphemeris, DailyReading } from "../lib/types";

type WeekPageProps = {
  days: DailyEphemeris[];
  readings: DailyReading[];
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

function readingForDate(readings: DailyReading[], date: string): DailyReading | null {
  return readings.find((reading) => reading.date === date) ?? null;
}

function dayStatus(reading: DailyReading | null): { label: string; className: string; description: string } {
  if (!reading || reading.aspects.length === 0) {
    return { label: "Reflexão geral", className: "week-day__status--general", description: "Nenhum aspecto pessoal maior calculado" };
  }
  const count = reading.aspects.length;
  return { label: `${count} ${count === 1 ? "aspecto pessoal" : "aspectos pessoais"}`, className: "week-day__status--personal", description: `${count} ${count === 1 ? "aspecto pessoal" : "aspectos pessoais"} calculado${count === 1 ? "" : "s"}` };
}

export function WeekPage({
  days,
  readings,
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
  const selectedStatus = dayStatus(selectedReading);
  const selectedDayLabel = selectedSky ? dayName(selectedSky.date) : "dia selecionado";

  return (
    <>
      <section className="page-intro page-intro--week">
        <span className="eyebrow">COMPARAÇÃO DA SEMANA</span>
        <h1>Sua semana, em perspectiva.</h1>
        <p>{shortRange} <span className="hero-dot">·</span> Escolha um dia para ver como os movimentos calculados se relacionam com o seu mapa.</p>
        <p className="week-calculated-at">Última leitura calculada {calculatedAt ? formatDateISO(calculatedAt.slice(0, 10), { day: "numeric", month: "short" }) : "—"}</p>
      </section>

      {days.length > 0 ? (
        <>
          <section className="week-overview" aria-label="Resumo dos estados da semana">
            <div className="week-overview__heading"><span className="eyebrow">VISÃO DOS SETE DIAS</span><p>Os marcadores mostram quando há cruzamento pessoal e quando a orientação é geral.</p></div>
            <div className="week-strip" role="tablist" aria-label="Dias da semana">
              {days.map((day) => {
                const status = dayStatus(readingForDate(readings, day.date));
                const isSelected = selectedDate === day.date;
                return (
                  <button
                    key={day.date}
                    role="tab"
                    aria-selected={isSelected}
                    aria-label={`${dayName(day.date)}, ${status.description}${day.date === todayISO ? ", hoje" : ""}`}
                    className={`week-day ${isSelected ? "is-active" : ""} ${day.date === todayISO ? "is-today" : ""}`}
                    onClick={() => onSelectDate(day.date)}
                  >
                    <span>{dayName(day.date, true).replace(".", "")}</span>
                    <strong>{Number(day.date.slice(-2))}</strong>
                    <small className={status.className}>{status.label}</small>
                    {day.date === todayISO && <i aria-label="Hoje" />}
                  </button>
                );
              })}
            </div>
            <div className="week-legend" aria-label="Legenda dos estados"><span><i className="week-legend__dot week-legend__dot--personal" />Aspecto pessoal</span><span><i className="week-legend__dot week-legend__dot--general" />Reflexão geral</span></div>
          </section>

          <section className="week-selected-status" aria-label="Estado do dia selecionado">
            <div><span className="eyebrow">DIA SELECIONADO</span><h2>{selectedDayLabel}</h2></div>
            <div className={`week-selected-status__badge ${selectedStatus.className}`}><strong>{selectedStatus.label}</strong><span>{selectedReading?.basis === "aspecto-pessoal" ? "O céu calculado forma um cruzamento com seu mapa." : "Nenhum aspecto pessoal maior foi calculado para este dia. A orientação parte do seu Sol."}</span></div>
          </section>

          {selectedReading && <section className="section-block"><SectionHeading eyebrow="SUA LEITURA DO DIA" title="Como atravessar este dia" /><ReadingCard reading={selectedReading} /></section>}
          {!selectedReading && <p className="empty-note">Não há leitura para esta data. Escolha outro dia da semana ou atualize os dados.</p>}
          {selectedSky && <SkyDetail day={selectedSky} />}
          {selectedSky && (
            <section className="week-prompt-section" aria-label="Aprofundar a leitura do dia">
              <div><span className="eyebrow">APROFUNDE ESTA LEITURA</span><p>Copie os dados deste dia para usar em uma IA de sua preferência.</p></div>
              <button className="button button--secondary" onClick={onCopyWeeklyPrompt}>
                {copiedPromptType === "week" ? <Check size={17} /> : <Sparkles size={17} color="#f0c674" />}
                {copiedPromptType === "week" ? "Prompt deste dia copiado" : "Copiar prompt deste dia"}
              </button>
            </section>
          )}
        </>
      ) : (
        <div className="week-empty" role="status"><RefreshCw size={18} aria-hidden="true" /><p>Estamos calculando sua semana. Os sete dias aparecerão aqui em instantes.</p></div>
      )}

      <section className="section-block week-explanation">
        <SectionHeading eyebrow="COMO LER" title="Um convite, não uma sentença" />
        <p>As posições e os ângulos são calculados no seu dispositivo. Os textos são regras simbólicas simples, não previsões garantidas. Quando não aparece um aspecto pessoal forte, preferimos dizer isso a inventar uma mensagem.</p>
        <p className="tiny-note">Os dias marcados como reflexão geral não estão sem conteúdo: apenas não possuem um cruzamento pessoal maior segundo as regras atuais. A Lua muda rapidamente. Com horário de nascimento desconhecido, ela fica de fora do cruzamento natal.</p>
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
          <span className="eyebrow">MOVIMENTOS GERAIS DO CÉU</span>
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
              <small>Orbe calculado: {formatDegrees(aspect.orb)}</small>
            </span>
          </div>
        )) : <p className="empty-note">Nenhum aspecto maior próximo segundo os orbes desta versão.</p>}
      </div>
      <div className="retrograde-row">
        <RefreshCw size={15} />
        <span>
          <strong>Retrógrados</strong>
          <small>{retrogrades.length ? retrogrades.join(", ") : "Nenhum detectado hoje"}</small>
        </span>
      </div>
      <p className="sky-detail__note">Estes são movimentos gerais do céu. A leitura acima mostra quando eles foram relacionados ao seu mapa natal.</p>
    </section>
  );
}
