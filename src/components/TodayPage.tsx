import type { ReactNode } from "react";
import { CalendarDays, ChevronRight, Moon, Orbit, RefreshCw, Sparkles, Sun } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { formatDateISO, planetName } from "../lib/ephemeris";
import { firstName, formatDegrees } from "../lib/formatters";
import { getReadingBasisLabel, weeklyLead } from "../lib/readings";
import type { BirthProfile, DailyEphemeris, DailyReading, WeeklyBundle } from "../lib/types";

type TodayPageProps = {
  profile: BirthProfile;
  bundle: WeeklyBundle | null;
  todayISO: string;
  shortRange: string;
  todayReading: DailyReading | null;
  isRecalculating: boolean;
  onRecalculate: () => void;
  onShowWeek: () => void;
  onShowMap: () => void;
};

export function TodayPage({
  profile,
  bundle,
  todayISO,
  shortRange,
  todayReading,
  isRecalculating,
  onRecalculate,
  onShowWeek,
  onShowMap,
}: TodayPageProps) {
  const todaySky = bundle?.days.find((day) => day.date === todayISO) ?? null;
  const todayLabel = formatDateISO(todayISO, { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <section className="greeting-block">
        <div>
          <span className="eyebrow">HOJE · {todayLabel.toUpperCase()}</span>
          <h1>Olá, {firstName(profile.name)}<span className="greeting-period">.</span></h1>
          <p>Seu céu de hoje, dentro da semana de {shortRange}</p>
        </div>
        <button className="icon-button" aria-label="Recalcular mapa e semana" title="Recalcular mapa e semana" onClick={onRecalculate} disabled={isRecalculating}>
          <RefreshCw className={isRecalculating ? "spin" : ""} size={18} />
        </button>
      </section>

      <DailyHero reading={todayReading} todayLabel={todayLabel} onShowWeek={onShowWeek} />

      <section className="section-block">
        <SectionHeading eyebrow="MOVIMENTOS DE HOJE" title="O que está acontecendo no céu" />
        <p className="sky-period"><CalendarDays size={14} aria-hidden="true" /> Aspectos gerais e retrogradações de {todayLabel}</p>
        <TodaySkySummary day={todaySky} />
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="CONTEXTO DA SEMANA" title="O céu mais amplo" />
        <div className="weekly-context-card">
          <span className="eyebrow eyebrow--gold"><Sparkles size={13} aria-hidden="true" /> SEU DESTAQUE DA SEMANA</span>
          <p>{bundle ? weeklyLead(bundle.natal, bundle.days) : "Seu céu está sendo preparado."}</p>
          <div className="weekly-context-card__meta">{shortRange} <span className="hero-dot">·</span> calculado {bundle ? formatDateISO(bundle.calculatedAt.slice(0, 10), { day: "numeric", month: "short" }) : "agora"}</div>
          <button className="button button--secondary" onClick={onShowWeek}>Ver minha semana <ChevronRight size={17} aria-hidden="true" /></button>
        </div>
      </section>

      <section className="section-block sky-section">
        <SectionHeading eyebrow="MOVIMENTOS DA SEMANA" title="O céu em movimento" />
        <p className="sky-period"><CalendarDays size={14} aria-hidden="true" /> Eventos e aspectos de {shortRange}</p>
        <SkySummary days={bundle?.days ?? []} />
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <SectionHeading eyebrow="DO SEU MAPA" title="Três referências" />
          <button className="text-link" onClick={onShowMap}>Ver meu mapa <ChevronRight size={15} /></button>
        </div>
        <div className="sign-summary sign-summary--compact">
          <SignTile label="Sol" position={bundle?.natal.sun ?? null} icon={<Sun size={17} />} />
          <SignTile label="Lua" position={bundle?.natal.moon ?? null} icon={<Moon size={17} />} />
          <SignTile label="Ascendente" position={bundle?.natal.ascendant ?? null} icon={<Orbit size={17} />} />
        </div>
        <p className="tiny-note">O Ascendente é calculado com base na data, hora e coordenadas geográficas informadas.</p>
      </section>
    </>
  );
}

function DailyHero({ reading, todayLabel, onShowWeek }: { reading: DailyReading | null; todayLabel: string; onShowWeek: () => void }) {
  return (
    <section className="hero-reading hero-reading--daily">
      <div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" />
      <div className="hero-stars"><span /><span /><span /></div>
      <div className="hero-reading__content">
        <span className="eyebrow eyebrow--gold"><Sparkles size={13} aria-hidden="true" /> {reading ? getReadingBasisLabel(reading).toUpperCase() : "SEU PONTO DE ATENÇÃO HOJE"}</span>
        <h2>{reading?.title ?? "Seu céu está sendo preparado"}</h2>
        <p className="hero-reading__date">{todayLabel} <span className="hero-dot">·</span> uma orientação para o seu dia</p>
        {reading && <p className="hero-reading__summary">{reading.summary}</p>}
        {reading && reading.aspects.length > 0 && <div className="aspect-pills">{reading.aspects.slice(0, 2).map((aspect) => <span className="aspect-pill" key={`${aspect.transitPlanet}-${aspect.natalPlanet}-${aspect.type}`}>{planetName(aspect.transitPlanet)} {aspect.type} seu {planetName(aspect.natalPlanet)}</span>)}</div>}
        {reading && <div className="hero-reading__action"><span>{reading.action}</span></div>}
        <button className="button button--primary hero-reading__cta" onClick={onShowWeek}>
          Ver minha semana <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="hero-moon" aria-hidden="true"><span /></div>
    </section>
  );
}

function SignTile({ label, position, icon }: { label: string; position: { sign: string; degree: number } | null; icon: ReactNode }) {
  return <div className={`sign-tile ${position ? "" : "sign-tile--muted"}`}><span className="sign-tile__icon">{icon}</span><span className="sign-tile__label">{label}</span><strong>{position?.sign ?? "Sem dado"}</strong><small>{position ? formatDegrees(position.degree) : "Horário desconhecido"}</small></div>;
}

function TodaySkySummary({ day }: { day: DailyEphemeris | null }) {
  if (!day) return <p className="empty-note">Os movimentos de hoje ainda estão sendo calculados. Recalcule o mapa e a semana para atualizar.</p>;
  const retrograde = day.retrogrades;
  const aspects = day.globalAspects.slice(0, 3);
  return (
    <div className="sky-summary sky-summary--today">
      <div className="sky-summary__row"><span className="sky-icon"><Orbit size={17} /></span><div><strong>Aspectos gerais de hoje</strong><p>{aspects.length ? aspects.map((aspect) => `${planetName(aspect.firstPlanet)} + ${planetName(aspect.secondPlanet)}`).join(" · ") : "Nenhum aspecto maior de destaque nas regras desta versão."}</p></div></div>
      <div className="sky-summary__row"><span className="sky-icon"><Sparkles size={17} /></span><div><strong>Planetas retrógrados hoje</strong><p>{retrograde.length ? retrograde.map((id) => planetName(id)).join(", ") : "Nenhum planeta retrógrado hoje."}</p></div></div>
      <p className="tiny-note">Esses são movimentos gerais do céu. A leitura acima mostra como o dia foi relacionado ao seu mapa.</p>
    </div>
  );
}

function SkySummary({ days }: { days: DailyEphemeris[] }) {
  const retrograde = [...new Set(days.flatMap((day) => day.retrogrades))];
  const conjunctions = days.flatMap((day) => day.globalAspects.filter((aspect) => aspect.type === "conjunção"));
  return (
    <div className="sky-summary">
      <div className="sky-summary__row"><span className="sky-icon"><Orbit size={17} /></span><div><strong>Movimentos retrógrados detectados</strong><p>{retrograde.length ? retrograde.map((id) => planetName(id)).join(", ") : "Nenhum planeta retrógrado na semana calculada."}</p></div></div>
      <div className="sky-summary__row"><span className="sky-icon"><Sparkles size={17} /></span><div><strong>Conjunções mais próximas</strong><p>{conjunctions.length ? conjunctions.slice(0, 3).map((aspect) => `${planetName(aspect.firstPlanet)} + ${planetName(aspect.secondPlanet)}`).join(" · ") : "Nenhuma conjunção dentro do orbe usado nesta versão."}</p></div></div>
      <p className="tiny-note">As datas e aspectos são calculados no dispositivo. Um movimento retrógrado é uma aparência geocêntrica, não uma inversão física da órbita.</p>
    </div>
  );
}
