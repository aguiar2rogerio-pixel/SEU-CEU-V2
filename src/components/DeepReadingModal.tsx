import { X, Sparkles, Compass, Moon, Sun } from "lucide-react";
import type { BirthProfile, NatalChart } from "../lib/types";
import { getTextoSol, getTextoLua, getTextoAscendente, ASCENDENTE_GENERICO } from "../lib/signos-textos";

type Props = {
  profile: BirthProfile;
  natal?: NatalChart | null;
  onClose: () => void;
};

export function DeepReadingModal({ profile, natal, onClose }: Props) {
  const sunSign = natal?.sun?.sign;
  const moonSign = natal?.moon?.sign;
  const ascSign = natal?.ascendant?.sign;

  const solInfo = sunSign ? getTextoSol(sunSign) : null;
  const luaInfo = moonSign ? getTextoLua(moonSign) : null;
  const ascInfo = ascSign ? getTextoAscendente(ascSign) : null;

  // Textos de fallback para garantir que o bloco nunca suma
  const solTextoFinal = solInfo?.completo || (sunSign ? `O Sol em ${sunSign} representa a sua essência vital, a forma como expressa a sua individualidade e onde busca propósito e realização pessoal.` : null);
  const luaTextoFinal = luaInfo?.completo || (moonSign ? `A Lua em ${moonSign} retrata o seu mundo emocional, as suas reações instintivas e a forma como procura segurança interna.` : null);
  const ascTextoFinal = ascInfo?.completo || (ascSign ? `O Ascendente em ${ascSign} indica a sua porta de entrada no mundo, a primeira impressão que transmite e a forma como aborda novos começos.` : null);

  return (
    <div className="modal-backdrop" style={{
      position: "fixed", inset: 0, background: "rgba(10, 10, 15, 0.85)", backdropFilter: "blur(8px)",
      zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem"
    }}>
      <div className="modal-content" style={{
        background: "#161622", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px",
        width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", padding: "2rem", color: "#f3f3f7"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={20} color="#f0c674" /> Leitura Aprofundada do Mapa
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#a0a0b0", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        <p style={{ opacity: 0.8, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          Olá, {profile.name}. Aqui estão as chaves fundamentais da sua expressão pessoal: sua essência, seu mundo emocional e sua apresentação ao mundo.
        </p>

        {/* Bloco Sol */}
        {sunSign && (
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "12px", marginBottom: "1rem", borderLeft: "4px solid #f0c674" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "0.5rem", color: "#f0c674" }}>
              <Sun size={18} /> Essência — Sol em {sunSign}
            </h3>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, opacity: 0.9 }}>{solTextoFinal}</p>
          </div>
        )}

        {/* Bloco Lua */}
        {moonSign && (
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "12px", marginBottom: "1rem", borderLeft: "4px solid #81a1c1" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "0.5rem", color: "#81a1c1" }}>
              <Moon size={18} /> Mundo Emocional — Lua em {moonSign}
            </h3>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, opacity: 0.9 }}>{luaTextoFinal}</p>
          </div>
        )}

        {/* Bloco Ascendente */}
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "12px", marginBottom: "1.5rem", borderLeft: "4px solid #b48ead" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "0.5rem", color: "#b48ead" }}>
            <Compass size={18} /> Apresentação ao Mundo — {ascSign ? `Ascendente em ${ascSign}` : "Ascendente"}
          </h3>
          {ascSign ? (
            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, opacity: 0.9 }}>{ascTextoFinal}</p>
          ) : (
            <div>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6, opacity: 0.9, marginBottom: "0.75rem" }}>
                {ASCENDENTE_GENERICO.o_que_e} {ASCENDENTE_GENERICO.motivo}
              </p>
              <div style={{ background: "rgba(180, 141, 173, 0.1)", padding: "0.75rem", borderRadius: "8px", fontSize: "0.9rem", color: "#ebcb8b" }}>
                💡 {ASCENDENTE_GENERICO.alternativa}
              </div>
            </div>
          )}
        </div>

        <button onClick={onClose} style={{
          width: "100%", padding: "0.75rem", background: "#f0c674", color: "#161622", border: "none",
          borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "1rem"
        }}>
          Fechar Leitura
        </button>
      </div>
    </div>
  );
}
