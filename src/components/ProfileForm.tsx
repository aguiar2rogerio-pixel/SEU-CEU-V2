import { useState, useEffect } from "react";
import { BRAZIL_STATES, getCitiesByState, type CityRecord } from "../lib/data/brazil-cities";
import type { BirthProfile } from "../lib/types";

type Props = {
  initialProfile?: BirthProfile | null;
  onSave: (profile: BirthProfile) => void;
};

export function ProfileForm({ initialProfile, onSave }: Props) {
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [birthDate, setBirthDate] = useState(initialProfile?.birthDate ?? "");
  
  const [initialH, initialM] = (initialProfile?.birthTime ?? "12:00").split(":");
  const [birthHour, setBirthHour] = useState(initialH || "12");
  const [birthMinute, setBirthMinute] = useState(initialM || "00");

  const [birthTimeAccuracy, setBirthTimeAccuracy] = useState<BirthProfile["birthTimeAccuracy"]>(
    initialProfile?.birthTimeAccuracy ?? "exact"
  );
  
  const [stateUf, setStateUf] = useState(initialProfile?.birthState ?? "SP");
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [loadingCities, setLoadingCities] = useState(false);
  const birthTimeGuidance = birthTimeAccuracy === "exact"
    ? "O horário exato ajuda a calcular a Lua e o Ascendente com mais segurança."
    : birthTimeAccuracy === "approximate"
      ? "Com horário aproximado, posições sensíveis à hora podem variar; a leitura será apresentada como estimativa."
      : "Não sabe o horário? Tudo bem: você pode continuar. O app deixa Lua e Ascendente sem confirmação quando não puder calculá-los com segurança.";

  useEffect(() => {
    let isMounted = true;
    setLoadingCities(true);
    getCitiesByState(stateUf).then((fetchedCities) => {
      if (isMounted) {
        setCities(fetchedCities);
        setLoadingCities(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [stateUf]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const foundCity = cities.find((c) => c.id === selectedCityId);
    if (!foundCity) {
      alert("Por favor, selecione uma cidade válida da lista.");
      return;
    }

    const placeName = `${foundCity.name} - ${foundCity.state}`;
    const formattedTime = `${birthHour}:${birthMinute}`;

    const updatedProfile: BirthProfile = {
      schemaVersion: 1,
      name,
      birthDate,
      birthTime: birthTimeAccuracy === "unknown" ? null : formattedTime,
      birthTimeAccuracy,
      birthPlace: placeName ? String(placeName) : null,
      birthState: foundCity.state,
      birthCity: foundCity.name,
      birthLatitude: foundCity.latitude,
      birthLongitude: foundCity.longitude,
      birthTimezone: foundCity.timezone, // CORRIGIDO: Usa o fuso dinâmico correto da cidade
      timezoneConfirmed: true,
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedProfile);
  }

  return (
    <form onSubmit={handleSubmit} className="profile-form" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="form-intro">
        <span className="eyebrow">LEITURA GRATUITA NA FASE DE TESTE</span>
        <h2>{initialProfile ? "Revise seus dados" : "Calcule seus três pilares"}</h2>
        <p>{initialProfile ? "Ao salvar, o mapa será recalculado neste aparelho." : "Preencha o que souber. O aplicativo informa com clareza quando algum dado não puder ser confirmado."}</p>
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 500 }}>Como podemos chamar você?</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          style={{ width: "100%", padding: "0.85rem", borderRadius: "10px", background: "#161622", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1rem" }}
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 500 }}>Data de Nascimento</label>
        <input
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          style={{ width: "100%", padding: "0.85rem", borderRadius: "10px", background: "#161622", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1rem" }}
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 500 }}>Precisão do horário de nascimento</label>
        <p className="birth-time-help">O horário é importante para calcular a Lua e o Ascendente. Escolha a opção mais fiel ao que você sabe.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          {(["exact", "approximate", "unknown"] as const).map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => setBirthTimeAccuracy(acc)}
              style={{
                padding: "0.6rem",
                borderRadius: "8px",
                border: birthTimeAccuracy === acc ? "1px solid #f0c674" : "1px solid rgba(255,255,255,0.1)",
                background: birthTimeAccuracy === acc ? "rgba(240, 198, 116, 0.15)" : "#161622",
                color: birthTimeAccuracy === acc ? "#f0c674" : "#a0a0b0",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              {acc === "exact" ? "Exato" : acc === "approximate" ? "Aproximado" : "Não sei"}
            </button>
          ))}
        </div>
        <p className={`birth-time-guidance birth-time-guidance--${birthTimeAccuracy}`} role="status">{birthTimeGuidance}</p>
      </div>

      {birthTimeAccuracy !== "unknown" && (
        <div>
          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 500 }}>Horário de Nascimento</label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <select
              value={birthHour}
              onChange={(e) => setBirthHour(e.target.value)}
              style={{ flex: 1, padding: "0.85rem", borderRadius: "10px", background: "#161622", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1rem" }}
            >
              {Array.from({ length: 24 }, (_, i) => {
                const h = String(i).padStart(2, "0");
                return (
                  <option key={h} value={h}>
                    {h} h
                  </option>
                );
              })}
            </select>

            <span style={{ color: "#f0c674", fontWeight: "bold", fontSize: "1.2rem" }}>:</span>

            <select
              value={birthMinute}
              onChange={(e) => setBirthMinute(e.target.value)}
              style={{ flex: 1, padding: "0.85rem", borderRadius: "10px", background: "#161622", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1rem" }}
            >
              {Array.from({ length: 60 }, (_, i) => {
                const m = String(i).padStart(2, "0");
                return (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
        <label style={{ display: "block", marginBottom: "0.6rem", fontSize: "0.9rem", fontWeight: 600, color: "#f0c674" }}>
          📍 Local de Nascimento (IBGE Oficial)
        </label>
        <p className="birth-location-help">O município e o horário ajudam o cálculo do Ascendente. A lista de municípios é consultada pelo estado selecionado.</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.8rem", opacity: 0.8 }}>Estado</label>
            <select
              value={stateUf}
              onChange={(e) => { setStateUf(e.target.value); setSelectedCityId(""); }}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", background: "#161622", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
            >
              {BRAZIL_STATES.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.8rem", opacity: 0.8 }}>
              {loadingCities ? "Carregando..." : "Município"}
            </label>
            <select
              required
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              disabled={loadingCities}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", background: "#161622", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
            >
              <option value="">{loadingCities ? "Buscando cidades..." : "Selecione a cidade..."}</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        style={{
          marginTop: "0.5rem", padding: "0.95rem", background: "linear-gradient(135deg, #f0c674 0%, #d0a654 100%)", color: "#161622",
          border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "1.05rem",
          boxShadow: "0 4px 14px rgba(240, 198, 116, 0.25)"
        }}
      >
        Calcular meu céu
      </button>
    </form>
  );
}
