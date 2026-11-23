import { ChevronLeft, CircleDot, Radar as RadarIcon } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { calculateAstrologicalRadar } from "../lib/astrological-radar";
import type { NatalChart } from "../lib/types";

type RadarPageProps = {
  natal: NatalChart | null;
  onBack: () => void;
};

export function RadarPage({ natal, onBack }: RadarPageProps) {
  const results = calculateAstrologicalRadar(natal);

  return (
    <>
      <button className="reading-back" onClick={onBack}><ChevronLeft size={17} aria-hidden="true" /> Voltar para meu mapa</button>
      <section className="page-intro reading-experience-intro">
        <span className="eyebrow"><RadarIcon size={14} aria-hidden="true" /> RADAR ASTROLÓGICO</span>
        <h1>Onde seu céu merece atenção.</h1>
        <p>O Radar identifica os signos que apresentam maior concentração de posições no seu mapa natal e indica quais deles merecem sua atenção nas previsões.</p>
      </section>

      <section className="section-block radar-results" aria-label="Signos com maior concentração de posições">
        <SectionHeading eyebrow="DESTAQUES DO MAPA" title="Acompanhe primeiro os maiores agrupamentos" />
        {results.length === 0 ? (
          <div className="radar-empty"><CircleDot size={18} aria-hidden="true" /><p>Seu mapa não apresenta concentração suficiente para gerar destaques no Radar.</p></div>
        ) : (
          <div className="radar-sign-list">
            {results.map((result, index) => (
              <article className="radar-sign-card radar-sign-card--active" key={result.sign}>
                <div className="radar-sign-card__rank">{String(index + 1).padStart(2, "0")}</div>
                <div className="radar-sign-card__main">
                  <div className="radar-sign-card__heading"><strong>{result.sign}</strong></div>
                  <p className="radar-sign-card__positions">{result.positions.join(" · ")}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="radar-guidance-card" aria-label="Como usar o Radar">
        <SectionHeading eyebrow="COMO USAR" title="Uma orientação para acompanhar o céu" />
        <p>Comece acompanhando as previsões dos signos que aparecem nas primeiras posições do ranking e, em seguida, explore os demais destaques. Esta é uma orientação personalizada de acompanhamento, não uma regra absoluta nem uma afirmação de que os outros signos não tenham importância.</p>
      </section>
    </>
  );
}
