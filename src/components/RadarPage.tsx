import { ChevronLeft, CircleDot, Radar as RadarIcon, Sparkles } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { calculateAstrologicalRadar } from "../lib/astrological-radar";
import type { NatalChart } from "../lib/types";

type RadarPageProps = {
  natal: NatalChart | null;
  onBack: () => void;
};

export function RadarPage({ natal, onBack }: RadarPageProps) {
  const results = calculateAstrologicalRadar(natal);
  const hasHighlights = results.some((result) => result.score > 0);

  return (
    <>
      <button className="reading-back" onClick={onBack}><ChevronLeft size={17} aria-hidden="true" /> Voltar para meu mapa</button>
      <section className="page-intro reading-experience-intro">
        <span className="eyebrow"><RadarIcon size={14} aria-hidden="true" /> RADAR ASTROLÓGICO</span>
        <h1>Onde seu céu pede atenção.</h1>
        <p>Uma orientação personalizada para escolher quais signos acompanhar nas suas previsões.</p>
      </section>

      <section className="radar-explanation-card">
        <SectionHeading eyebrow="COMO LER" title="Relevância não é destino" />
        <p>O Radar combina os pesos das posições do seu mapa, a concentração de planetas e algumas camadas complementares. Ele é uma orientação prática para acompanhar o céu, não uma regra astrológica absoluta.</p>
        <div className="radar-method-note"><Sparkles size={16} aria-hidden="true" /><span>Sol, Lua e Ascendente têm maior peso; Mercúrio, Vênus e Marte recebem peso elevado; Júpiter e Saturno, peso intermediário; Urano, Netuno e Plutão entram como complementares.</span></div>
      </section>

      <section className="section-block radar-results" aria-label="Relevância dos doze signos">
        <SectionHeading eyebrow="DOZE SIGNOS" title="Seu mapa em perspectiva" />
        {!hasHighlights && <div className="radar-empty"><CircleDot size={18} aria-hidden="true" /><p>As posições do mapa ainda não estão disponíveis para classificar os signos.</p></div>}
        <div className="radar-sign-list">
          {results.map((result, index) => (
            <article className={`radar-sign-card${result.score > 0 ? " radar-sign-card--active" : ""}`} key={result.sign}>
              <div className="radar-sign-card__rank">{index + 1}</div>
              <div className="radar-sign-card__main"><div className="radar-sign-card__heading"><strong>{result.sign}</strong><span>{result.score > 0 ? `${result.score} pontos` : "Sem pontuação"}</span></div>{result.reasons.length > 0 ? <ul>{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>Nenhuma posição disponível neste signo.</p>}</div>
              {result.score > 0 && <div className="radar-score-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, result.score * 4)}%` }} /></div>}
            </article>
          ))}
        </div>
      </section>
      <p className="reading-disclaimer">O Radar organiza sinais do seu mapa para facilitar sua escolha de leitura. Ele não substitui a interpretação completa do mapa natal.</p>
    </>
  );
}
