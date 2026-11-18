import { ArrowRight, CalendarDays, Compass, Moon, Orbit, ShieldCheck, Sparkles, Sun } from "lucide-react";
import type { ReactNode } from "react";
import type { BirthProfile, NatalChart, PlanetPosition } from "../lib/types";
import { firstName, formatDegrees } from "../lib/formatters";
import {
  ASCENDENTE_GENERICO,
  getTextoAscendente,
  getTextoLua,
  getTextoSol,
} from "../lib/signos-textos";

type PillarKind = "sun" | "moon" | "ascendant";

type Props = {
  profile: BirthProfile;
  natal: NatalChart | null;
  onUnlock: () => void;
};

type SummaryTileProps = {
  kind: PillarKind;
  label: string;
  position: PlanetPosition | null | undefined;
  icon: ReactNode;
  unavailableLabel: string;
};

type ReadingCardProps = {
  kind: PillarKind;
  title: string;
  position: PlanetPosition | null | undefined;
  icon: ReactNode;
  interpretation: string | null;
  unavailableText: string;
};

function SummaryTile({ kind, label, position, icon, unavailableLabel }: SummaryTileProps) {
  return (
    <div className={`pillar-summary-tile pillar-summary-tile--${kind}`}>
      <span className="pillar-summary-tile__icon">{icon}</span>
      <span className="pillar-summary-tile__label">{label}</span>
      <strong>{position?.sign ?? "Sem confirmação"}</strong>
      <small>{position ? formatDegrees(position.degree) : unavailableLabel}</small>
    </div>
  );
}

function ReadingCard({
  kind,
  title,
  position,
  icon,
  interpretation,
  unavailableText,
}: ReadingCardProps) {
  return (
    <article className={`pillar-reading-card pillar-reading-card--${kind}`}>
      <div className="pillar-reading-card__heading">
        <span className="pillar-reading-card__icon">{icon}</span>
        <div>
          <span className="eyebrow">{kind === "sun" ? "ESSÊNCIA" : kind === "moon" ? "MUNDO EMOCIONAL" : "APRESENTAÇÃO AO MUNDO"}</span>
          <h3>{position ? `${title} em ${position.sign}` : title}</h3>
        </div>
        {position && <span className="pillar-reading-card__degree">{formatDegrees(position.degree)}</span>}
      </div>
      <p className="pillar-reading-card__text">{position ? interpretation : unavailableText}</p>
      {!position && <p className="pillar-reading-card__note">Deixamos este resultado em aberto para não apresentar como certo algo que depende de um dado não informado.</p>}
    </article>
  );
}

