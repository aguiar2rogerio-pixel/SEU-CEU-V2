import { Check, Copy, FileText, Moon, Orbit, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { PLANETS, planetName } from "../lib/ephemeris";
import { formatDegrees } from "../lib/formatters";
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
  return (
    <>
      <section className="page-intro">
        <span className="eyebrow">SEU MAPA NATAL</span>
        <h1>O seu ponto de partida.</h1>
        <p>Posições calculadas localmente a partir dos dados que você informou.</p>
      </section>
      <div className="map-meta-card"><div><span>HORÁRIO</span><strong>{birthTimeLabel}</strong></div><div><span>LOCAL</span><strong>{profile.birthPlace || "Não informado"}</strong></div><div><span>FUSO</span><strong>{profile.birthTimezone}</strong></div></div>
      {profile.birthTimeAccuracy === "unknown" && <div className="inline-notice">Sem horário de nascimento, a Lua natal e o Ascendente não são exibidos.</div>}

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
      <div className="explain-card"><ShieldCheck size={17} /><p>Os graus vêm do Astronomy Engine, executado no aparelho. A lista mostra posições geocêntricas tropicais e o Ascendente local.</p></div>

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
