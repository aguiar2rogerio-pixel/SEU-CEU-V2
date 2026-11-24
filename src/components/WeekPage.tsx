import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { formatDateISO, planetName } from "../lib/ephemeris";
import { formatDegrees } from "../lib/formatters";
import { getMoonPhaseInfo, getMoonWeekLead } from "../lib/moon-phases";
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

function selectedPromptLabel(selectedDate: string, todayISO: string, copied: boolean): string {
  if (copied) return selectedDate === todayISO ? "Prompt para leitura de hoje copiado" : `Prompt para leitura de ${formatDateISO(selectedDate, { day: "2-digit", month: "2-digit" })} copiado`;
  return selectedDate === todayISO ? "Prompt para leitura de hoje" : `Prompt para leitura de ${formatDateISO(selectedDate, { day: "2-digit", month: "2-digit" })}`;
}

export function WeekPage({
  days,
  shortRange,
  calculatedAt,
  todayISO,
  selectedDate,
  selectedSky,
  copiedPromptType,
  onSelectDate,
  onCopyWeeklyPrompt,
}: WeekPageProps) {
  const selectedMoon = selectedSky ? getMoonPhaseInfo(selectedSky) : null;
  const weekLead = getMoonWeekLead(days);
  const copied = copiedPromptType === "week";

  return (
    <>
      <section className="page-intro page-intro--week">
        <span className="eyebrow">ACOMPANHAMENTO DA LUA</span>
        <h1>Sua semana, em perspectiva.</h1>
        <p>{shortRange} <span className="hero-dot">·</span> Acompanhe a Lua, a lunação e os movimentos do céu a cada dia.</p>
        <p className="week-calculated-at">Última leitura calculada {calculatedAt ? formatDateISO(calculatedAt.slice(0, 10), { day: "numeric", month: "short" }) : "—"}</p>
      </section>
      {days.length > 0 ? (
        <>
          <section className="week-overview" aria-label="Resumo lunar dos sete dias">
            <div className="week-overview__heading">
              <div><span className="eyebrow">A LUA NESTA SEMANA</span><p>{weekLead}</p></div>
              <span className="week-overview__hint">Escolha um dia para acompanhar sua passagem.</span>
            </div>
            <div className="week-strip" role="tablist" aria-label="Dias da semana">
              {days.map((day) => {
                const moon = getMoonPhaseInfo(day);
                const isSelected = selectedDate === day.date;
                return (
                  <button
                    key={day.date}
                    role="tab"
                    aria-selected={isSelected}
                    aria-label={`${dayName(day.date)}, ${moon.label}${day.date === todayISO ? ", hoje" : ""}`}
                    className={`week-day ${isSelected ? "is-active" : ""} ${day.date === todayISO ? "is-today" : ""}`}
                    onClick={() => onSelectDate(day.date)}
                  >
                    <span>{dayName(day.date, true).replace(".", "")}</span>
                    <strong>{Number(day.date.slice(-2))}</strong>
                    <small className="week-day__moon-phase">{moon.name.replace("Lua ", "")}</small>
                    <small className="week-day__moon-sign">{moon.sign}</small>
                    {day.date === todayISO && <i aria-label="Hoje" />}
                  </button>
                );
              })}
            </div>
            <div className="week-legend" aria-label="Legenda da seleção"><span><i className="week-legend__dot week-legend__dot--personal" />Dia selecionado</span><span><i className="week-legend__dot week-legend__dot--general" />Lua e céu geral</span></div>
          </section>

          {selectedSky && selectedMoon ? (
            <>
              <section className="moon-day-card" aria-label="Lua do dia selecionado">
                <div className="moon-day-card__orb" aria-hidden="true"><span /></div>
                <div className="moon-day-card__content">
                  <span className="eyebrow eyebrow--gold"><Sparkles size={14} aria-hidden="true" /> LUA DO DIA</span>
                  <h2>{selectedMoon.name}</h2>
                  <strong className="moon-day-card__sign">em {selectedMoon.sign}</strong>
                  <p className="moon-day-card__lunation">{selectedMoon.lunationLabel}</p>
                  <p className="moon-day-card__reading">{selectedMoon.reading}</p>
                  <p className="moon-day-card__date">{dayName(selectedSky.date)} · {formatDateISO(selectedSky.date, { day: "numeric", month: "long" })}</p>
                </div>
              </section>

              <SkyDetail day={selectedSky} />

              <section className="week-prompt-section" aria-label="Prompt da leitura do dia">
                <div><span className="eyebrow">APROFUNDE O DIA SELECIONADO</span><p>Leve a Lua, a lunação e os movimentos deste dia para uma IA de sua preferência.</p></div>
                <button className="button button--secondary" onClick={onCopyWeeklyPrompt}>
                  {copied ? <Check size={17} /> : <Copy size={17} color="#f0c674" />}
                  {selectedPromptLabel(selectedSky.date, todayISO, copied)}
                </button>
              </section>
            </>
          ) : (
            <p className="empty-note">Não há dados para esta data. Escolha outro dia da semana ou atualize os dados.</p>
          )}
        </>
      ) : (
        <div className="week-empty" role="status"><RefreshCw size={18} aria-hidden="true" /><p>Estamos calculando sua semana. Os sete dias aparecerão aqui em instantes.</p></div>
      )}
      <section className="section-block week-explanation">
        <SectionHeading eyebrow="COMO LER" title="Um convite, não uma sentença" />
        <p>A fase e o signo da Lua mostram o movimento geral do ciclo. Os textos são convites simbólicos para reflexão, não previsões garantidas. Os movimentos do céu são calculados no seu dispositivo.</p>
        <p className="tiny-note">A Lua muda de signo a cada dois ou três dias. A lunação começa na Lua Nova e continua enquanto a Lua avança pelas fases seguintes.</p>
      </section>
    </>
  );
}

function SkyDetail({ day }: { day: DailyEphemeris }) {
  const aspects = day.globalAspects.slice(0, 4);
  const retrogrades = day.retrogrades.map((id) => planetName(id));
  return (
    <section className="sky-detail" aria-label="Movimentos gerais do céu">
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
            <span><strong>{planetName(aspect.firstPlanet)} {aspect.type} {planetName(aspect.secondPlanet)}</strong><small>Orbe calculado: {formatDegrees(aspect.orb)}</small></span>
          </div>
        )) : <p className="empty-note">Nenhum aspecto maior próximo segundo os orbes desta versão.</p>}
      </div>
      <div className="retrograde-row">
        <RefreshCw size={15} />
        <span><strong>Retrógrados</strong><small>{retrogrades.length ? retrogrades.join(", ") : "Nenhum detectado hoje"}</small></span>
      </div>
      <p className="sky-detail__note">Estes são movimentos gerais do céu. A Lua do dia aparece acima como o fio condutor da semana.</p>
    </section>
  );
}