export function PillarsPreview({ profile, natal, onUnlock }: Props) {
  const sun = natal?.sun;
  const moon = natal?.moon;
  const ascendant = natal?.ascendant;
  const unknownTime = profile.birthTimeAccuracy === "unknown";
  const timeNote = unknownTime
    ? "Você informou que não sabe o horário. O aplicativo mostra o que pode calcular e deixa Lua e Ascendente sem confirmação, em vez de adivinhar."
    : profile.birthTimeAccuracy === "approximate"
      ? "Você informou um horário aproximado. Posições sensíveis à hora podem variar; considere esses resultados como estimativas."
      : "O horário e o local informados ajudam a calcular o Ascendente e a situar as posições do seu mapa.";

  const moonUnavailable = unknownTime
    ? "A Lua pode mudar de posição ao longo do dia. Sem o horário de nascimento, não exibimos um signo lunar como se estivesse confirmado."
    : "Não foi possível confirmar a posição da Lua com os dados disponíveis. Você poderá revisar o horário e o fuso no Perfil depois de liberar o acesso de teste.";

  const ascendantUnavailable = unknownTime
    ? `${ASCENDENTE_GENERICO.o_que_e} ${ASCENDENTE_GENERICO.motivo} Como o horário não foi informado, não mostramos um signo de Ascendente.`
    : "Não foi possível confirmar o Ascendente. Esse cálculo depende do horário e das coordenadas do local de nascimento; revise esses dados no Perfil depois de liberar o acesso de teste.";

  const sunInterpretation = sun
    ? getTextoSol(sun.sign)?.completo ?? `O Sol em ${sun.sign} representa sua essência, sua individualidade e a forma como busca propósito e realização.`
    : null;
  const moonInterpretation = moon ? getTextoLua(moon.sign)?.completo ?? null : null;
  const ascendantInterpretation = ascendant ? getTextoAscendente(ascendant.sign)?.completo ?? null : null;

  return (
    <section className="pillars-preview" aria-labelledby="pillars-title">
      <header className="page-intro pillars-intro">
        <span className="eyebrow">SEU MAPA PESSOAL</span>
        <h1 id="pillars-title">{firstName(profile.name, "você")}, seu universo tem muito a revelar.</h1>
        <p>Este é o começo do seu mapa: Sol, Lua e Ascendente, calculados neste aparelho a partir dos dados que você informou. Veja os resultados e a interpretação de cada posição.</p>
      </header>

      <div className="pillar-summary-grid" aria-label="Resumo dos três pilares">
        <SummaryTile kind="sun" label="Sol" position={sun} icon={<Sun size={18} aria-hidden="true" />} unavailableLabel="Não calculado" />
        <SummaryTile kind="moon" label="Lua" position={moon} icon={<Moon size={18} aria-hidden="true" />} unavailableLabel={unknownTime ? "Horário não informado" : "Não confirmado"} />
        <SummaryTile kind="ascendant" label="Ascendente" position={ascendant} icon={<Compass size={18} aria-hidden="true" />} unavailableLabel={unknownTime ? "Horário não informado" : "Não confirmado"} />
      </div>

      <div className={`pillars-time-note${unknownTime ? " pillars-time-note--unknown" : ""}`}>
        <span className="pillars-time-note__mark" aria-hidden="true">i</span>
        <p>{timeNote}</p>
      </div>

      <section className="pillars-readings" aria-label="Explicação dos três pilares">
        <ReadingCard
          kind="sun"
          title="Sol"
          position={sun}
          icon={<Sun size={18} aria-hidden="true" />}
          interpretation={sunInterpretation}
          unavailableText="Não foi possível apresentar uma posição solar com os dados informados."
        />
        <ReadingCard
          kind="moon"
          title="Lua"
          position={moon}
          icon={<Moon size={18} aria-hidden="true" />}
          interpretation={moonInterpretation}
          unavailableText={moonUnavailable}
        />
        <ReadingCard
          kind="ascendant"
          title="Ascendente"
          position={ascendant}
          icon={<Compass size={18} aria-hidden="true" />}
          interpretation={ascendantInterpretation}
          unavailableText={ascendantUnavailable}
        />
      </section>

      <section className="pillars-discover" aria-labelledby="pillars-discover-title">
        <div className="section-heading">
          <span className="eyebrow">CONTINUE SUA DESCOBERTA</span>
          <h2 id="pillars-discover-title">E essa é apenas uma parte do seu mapa.</h2>
          <p>Depois dos três pilares, você pode explorar outras áreas que já fazem parte do SEU-CEU.</p>
        </div>
        <div className="pillars-discover-grid">
          <article className="pillars-discover-item">
            <span className="pillars-discover-item__icon"><Sparkles size={18} aria-hidden="true" /></span>
            <h3>Seu céu de hoje</h3>
            <p>Veja a leitura do dia e os movimentos astrológicos em relação ao seu mapa.</p>
          </article>
          <article className="pillars-discover-item">
            <span className="pillars-discover-item__icon"><Orbit size={18} aria-hidden="true" /></span>
            <h3>Meu mapa</h3>
            <p>Explore outras posições e informações do seu mapa natal.</p>
          </article>
          <article className="pillars-discover-item">
            <span className="pillars-discover-item__icon"><CalendarDays size={18} aria-hidden="true" /></span>
            <h3>Semana</h3>
            <p>Acompanhe as leituras e os destaques astrológicos dos próximos dias.</p>
          </article>
        </div>
      </section>

      <aside className="pillars-access-card" aria-labelledby="test-access-title">
        <span className="eyebrow"><ShieldCheck size={14} aria-hidden="true" /> ACESSO GRATUITO DE TESTE</span>
        <h2 id="test-access-title">Sua jornada pelo SEU-CEU continua agora.</h2>
        <p>Explore seu mapa, acompanhe seu céu e conheça as outras áreas do aplicativo. Nesta fase de teste, o acesso é gratuito neste aparelho; ainda não há checkout nem cobrança.</p>
        <button className="button button--primary pillars-access-button" type="button" onClick={onUnlock}>
          Explorar meu SEU-CEU <ArrowRight size={17} aria-hidden="true" />
        </button>
        <small>Suas informações natais continuam armazenadas neste aparelho.</small>
      </aside>

      <p className="pillars-method-note">As interpretações são simbólicas e servem à reflexão pessoal; não são previsões garantidas nem orientação profissional.</p>
    </section>
  );
}
