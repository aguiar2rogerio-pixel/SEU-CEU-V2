import { useState, useEffect } from "react";
import {
  BRAZIL_STATES,
  getCitiesByState,
  resolveCityCoordinates,
  type CityRecord,
} from "../lib/data/brazil-cities";
import type { BirthProfile } from "../lib/types";

type Props = {
  initialProfile?: BirthProfile | null;
  onSave: (profile: BirthProfile) => void;
};

export function ProfileForm({ initialProfile, onSave }: Props) {
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [birthDate, setBirthDate] = useState(initialProfile?.birthDate ?? "");
  
  const [initialH, initialM] = (initialProfile?.birthTime ?? "").split(":");
  const [birthHour, setBirthHour] = useState(initialH ?? "");
  const [birthMinute, setBirthMinute] = useState(initialM ?? "");

  const [birthTimeAccuracy, setBirthTimeAccuracy] = useState<BirthProfile["birthTimeAccuracy"] | "">(
    initialProfile?.birthTimeAccuracy ?? ""
  );
  const [birthTimeError, setBirthTimeError] = useState("");
  
  const [stateUf, setStateUf] = useState(initialProfile?.birthState ?? "SP");
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState("");

  const birthTimeGuidance = birthTimeAccuracy === "exact"
    ? "O horário exato ajuda a calcular a Lua e o Ascendente com mais segurança."
    : birthTimeAccuracy === "approximate"
      ? "Com horário aproximado, posições sensíveis à hora podem variar; a leitura será apresentada como estimativa."
      : birthTimeAccuracy === "unknown"
        ? "Não sabe o horário? Tudo bem: você pode continuar. O app deixa Lua e Ascendente sem confirmação quando não puder calculá-los com segurança."
        : "Escolha a opção mais fiel ao que você sabe. Assim evitamos usar um horário presumido.";

  useEffect(() => {
    let isMounted = true;
    setLoadingCities(true);
    setLocationError("");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocationError("");

    if (!birthTimeAccuracy) {
      setBirthTimeError("Escolha se o horário é exato, aproximado ou se você não sabe.");
      return;
    }
    setBirthTimeError("");

    if (birthTimeAccuracy !== "unknown" && (!birthHour || !birthMinute)) {
      setBirthTimeError("Informe a hora e os minutos, ou escolha “Não sei” se não souber o horário.");
      return;
    }
    
    const foundCity = cities.find((c) => c.id === selectedCityId);
    if (!foundCity) {
      setLocationError("Por favor, selecione uma cidade válida da lista.");
      return;
    }

    try {
      setSubmitting(true);
      const resolvedCity = await resolveCityCoordinates(foundCity);

      const placeName = `${resolvedCity.name} - ${resolvedCity.state}`;
      const formattedTime = `${birthHour}:${birthMinute}`;

      const updatedProfile: BirthProfile = {
        schemaVersion: 1,
        name,
        birthDate,
        birthTime: birthTimeAccuracy === "unknown" ? null : formattedTime,
        birthTimeAccuracy,
        birthPlace: placeName ? String(placeName) : null,
        birthState: resolvedCity.state,
        birthCity: resolvedCity.name,
        birthLatitude: resolvedCity.latitude,
        birthLongitude: resolvedCity.longitude,
        birthTimezone: resolvedCity.timezone,
        timezoneConfirmed: true,
        updatedAt: new Date().toISOString(),
      };

      onSave(updatedProfile);
    } catch (error) {
      setLocationError(
        error instanceof Error
          ? error.message
          : "Não foi possível obter as coordenadas deste município. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
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
        <p className="birth-time-help">O horário ajuda a calcular a Lua e o Ascendente. Escolha a opção mais fiel ao que você sabe.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          {(["exact", "approximate", "unknown"] as const).map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => { setBirthTimeAccuracy(acc); setBirthTimeError(""); }}
              aria-pressed={birthTimeAccuracy === acc}
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
        {birthTimeError && <p className="form-error" role="alert">{birthTimeError}</p>}
        <p className={`birth-time-guidance birth-time-guidance--${birthTimeAccuracy}`} role="status">{birthTimeGuidance}</p>
      </div>

      {birthTimeAccuracy !== "unknown" && (
        <div>
          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 500 }}>Horário de Nascimento</label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <select
              required
              value={birthHour}
              onChange={(e) => setBirthHour(e.target.value)}
              style={{ flex: 1, padding: "0.85rem", borderRadius: "10px", background: "#161622", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1rem" }}
            >
              <option value="" disabled>Hora</option>
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
              required
              value={birthMinute}
              onChange={(e) => setBirthMinute(e.target.value)}
              style={{ flex: 1, padding: "0.85rem", borderRadius: "10px", background: "#161622", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "1rem" }}
            >
              <option value="" disabled>Minutos</option>
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
              onChange={(e) => { setStateUf(e.target.value); setSelectedCityId(""); setLocationError(""); }}
              disabled={submitting}
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
              onChange={(e) => { setSelectedCityId(e.target.value); setLocationError(""); }}
              disabled={loadingCities || submitting}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", background: "#161622", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
            >
              <option value="" disabled>{loadingCities ? "Buscando cidades..." : "Selecione a cidade..."}</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>
        </div>

        {locationError && (
          <p className="form-error" role="alert" style={{ marginTop: "0.6rem", color: "#ff6b6b", fontSize: "0.85rem" }}>
            {locationError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || loadingCities}
        style={{
          marginTop: "0.5rem", padding: "0.95rem", background: "linear-gradient(135deg, #f0c674 0%, #d0a654 100%)", color: "#161622",
          border: "none", borderRadius: "10px", fontWeight: 700, cursor: submitting || loadingCities ? "not-allowed" : "pointer", fontSize: "1.05rem",
          boxShadow: "0 4px 14px rgba(240, 198, 116, 0.25)", opacity: submitting || loadingCities ? 0.7 : 1
        }}
      >
        {submitting ? "Consultando coordenadas..." : "Calcular meu céu"}
      </button>
    </form>
  );
}
