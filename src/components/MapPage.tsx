import { useMemo } from "react";
import { Check, Copy, FileText, Moon, Orbit, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { PLANETS, planetName } from "../lib/ephemeris";
import { formatDegrees } from "../lib/formatters";
import { calculateProfilePlacidus } from "../lib/houses/profile-placidus";
import type { BirthProfile, WeeklyBundle } from "../lib/types";

type MapPageProps = {
  profile: BirthProfile;
  bundle: WeeklyBundle | null;
  birthTimeLabel: string;
  aiReadingText: string;
  inputAiText: string;
  isEditingAi: boolean;
  copiedPromptType: string | null;
  onCopyNatalPrompt: () => void;
  onEditAi: () => void;
  onClearAiText: () => void;
  onInputAiTextChange: (value: string) => void;
  onSaveAiText: () => void;
  onCancelAiEdit: () => void;
};

export function MapPage({
  profile,
  bundle,
  birthTimeLabel,
  aiReadingText,
  inputAiText,
  isEditingAi,
  copiedPromptType,
  onCopyNatalPrompt,
  onEditAi,
  onClearAiText,
  onInputAiTextChange,
  onSaveAiText,
  onCancelAiEdit,
}: MapPageProps) {
  const placidus = useMemo(
    () => calculateProfilePlacidus(profile, bundle?.natal ?? null),
    [profile, bundle?.natal],
  );

  return (
    <>
      <section className="page-intro">
        <span className="eyebrow">SEU MAPA NATAL</span>
        <h1>O seu ponto de partida.</h1>
        <p>Posições calculadas localmente a partir dos dados que você informou.</p>
      </section>
      <div className="map-meta-card"><div><span>HORÁRIO</span><strong>{birthTimeLabel}</strong></div><div><span>LOCAL</span><strong>{profile.birthPlace || "Não informado"}</strong></div><div><span>FUSO</span><strong>{profile.birthTimezone}</strong></div></div>
      {profile.birthTimeAccuracy === "unknown" && <div className="inline-notice">Sem horário de nascimento, a Lua natal, o Ascendente e as casas astrológicas não são exibidos.</div>}

      {bundle?.natal.ascendant && (
        <div className="planet-list" style={{ marginBottom: "1rem" }}>
          <article className="planet-row">
            <div className="planet-symbol"><Orbit size={18} /></div>
            <div className="planet-row__name"><strong>Ascendente</strong><span>Horizonte Leste · {formatDegrees(bundle.natal.ascendant.longitude)}</span></div>
            <div className="planet-row__sign"><strong>{bundle.natal.ascendant.sign}</strong><span>{formatDegrees(bundle.natal.ascendant.degree)}</span></div>
          </article>
        </div>
      )}

      <div className="planet-list">
        {PLANETS.map((planet) => {
          const position = bundle?.natal[planet.id] ?? null;
          return (
            <article className={`planet-row ${!position ? "planet-row--unknown" : ""}`} key={planet.id}>
              <div className="planet-symbol">{planet.id === "sun" ? <Sun size={19} /> : planet.id === "moon" ? <Moon size={19} /> : <Orbit size={18} />}</div>
              <div className="planet-row__name"><strong>{planetName(planet.id)}</strong><span>{position ? `Longitude tropical · ${formatDegrees(position.longitude)}` : "Horário necessário para estimar"}</span></div>
              <div className="planet-row__sign">{position ? <><strong>{position.sign}</strong><span>{formatDegrees(position.degree)}</span></> : <span>Não informado</span>}</div>
            </article>
          );
        })}
      </div>
      <div className="explain-card"><ShieldCheck size={17} /><p>Os graus dos planetas vêm do Astronomy Engine, executado no aparelho. A lista mostra posições geocêntricas tropicais; o cálculo original do Ascendente permanece preservado.</p></div>

      <section className="section-block house-section" aria-label="Casas astrológicas Placidus">
        <SectionHeading eyebrow="SISTEMA PLACIDUS" title="As 12 casas" />
        {placidus.status === "unavailable" ? (
          <div className="house-unavailable" role="status">
            <ShieldCheck size={18} aria-hidden="true" />
            <div><strong>Casas não disponíveis</strong><p>{placidus.message}</p></div>
          </div>
        ) : (
          <>
            {placidus.status === "estimated" && placidus.message && (
              <div className="inline-notice inline-notice--warm house-estimate" role="note">{placidus.message} As cúspides e as casas dos planetas podem variar se o horário real for diferente.</div>
            )}
            <div className="house-grid" aria-label="Cúspides e planetas por casa">
              {placidus.cusps.map((cusp) => {
                const occupants = PLANETS.filter((planet) => placidus.planetHouses[planet.id] === cusp.house);
                const angleLabel = cusp.house === 1
                  ? "Ascendente"
                  : cusp.house === 4
                    ? "Fundo do Céu · IC"
                    : cusp.house === 7
                      ? "Descendente"
                      : cusp.house === 10
                        ? "Meio do Céu · MC"
                        : null;

                return (
                  <article className="house-card" key={cusp.house} aria-label={`Casa ${cusp.house}`}>
                    <div className="house-card__topline">
                      <span>CASA {cusp.house}</span>
                      {angleLabel && <span className="house-card__angle">{angleLabel}</span>}
                    </div>
                    <div className="house-card__cusp">
                      <strong>{cusp.sign}</strong>
                      <span>{formatDegrees(cusp.degree)}</span>
                    </div>
                    <div className="house-card__occupants">
                      <span className="house-card__caption">PLANETAS NESTA CASA</span>
                      {bundle ? (
                        occupants.length > 0 ? (
                          <div className="house-planet-list">
                            {occupants.map((planet) => {
                              const position = bundle.natal[planet.id];
                              return (
                                <span className="house-planet-chip" key={planet.id}>
                                  <strong>{planetName(planet.id)}</strong>
                                  {position && <small>{position.sign} · {formatDegrees(position.degree)}</small>}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="house-card__empty">Nenhum planeta nesta casa</p>
                        )
                      ) : (
                        <p className="house-card__empty">Posições planetárias indisponíveis</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="house-method-note">A cúspide indica o início de cada casa. A posição dos planetas usa as longitudes tropicais já calculadas pelo aplicativo, sem recalcular os planetas.</p>
          </>
        )}
      </section>

      <section className="section-block" style={{ marginTop: "2rem", background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "16px", border: "1px solid rgba(240, 198, 116, 0.2)" }}>
        <SectionHeading eyebrow="ANÁLISE DE IA" title="Análise Aprofundada com IA" />
        <p style={{ fontSize: "0.9rem", color: "#a0a0b0", marginBottom: "1rem" }}>
          Copie o comando estruturado abaixo com seus dados exatos e use no ChatGPT, Gemini ou Claude para gerar uma leitura completa.
        </p>

        <button
          className="button button--secondary"
          style={{ width: "100%", justifyContent: "center", marginBottom: "1.5rem", borderColor: "#f0c674", color: "#f0c674" }}
          onClick={onCopyNatalPrompt}
        >
          {copiedPromptType === "natal" ? <Check size={18} /> : <Copy size={18} />}
          {copiedPromptType === "natal" ? "Prompt do Mapa Copiado!" : "Copiar Prompt do Mapa para IA"}
        </button>

        {aiReadingText && !isEditingAi ? (
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#f0c674", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <FileText size={15} /> Sua Análise Salva
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={onEditAi} style={{ background: "transparent", border: "none", color: "#a0a0b0", cursor: "pointer", fontSize: "0.85rem" }}>
                  Editar
                </button>
                <button onClick={onClearAiText} style={{ background: "transparent", border: "none", color: "#ebcb8b", cursor: "pointer" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div style={{ fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#e5e9f0" }}>
              {aiReadingText}
            </div>
          </div>
        ) : (
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "#a0a0b0", marginBottom: "0.5rem" }}>
              Cole aqui a resposta recebida da sua IA para guardar no aparelho:
            </label>
            <textarea
              rows={5}
              style={{ width: "100%", background: "#11111a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "0.75rem", color: "#fff", fontSize: "0.9rem", resize: "vertical", marginBottom: "0.75rem" }}
              placeholder="Cole a resposta do ChatGPT / Gemini aqui..."
              value={inputAiText}
              onChange={(e) => onInputAiTextChange(e.target.value)}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="button button--primary" onClick={onSaveAiText} style={{ flex: 1, justifyContent: "center" }}>
                Salvar Leitura no Aparelho
              </button>
              {isEditingAi && (
                <button className="button button--secondary" onClick={onCancelAiEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
