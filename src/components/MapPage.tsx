import { useMemo } from "react";
import { BookOpen, ChevronDown, CircleDot, Moon, Orbit, Radar as RadarIcon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import type { ReadingExperienceId } from "./ReadingExperiencePage";
import { PLANETS, planetName } from "../lib/ephemeris";
import { formatDegreesMinutes } from "../lib/formatters";
import { calculateProfilePlacidus } from "../lib/houses/profile-placidus";
import type { BirthProfile, ComplementaryPointId, ComplementaryPointPosition, NatalAngle, PlanetPosition, WeeklyBundle } from "../lib/types";

export type MapPanelId = "planets" | "angles" | "points" | "houses" | "radar" | "readings";

type MapPageProps = {
  profile: BirthProfile;
  natal: WeeklyBundle["natal"] | null;
  isPrimary: boolean;
  birthTimeLabel: string;
  openPanels: MapPanelId[];
  onTogglePanel: (panel: MapPanelId) => void;
  onOpenRadar: () => void;
  onOpenExperience: (experience: ReadingExperienceId) => void;
};

const COMPLEMENTARY_POINT_LABELS: { id: ComplementaryPointId; name: string; detail: string }[] = [
  { id: "northNode", name: "Nodo Norte", detail: "Direção de crescimento" },
  { id: "southNode", name: "Nodo Sul", detail: "Padrões já conhecidos" },
  { id: "lilith", name: "Lilith", detail: "Autonomia e desejos" },
  { id: "chiron", name: "Quíron", detail: "Feridas e integração" },
  { id: "partOfFortune", name: "Parte da Fortuna", detail: "Fluxo e vitalidade" },
  { id: "vertex", name: "Vértice", detail: "Encontros marcantes" },
];

const ANGLES: { id: keyof NonNullable<WeeklyBundle["natal"]["angles"]>; name: string; short: string; detail: string }[] = [
  { id: "ascendant", name: "Ascendente", short: "ASC", detail: "Como você chega ao mundo" },
  { id: "descendant", name: "Descendente", short: "DSC", detail: "Encontros e parcerias" },
  { id: "midheaven", name: "Meio do Céu", short: "MC", detail: "Vocação e direção pública" },
  { id: "imumCoeli", name: "Fundo do Céu", short: "IC", detail: "Raízes e intimidade" },
];

const PANEL_META: Record<MapPanelId, { eyebrow: string; title: string; summary: string }> = {
  planets: { eyebrow: "OS DEZ PLANETAS", title: "A assinatura do seu céu", summary: "Sol, Lua e planetas que formam sua identidade astrológica." },
  angles: { eyebrow: "EIXOS DO MAPA", title: "Ângulos do seu mapa", summary: "Os quatro pontos que organizam sua experiência no mundo." },
  points: { eyebrow: "PONTOS COMPLEMENTARES", title: "Outras chaves de leitura", summary: "Nodos, Lilith, Quíron, Fortuna e Vértice como camadas adicionais." },
  houses: { eyebrow: "SISTEMA PLACIDUS", title: "As 12 casas", summary: "Áreas da vida, cúspides e planetas posicionados em cada casa." },
  radar: { eyebrow: "ORIENTAÇÃO PERSONALIZADA", title: "Radar Astrológico", summary: "Descubra quais signos do seu mapa merecem mais atenção nas previsões." },
  readings: { eyebrow: "LEITURAS PERSONALIZADAS", title: "Escolha por onde se aprofundar", summary: "Três experiências para interpretar seu mapa, seu momento e outras dimensões pessoais." },
};

function minuteFromLongitude(longitude: number): number {
  const degreesWithinSign = ((longitude % 30) + 30) % 30;
  return Math.floor((degreesWithinSign - Math.floor(degreesWithinSign)) * 60);
}

function minuteFromPosition(position: PlanetPosition): number {
  return minuteFromLongitude(position.longitude);
}

function positionLabel(position: { degree: number; minute?: number | null }): string {
  const minute = position.minute ?? Math.floor((position.degree - Math.floor(position.degree)) * 60);
  return formatDegreesMinutes(position.degree, minute);
}

function pointMotionLabel(position: ComplementaryPointPosition): string | null {
  if (position.motion === "retrograde") return "Retrógrado";
  if (position.motion === "stationary") return "Estacionário";
  if (position.motion === "direct") return "Direto";
  return null;
}

function PlanetIcon({ id }: { id: string }) {
  if (id === "sun") return <Sun size={19} aria-hidden="true" />;
  if (id === "moon") return <Moon size={19} aria-hidden="true" />;
  return <Orbit size={18} aria-hidden="true" />;
}

function MapPanel({ id, open, onToggle, children }: { id: MapPanelId; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const meta = PANEL_META[id];
  const contentId = `map-panel-content-${id}`;
  return <section className={`map-panel section-block${open ? " map-panel--open" : ""}`} aria-labelledby={`map-panel-heading-${id}`}>
    <button className="map-panel__trigger" type="button" aria-expanded={open} aria-controls={contentId} onClick={onToggle}>
      <span className="map-panel__copy"><span className="eyebrow">{meta.eyebrow}</span><strong id={`map-panel-heading-${id}`}>{meta.title}</strong><small>{meta.summary}</small></span>
      <ChevronDown className="map-panel__chevron" size={20} aria-hidden="true" />
    </button>
    {open && <div className="map-panel__content" id={contentId}>{children}</div>}
  </section>;
}

export function MapPage({ profile, natal, isPrimary, birthTimeLabel, openPanels, onTogglePanel, onOpenRadar, onOpenExperience }: MapPageProps) {
  const placidus = useMemo(() => calculateProfilePlacidus(profile, natal), [profile, natal]);
  const complementaryPositions = natal?.complementaryPoints ?? null;
  const angles = natal?.angles ?? null;
  const isOpen = (panel: MapPanelId) => openPanels.includes(panel);

  return (
    <>
      <section className="page-intro">
        <span className="eyebrow">SEU MAPA NATAL</span>
        <h1>O seu ponto de partida.</h1>
        <p>{isPrimary ? "Uma visão organizada das posições calculadas a partir dos dados que você informou." : "Uma consulta natal independente. Este mapa adicional não altera Hoje ou Semana."}</p>
      </section>
      <div className="map-meta-card"><div><span>HORÁRIO</span><strong>{birthTimeLabel}</strong></div><div><span>LOCAL</span><strong>{profile.birthPlace || "Não informado"}</strong></div><div><span>FUSO</span><strong>{profile.birthTimezone}</strong></div></div>
      {profile.birthTimeAccuracy === "unknown" && <div className="inline-notice">Sem horário de nascimento, a Lua natal, o Ascendente, os ângulos e as casas ficam sem confirmação.</div>}

      <MapPanel id="planets" open={isOpen("planets")} onToggle={() => onTogglePanel("planets")}>
        <div className="planet-card-grid">{PLANETS.map((planet) => { const position = natal?.[planet.id] ?? null; return <article className={`planet-card${!position ? " planet-card--unknown" : ""}`} key={planet.id}><div className="planet-card__icon"><PlanetIcon id={planet.id} /></div><div className="planet-card__body"><span className="planet-card__label">{planetName(planet.id)}</span>{position ? <><strong>{position.sign}</strong><span>{formatDegreesMinutes(position.degree, minuteFromPosition(position))}</span></> : <small>Indisponível sem horário confirmado</small>}</div>{position?.retrograde && <span className="planet-card__retrograde">R</span>}</article>; })}</div>
        <div className="explain-card"><ShieldCheck size={17} aria-hidden="true" /><p>Os graus vêm do cálculo local do aplicativo. O marcador R identifica um movimento retrógrado no momento do nascimento.</p></div>
      </MapPanel>

      <MapPanel id="angles" open={isOpen("angles")} onToggle={() => onTogglePanel("angles")}>
        <div className="angle-card-grid">{ANGLES.map((angle) => { const position = angles?.[angle.id] as NatalAngle | undefined; return <article className={`angle-card${!position ? " angle-card--unknown" : ""}`} key={angle.id}><div className="angle-card__topline"><span>{angle.short}</span><Orbit size={16} aria-hidden="true" /></div><strong>{angle.name}</strong>{position ? <><span className="angle-card__sign">{position.sign}</span><span className="angle-card__degree">{positionLabel(position)}</span></> : <small>Horário necessário</small>}<p>{angle.detail}</p></article>; })}</div>
      </MapPanel>

      <MapPanel id="points" open={isOpen("points")} onToggle={() => onTogglePanel("points")}>
        <p className="complementary-points-intro">Pontos calculados pelo motor ampliado, apresentados com casa e movimento quando disponíveis.</p>
        {!natal?.natalExtensionsVersion || !complementaryPositions ? <p className="complementary-points-loading" role="status">Calculando os pontos complementares…</p> : <div className="complementary-card-grid">{COMPLEMENTARY_POINT_LABELS.map((point) => { const position = complementaryPositions[point.id] ?? null; const available = Boolean(position && position.sign && position.degree !== null && position.minute !== null); return <article className={`complementary-card${!available ? " complementary-card--unknown" : ""}`} key={point.id}><div className="complementary-card__topline"><span>{point.name}</span><CircleDot size={15} aria-hidden="true" /></div><p>{point.detail}</p>{available && position ? <><strong>{position.sign}</strong><span className="complementary-card__degree">{formatDegreesMinutes(position.degree!, position.minute!)}</span><div className="complementary-card__meta"><span>Casa {position.house ?? "—"}</span>{pointMotionLabel(position) && <span>{pointMotionLabel(position)}</span>}</div></> : <small>{position?.reason ?? "Sem posição disponível"}</small>}</article>; })}</div>}
      </MapPanel>

      <MapPanel id="houses" open={isOpen("houses")} onToggle={() => onTogglePanel("houses")}>
        {placidus.status === "unavailable" ? <div className="house-unavailable" role="status"><ShieldCheck size={18} aria-hidden="true" /><div><strong>Casas não disponíveis</strong><p>{placidus.message}</p></div></div> : <>
          {placidus.status === "estimated" && placidus.message && <div className="inline-notice inline-notice--warm house-estimate" role="note">{placidus.message} As cúspides e as casas dos planetas podem variar se o horário real for diferente.</div>}
          <div className="house-grid" aria-label="Cúspides e planetas por casa">{placidus.cusps.map((cusp) => { const occupants = PLANETS.filter((planet) => placidus.planetHouses[planet.id] === cusp.house); const angleLabel = cusp.house === 1 ? "Ascendente" : cusp.house === 4 ? "Fundo do Céu · IC" : cusp.house === 7 ? "Descendente" : cusp.house === 10 ? "Meio do Céu · MC" : null; return <article className="house-card" key={cusp.house} aria-label={`Casa ${cusp.house}`}><div className="house-card__topline"><span>CASA {cusp.house}</span>{angleLabel && <span className="house-card__angle">{angleLabel}</span>}</div><div className="house-card__cusp"><strong>{cusp.sign}</strong><span>{formatDegreesMinutes(cusp.degree, minuteFromLongitude(cusp.longitude))}</span></div><div className="house-card__occupants"><span className="house-card__caption">PLANETAS NESTA CASA</span>{natal ? occupants.length > 0 ? <div className="house-planet-list">{occupants.map((planet) => { const position = natal[planet.id]; return <span className="house-planet-chip" key={planet.id}><strong>{planetName(planet.id)}</strong>{position && <small>{position.sign} · {formatDegreesMinutes(position.degree, minuteFromPosition(position))}</small>}</span>; })}</div> : <p className="house-card__empty">Nenhum planeta nesta casa</p> : <p className="house-card__empty">Posições planetárias indisponíveis</p>}</div></article>; })}</div>
          <p className="house-method-note">A cúspide indica o início de cada casa. A posição dos planetas usa as longitudes já calculadas pelo aplicativo, sem recalcular os planetas.</p>
        </>}
      </MapPanel>

      <MapPanel id="radar" open={isOpen("radar")} onToggle={() => onTogglePanel("radar")}>
        <div className="map-panel-feature"><RadarIcon size={22} aria-hidden="true" /><p>O Radar classifica os signos mais relevantes do seu mapa para orientar quais previsões acompanhar, sem transformar essa orientação em regra absoluta.</p></div>
        <button className="button button--secondary map-panel__action" onClick={onOpenRadar}><RadarIcon size={17} aria-hidden="true" /> Abrir Radar Astrológico</button>
      </MapPanel>

      {isPrimary ? <MapPanel id="readings" open={isOpen("readings")} onToggle={() => onTogglePanel("readings")}>
        <div className="interpretation-choice-grid"><button className="interpretation-choice" onClick={() => onOpenExperience("natal")}><Sparkles size={18} /><span><strong>Meu Mapa Natal</strong><small>Uma leitura integrada e permanente do seu mapa.</small></span><BookOpen size={16} /></button><button className="interpretation-choice" onClick={() => onOpenExperience("current")}><Orbit size={18} /><span><strong>Meu Momento Atual</strong><small>Trânsitos e ciclos em relação ao seu mapa.</small></span><BookOpen size={16} /></button><button className="interpretation-choice" onClick={() => onOpenExperience("yearly")}><Sun size={18} /><span><strong>Meu Mapa em Profundidade</strong><small>Explore uma pergunta específica do seu mapa natal.</small></span><BookOpen size={16} /></button></div>
      </MapPanel> : <div className="inline-notice map-additional-notice">Este mapa adicional oferece consulta natal e sua interpretação natal salva. Hoje, Semana e as leituras do mapa principal continuam vinculadas ao mapa principal.</div>}
    </>
  );
}
